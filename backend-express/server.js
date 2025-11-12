const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3001;

// API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5000', 'http://localhost:3000'];

// Helper function to check if origin matches localhost or local network IP
const isLocalOrigin = (origin) => {
  if (!origin) return false;
  
  // Allow localhost with any port
  if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
    return true;
  }
  
  // Allow 127.0.0.1 with any port
  if (origin.startsWith('http://127.0.0.1:') || origin.startsWith('https://127.0.0.1:')) {
    return true;
  }
  
  // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) in development
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    const localNetworkPattern = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):\d+$/;
    if (localNetworkPattern.test(origin)) {
      return true;
    }
  }
  
  return false;
};

// Middleware
// Enable response compression
app.use(compression());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (isLocalOrigin(origin)) {
      // Allow local origins (localhost, local IPs) in development
      callback(null, true);
    } else {
      // Log the rejected origin for debugging
      console.warn(`CORS: Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Note: CORS errors are handled by cors middleware itself
// This will be caught by the errorHandler middleware at the end

// Request body size limit (10MB for JSON)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Magic number signatures for image files
const MAGIC_NUMBERS = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/gif': [0x47, 0x49, 0x46, 0x38], // GIF87a or GIF89a
  'image/webp': [0x52, 0x49, 0x46, 0x46] // RIFF header
};

/**
 * Sanitize filename to prevent path traversal attacks
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
  // Remove path components and keep only the basename
  const basename = path.basename(filename);
  // Remove any non-alphanumeric characters except dots, hyphens, and underscores
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Limit filename length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const ext = path.extname(sanitized);
    const nameWithoutExt = sanitized.slice(0, maxLength - ext.length);
    return nameWithoutExt + ext;
  }
  return sanitized;
}

/**
 * Verify file content matches declared MIME type using magic numbers
 * @param {Buffer} buffer - File content buffer
 * @param {string} mimeType - Declared MIME type
 * @returns {boolean} - True if file content matches MIME type
 */
function verifyFileContent(buffer, mimeType) {
  if (buffer.length < 4) return false;
  
  const signature = MAGIC_NUMBERS[mimeType];
  if (!signature) return false;
  
  // Check if buffer starts with the expected magic number
  for (let i = 0; i < signature.length && i < buffer.length; i++) {
    if (buffer[i] !== signature[i]) {
      // Special case for GIF (can be GIF87a or GIF89a)
      if (mimeType === 'image/gif' && i === 3) {
        if (buffer[3] !== 0x37 && buffer[3] !== 0x39) {
          return false;
        }
        continue;
      }
      // Special case for WebP (RIFF header, then check for WEBP)
      if (mimeType === 'image/webp' && i === 0) {
        // Check for RIFF header
        if (buffer.length < 12) return false;
        const webpCheck = buffer.toString('ascii', 8, 12);
        if (webpCheck !== 'WEBP') return false;
        return true;
      }
      return false;
    }
  }
  return true;
}

// Configure multer for file uploads with security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = sanitizeFilename(file.originalname);
    cb(null, `${timestamp}_${sanitized}`);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Invalid file extension. Only .jpg, .jpeg, .png, .gif, and .webp are allowed.'));
    }
    
    cb(null, true);
  }
});

// Initialize SQLite database with retry mechanism
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'type_editor.db');
let db = null;
let dbInitialized = false;
let isConnecting = false; // 防止重复连接
let connectionRetryTimeout = null; // 重连定时器

// Database connection retry configuration
const DB_RETRY_DELAY = 1000; // 1 second
const DB_MAX_RETRIES = 5;

// Health check interval (check every 30 seconds)
const HEALTH_CHECK_INTERVAL = 30000;
let healthCheckTimer = null;
let consecutiveHealthCheckFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

// Connection keep-alive interval (every 60 seconds)
const KEEP_ALIVE_INTERVAL = 60000;
let keepAliveTimer = null;

/**
 * Initialize database connection with retry mechanism
 */
function initDatabaseConnection(retries = 0) {
  return new Promise((resolve, reject) => {
    // 防止重复连接
    if (isConnecting) {
      console.log('Database connection already in progress, waiting...');
      // 等待现有连接完成
      const checkInterval = setInterval(() => {
        if (!isConnecting) {
          clearInterval(checkInterval);
          if (dbInitialized && db) {
            resolve();
          } else {
            reject(new Error('Previous connection attempt failed'));
          }
        }
      }, 100);
      return;
    }

    // 如果已经有连接，先关闭
    if (db) {
      try {
        db.close((err) => {
          if (err) console.warn('Error closing old database connection:', err.message);
        });
      } catch (e) {
        // 忽略关闭错误
      }
      db = null;
    }

    isConnecting = true;
    dbInitialized = false;

    try {
      const newDb = new sqlite3.Database(dbPath, (err) => {
        isConnecting = false;
        
        if (err) {
          console.error(`Database connection error (attempt ${retries + 1}/${DB_MAX_RETRIES}):`, err.message);
          
          if (retries < DB_MAX_RETRIES - 1) {
            const delay = DB_RETRY_DELAY * Math.pow(2, retries); // 指数退避
            setTimeout(() => {
              initDatabaseConnection(retries + 1).then(resolve).catch(reject);
            }, delay);
            return;
          }
          
          if (process.env.NODE_ENV !== 'test') {
            console.error('Failed to connect to database after retries');
            // 不要立即退出，而是安排重连
            scheduleReconnect();
            reject(err);
          } else {
            reject(err);
          }
          return;
        }
        
        // Enable WAL mode for better concurrency
        newDb.run('PRAGMA journal_mode = WAL;', (err) => {
          if (err) {
            console.warn('Warning: Could not enable WAL mode:', err.message);
          }
        });
        
        // Set busy timeout to handle locked database (增加到10秒)
        newDb.configure('busyTimeout', 10000);
        
        // Enable foreign keys
        newDb.run('PRAGMA foreign_keys = ON;', (err) => {
          if (err) {
            console.warn('Warning: Could not enable foreign keys:', err.message);
          }
        });

        // 设置同步模式为NORMAL以提高性能
        newDb.run('PRAGMA synchronous = NORMAL;', (err) => {
          if (err) {
            console.warn('Warning: Could not set synchronous mode:', err.message);
          }
        });

        // 设置缓存大小
        newDb.run('PRAGMA cache_size = -64000;', (err) => {
          if (err) {
            console.warn('Warning: Could not set cache size:', err.message);
          }
        });
        
        db = newDb;
        dbInitialized = true;
        
        if (process.env.NODE_ENV !== 'test') {
          console.log(`Database connected: ${dbPath}`);
          // Start periodic health checks
          startHealthCheckMonitoring();
          // Start keep-alive
          startKeepAlive();
        }
        
        initDatabase();
        resolve();
      });
      
      // Handle database errors
      newDb.on('error', (err) => {
        console.error('Database error:', err.message);
        if (err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED') {
          console.warn('Database is locked, will retry operations');
        } else if (err.code === 'SQLITE_CORRUPT') {
          console.error('Database corruption detected!');
          dbInitialized = false;
          scheduleReconnect();
        } else {
          // 对于其他错误，标记为未初始化但不立即重连（避免频繁重连）
          dbInitialized = false;
          console.warn('Database connection lost, will reconnect on next query');
        }
      });
      
    } catch (error) {
      isConnecting = false;
      reject(error);
    }
  });
}

/**
 * 安排重连（防止频繁重连）
 */
function scheduleReconnect() {
  if (connectionRetryTimeout) {
    return; // 已经有重连计划
  }
  
  connectionRetryTimeout = setTimeout(() => {
    connectionRetryTimeout = null;
    if (!dbInitialized && !isConnecting) {
      console.log('Attempting to reconnect to database...');
      initDatabaseConnection(0).catch((err) => {
        console.error('Reconnection failed:', err.message);
      });
    }
  }, DB_RETRY_DELAY * 5); // 5秒后重连
}

/**
 * 启动连接保活机制
 */
function startKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
  }
  
  keepAliveTimer = setInterval(() => {
    if (db && dbInitialized) {
      db.get('SELECT 1', (err) => {
        if (err) {
          console.warn('Keep-alive check failed:', err.message);
          dbInitialized = false;
          scheduleReconnect();
        }
      });
    }
  }, KEEP_ALIVE_INTERVAL);
}

/**
 * Start periodic health check monitoring
 */
function startHealthCheckMonitoring() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }
  
  healthCheckTimer = setInterval(() => {
    if (!db || !dbInitialized) {
      consecutiveHealthCheckFailures++;
      console.warn(`Health check failed: Database not initialized (${consecutiveHealthCheckFailures}/${MAX_CONSECUTIVE_FAILURES})`);
      
      if (consecutiveHealthCheckFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error('Too many consecutive health check failures. Attempting to reconnect...');
        consecutiveHealthCheckFailures = 0;
        dbInitialized = false;
        // 使用scheduleReconnect而不是直接重连，避免频繁重连
        scheduleReconnect();
      }
      return;
    }
    
    // Quick health check with timeout
    const healthCheckTimeout = setTimeout(() => {
      consecutiveHealthCheckFailures++;
      console.warn(`Health check timeout (${consecutiveHealthCheckFailures}/${MAX_CONSECUTIVE_FAILURES})`);
      
      if (consecutiveHealthCheckFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error('Database health check timeout multiple times. Attempting to reconnect...');
        consecutiveHealthCheckFailures = 0;
        dbInitialized = false;
        scheduleReconnect();
      }
    }, 5000); // 5秒超时
    
    db.get('SELECT 1', (err) => {
      clearTimeout(healthCheckTimeout);
      
      if (err) {
        consecutiveHealthCheckFailures++;
        console.warn(`Health check failed: ${err.message} (${consecutiveHealthCheckFailures}/${MAX_CONSECUTIVE_FAILURES})`);
        
        if (consecutiveHealthCheckFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.error('Database health check failed multiple times. Attempting to reconnect...');
          consecutiveHealthCheckFailures = 0;
          dbInitialized = false;
          scheduleReconnect();
        }
      } else {
        consecutiveHealthCheckFailures = 0; // Reset on success
      }
    });
  }, HEALTH_CHECK_INTERVAL);
}

// Initialize database connection
initDatabaseConnection().catch((err) => {
  console.error('Failed to initialize database:', err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

/**
 * Execute database query with retry mechanism and connection recovery
 */
function dbQuery(method, query, params = [], retries = 3) {
  return new Promise((resolve, reject) => {
    if (!db || !dbInitialized) {
      // Try to reconnect if database is not initialized
      if (!isConnecting) {
        console.warn('Database not initialized, attempting to reconnect...');
        initDatabaseConnection(0)
          .then(() => {
            // Retry the query after reconnection
            dbQuery(method, query, params, retries).then(resolve).catch(reject);
          })
          .catch((err) => {
            reject(new Error('Database not available and reconnection failed: ' + err.message));
          });
      } else {
        // 如果正在连接，等待一下再重试
        setTimeout(() => {
          dbQuery(method, query, params, retries).then(resolve).catch(reject);
        }, 500);
      }
      return;
    }
    
    const execute = (attempt) => {
      // 再次检查连接状态
      if (!db || !dbInitialized) {
        if (attempt < retries && !isConnecting) {
          initDatabaseConnection(0)
            .then(() => {
              setTimeout(() => execute(attempt + 1), DB_RETRY_DELAY);
            })
            .catch(() => reject(new Error('Database connection lost')));
        } else {
          reject(new Error('Database connection not available'));
        }
        return;
      }

      try {
        // 设置查询超时（30秒）
        const queryTimeout = setTimeout(() => {
          reject(new Error('Database query timeout'));
        }, 30000);

        if (method === 'run') {
          // For 'run', we need to capture 'this' context to get lastID
          db.run(query, params, function(err) {
            clearTimeout(queryTimeout);
            
            if (err) {
              // Check if database connection is lost
              if (err.code === 'SQLITE_CORRUPT') {
                dbInitialized = false;
                console.warn('Database corruption detected, marking as disconnected');
                if (attempt < retries && !isConnecting) {
                  scheduleReconnect();
                  setTimeout(() => execute(attempt + 1), DB_RETRY_DELAY * (attempt + 1));
                } else {
                  reject(err);
                }
                return;
              }
              
              // Retry on busy/locked errors with exponential backoff
              if ((err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED') && attempt < retries) {
                const delay = DB_RETRY_DELAY * Math.pow(2, attempt);
                setTimeout(() => execute(attempt + 1), delay);
                return;
              }
              
              // 对于其他错误，检查是否是连接问题
              if (err.message?.includes('database is locked') || err.message?.includes('no such table')) {
                dbInitialized = false;
                if (attempt < retries && !isConnecting) {
                  scheduleReconnect();
                  setTimeout(() => execute(attempt + 1), DB_RETRY_DELAY * (attempt + 1));
                } else {
                  reject(err);
                }
                return;
              }
              
              reject(err);
              return;
            }
            // Return an object with lastID for compatibility
            resolve({ lastID: this.lastID, changes: this.changes });
          });
        } else {
          db[method](query, params, (err, result) => {
            clearTimeout(queryTimeout);
            
            if (err) {
              // Check if database connection is lost
              if (err.code === 'SQLITE_CORRUPT') {
                dbInitialized = false;
                console.warn('Database corruption detected, marking as disconnected');
                if (attempt < retries && !isConnecting) {
                  scheduleReconnect();
                  setTimeout(() => execute(attempt + 1), DB_RETRY_DELAY * (attempt + 1));
                } else {
                  reject(err);
                }
                return;
              }
              
              // Retry on busy/locked errors with exponential backoff
              if ((err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED') && attempt < retries) {
                const delay = DB_RETRY_DELAY * Math.pow(2, attempt);
                setTimeout(() => execute(attempt + 1), delay);
                return;
              }
              
              // 对于其他错误，检查是否是连接问题
              if (err.message?.includes('database is locked') || err.message?.includes('no such table')) {
                dbInitialized = false;
                if (attempt < retries && !isConnecting) {
                  scheduleReconnect();
                  setTimeout(() => execute(attempt + 1), DB_RETRY_DELAY * (attempt + 1));
                } else {
                  reject(err);
                }
                return;
              }
              
              reject(err);
              return;
            }
            resolve(result);
          });
        }
      } catch (error) {
        if (attempt < retries) {
          setTimeout(() => execute(attempt + 1), DB_RETRY_DELAY * (attempt + 1));
        } else {
          reject(error);
        }
      }
    };
    
    execute(0);
  });
}

// Wrapper functions for database operations
const dbHelpers = {
  all: (query, params) => dbQuery('all', query, params),
  get: (query, params) => dbQuery('get', query, params),
  run: (query, params) => dbQuery('run', query, params),
};

// Initialize database tables
function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      parent_id INTEGER,
      node_type TEXT NOT NULL,
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      indent_level INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE
    )
  `);

  // Add image_url column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE nodes ADD COLUMN image_url TEXT`, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id INTEGER NOT NULL UNIQUE,
      content_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    )
  `);
  
  // Create indexes for better query performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_document_id ON nodes(document_id)`, (err) => {
    if (err && process.env.NODE_ENV !== 'test') {
      console.error('Error creating index:', err);
    }
  });
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_order_index ON nodes(order_index)`, (err) => {
    if (err && process.env.NODE_ENV !== 'test') {
      console.error('Error creating index:', err);
    }
  });
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_content_node_id ON content(node_id)`, (err) => {
    if (err && process.env.NODE_ENV !== 'test') {
      console.error('Error creating index:', err);
    }
  });
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at)`, (err) => {
    if (err && process.env.NODE_ENV !== 'test') {
      console.error('Error creating index:', err);
    }
  });
}

// Input validation constants
const MAX_TITLE_LENGTH = 500;
const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB for JSON content
const MAX_URL_LENGTH = 2048;
const VALID_NODE_TYPES = ['section', 'reference', 'figure', 'equation'];

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} str - Input string
 * @returns {string} - Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .trim();
}

/**
 * Validate integer parameter
 * @param {any} value - Value to validate
 * @returns {number|null} - Parsed integer or null if invalid
 */
function validateInteger(value) {
  if (value === undefined || value === null) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Input validation middleware
 */
const validateInput = {
  documentTitle: (req, res, next) => {
    const { title } = req.body;
    
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required and must be a string' });
    }
    
    const sanitized = sanitizeString(title);
    if (sanitized.length === 0) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    
    if (sanitized.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `Title cannot exceed ${MAX_TITLE_LENGTH} characters` });
    }
    
    req.body.title = sanitized;
    next();
  },
  
  documentId: (req, res, next) => {
    const id = validateInteger(req.params.id);
    if (id === null || id <= 0) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    req.params.id = id;
    next();
  },
  
  node: (req, res, next) => {
    const { document_id, parent_id, node_type, title, order_index, indent_level, image_url } = req.body;
    
    // Validate document_id
    const docId = validateInteger(document_id);
    if (docId === null || docId <= 0) {
      return res.status(400).json({ error: 'Invalid document_id' });
    }
    
    // Validate parent_id (optional)
    if (parent_id !== undefined && parent_id !== null) {
      const parId = validateInteger(parent_id);
      if (parId === null || parId <= 0) {
        return res.status(400).json({ error: 'Invalid parent_id' });
      }
      req.body.parent_id = parId;
    }
    
    // Validate node_type
    if (!node_type || typeof node_type !== 'string' || !VALID_NODE_TYPES.includes(node_type)) {
      return res.status(400).json({ error: `node_type must be one of: ${VALID_NODE_TYPES.join(', ')}` });
    }
    
    // Validate title
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required and must be a string' });
    }
    const sanitizedTitle = sanitizeString(title);
    if (sanitizedTitle.length === 0 || sanitizedTitle.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `Title must be between 1 and ${MAX_TITLE_LENGTH} characters` });
    }
    
    // Validate order_index
    const ordIdx = validateInteger(order_index);
    if (ordIdx === null || ordIdx < 0) {
      return res.status(400).json({ error: 'order_index must be a non-negative integer' });
    }
    
    // Validate indent_level
    const indLevel = validateInteger(indent_level);
    if (indLevel === null || indLevel < 0) {
      return res.status(400).json({ error: 'indent_level must be a non-negative integer' });
    }
    
    // Validate image_url (optional)
    if (image_url !== undefined && image_url !== null) {
      if (typeof image_url !== 'string' || image_url.length > MAX_URL_LENGTH) {
        return res.status(400).json({ error: 'Invalid image_url' });
      }
    }
    
    req.body.document_id = docId;
    req.body.title = sanitizedTitle;
    req.body.order_index = ordIdx;
    req.body.indent_level = indLevel;
    next();
  },
  
  nodeId: (req, res, next) => {
    const id = validateInteger(req.params.id);
    if (id === null || id <= 0) {
      return res.status(400).json({ error: 'Invalid node ID' });
    }
    req.params.id = id;
    next();
  },
  
  nodeIdParam: (req, res, next) => {
    const id = validateInteger(req.params.node_id);
    if (id === null || id <= 0) {
      return res.status(400).json({ error: 'Invalid node_id' });
    }
    req.params.node_id = id;
    next();
  },
  
  docIdParam: (req, res, next) => {
    const id = validateInteger(req.params.doc_id);
    if (id === null || id <= 0) {
      return res.status(400).json({ error: 'Invalid doc_id' });
    }
    req.params.doc_id = id;
    next();
  },
  
  content: (req, res, next) => {
    const { content_json } = req.body;
    
    if (content_json === undefined || content_json === null) {
      return res.status(400).json({ error: 'content_json is required' });
    }
    
    // Accept both string and object, convert to string if needed
    let contentString;
    if (typeof content_json === 'string') {
      contentString = content_json;
      // Validate it's valid JSON
      try {
        JSON.parse(contentString);
      } catch (e) {
        return res.status(400).json({ error: 'content_json must be valid JSON string' });
      }
    } else if (typeof content_json === 'object') {
      // Convert object to JSON string
      try {
        contentString = JSON.stringify(content_json);
      } catch (e) {
        return res.status(400).json({ error: 'Failed to stringify content_json' });
      }
    } else {
      return res.status(400).json({ error: 'content_json must be a string or object' });
    }
    
    if (contentString.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({ error: `Content cannot exceed ${MAX_CONTENT_LENGTH} bytes` });
    }
    
    // Store the stringified version in req.body for database insertion
    req.body.content_json = contentString;
    
    next();
  }
};

// API key validation middleware (optional, enabled via environment variable)
const apiKeyMiddleware = (req, res, next) => {
  const apiKey = process.env.API_KEY;
  
  // If API_KEY is not set, skip validation (for development)
  if (!apiKey) {
    return next();
  }
  
  const providedKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!providedKey || providedKey !== apiKey) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log error details (but don't expose sensitive info to client)
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
  
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS' || err.message?.includes('CORS')) {
    return res.status(403).json({ 
      error: 'CORS policy violation',
      ...(isDevelopment && { details: `Origin not allowed: ${req.headers.origin || 'none'}` })
    });
  }
  
  // Handle specific error types
  if (err.status) {
    return res.status(err.status).json({
      error: err.message || 'An error occurred',
      ...(isDevelopment && { details: err.stack })
    });
  }
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  
  // Generic error response
  res.status(500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { details: err.stack })
  });
};

// Helper function to send error response with development details
const sendErrorResponse = (res, statusCode, message, err = null) => {
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const response = { error: message };
  
  if (isDevelopment && err) {
    response.details = err.message;
    if (err.stack) {
      response.stack = err.stack;
    }
  }
  
  return res.status(statusCode).json(response);
};

// Health check endpoint (before rate limiting)
app.get('/health', (req, res) => {
  if (!db || !dbInitialized) {
    return res.status(503).json({ status: 'unhealthy', reason: 'Database not connected' });
  }
  
  // Quick database health check with timeout
  const healthCheckTimeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({ status: 'unhealthy', reason: 'Database health check timeout' });
    }
  }, 5000); // 5 second timeout
  
  db.get('SELECT 1', (err) => {
    clearTimeout(healthCheckTimeout);
    if (err) {
      return res.status(503).json({ status: 'unhealthy', reason: 'Database query failed', error: err.message });
    }
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });
});

// Enhanced health check with detailed metrics
app.get('/health/detailed', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      connected: dbInitialized && db !== null,
      path: dbPath
    },
    nodeVersion: process.version,
    platform: process.platform
  };
  
  if (!db || !dbInitialized) {
    health.status = 'unhealthy';
    health.database.error = 'Database not connected';
    return res.status(503).json(health);
  }
  
  // Test database connection
  db.get('SELECT 1', (err) => {
    if (err) {
      health.status = 'unhealthy';
      health.database.error = err.message;
      return res.status(503).json(health);
    }
    res.json(health);
  });
});

// Request timeout middleware (30 seconds)
const timeout = (ms) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    }, ms);
    
    res.on('finish', () => clearTimeout(timer));
    next();
  };
};

app.use('/api', timeout(30000)); // 30 second timeout
app.use('/api', apiLimiter);
app.use('/api', apiKeyMiddleware);

// Document routes
app.get('/api/documents', (req, res, next) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  dbHelpers.all('SELECT * FROM documents ORDER BY updated_at DESC')
    .then(rows => res.json(rows))
    .catch(err => {
      console.error('Database error:', err);
      sendErrorResponse(res, 500, 'Failed to retrieve documents', err);
    });
});

app.post('/api/documents', validateInput.documentTitle, (req, res, next) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  const { title } = req.body;
  dbHelpers.run('INSERT INTO documents (title) VALUES (?)', [title])
    .then(function(result) {
      return dbHelpers.get('SELECT * FROM documents WHERE id = ?', [result.lastID]);
    })
    .then(row => res.json(row))
    .catch(err => {
      console.error('Database error:', err);
      sendErrorResponse(res, 500, 'Failed to create document', err);
    });
});

app.get('/api/documents/:id', validateInput.documentId, (req, res, next) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  dbHelpers.get('SELECT * FROM documents WHERE id = ?', [req.params.id])
    .then(row => {
      if (!row) return res.status(404).json({ error: 'Document not found' });
      res.json(row);
    })
    .catch(err => {
      console.error('Database error:', err);
      sendErrorResponse(res, 500, 'Failed to retrieve document', err);
    });
});

app.put('/api/documents/:id', validateInput.documentId, validateInput.documentTitle, (req, res, next) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  const { title } = req.body;
  dbHelpers.run(
    'UPDATE documents SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [title, req.params.id]
  )
    .then(() => dbHelpers.get('SELECT * FROM documents WHERE id = ?', [req.params.id]))
    .then(row => res.json(row))
    .catch(err => {
      console.error('Database error:', err);
      sendErrorResponse(res, 500, 'Failed to update document', err);
    });
});

app.delete('/api/documents/:id', validateInput.documentId, (req, res, next) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  dbHelpers.run('DELETE FROM documents WHERE id = ?', [req.params.id])
    .then(() => res.status(204).send())
    .catch(err => {
      console.error('Database error:', err);
      sendErrorResponse(res, 500, 'Failed to delete document', err);
    });
});

// Node routes
app.get('/api/documents/:doc_id/nodes', validateInput.docIdParam, (req, res) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  dbHelpers.all(
    'SELECT * FROM nodes WHERE document_id = ? ORDER BY order_index',
    [req.params.doc_id]
  )
    .then(rows => res.json(rows))
    .catch(err => sendErrorResponse(res, 500, 'Failed to retrieve nodes', err));
});

app.post('/api/nodes', validateInput.node, (req, res) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  const { document_id, parent_id, node_type, title, order_index, indent_level, image_url } = req.body;
  dbHelpers.run(
    'INSERT INTO nodes (document_id, parent_id, node_type, title, order_index, indent_level, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [document_id, parent_id, node_type, title, order_index, indent_level, image_url]
  )
    .then(function(result) {
      return dbHelpers.get('SELECT * FROM nodes WHERE id = ?', [result.lastID]);
    })
    .then(row => res.json(row))
    .catch(err => sendErrorResponse(res, 500, 'Failed to create node', err));
});

app.get('/api/nodes/:id', validateInput.nodeId, (req, res) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  dbHelpers.get('SELECT * FROM nodes WHERE id = ?', [req.params.id])
    .then(row => {
      if (!row) return res.status(404).json({ error: 'Node not found' });
      res.json(row);
    })
    .catch(err => sendErrorResponse(res, 500, 'Failed to retrieve node', err));
});

app.put('/api/nodes/:id', validateInput.nodeId, (req, res) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  const updates = [];
  const values = [];

  if (req.body.title !== undefined) {
    const sanitized = sanitizeString(req.body.title);
    if (sanitized.length === 0 || sanitized.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `Title must be between 1 and ${MAX_TITLE_LENGTH} characters` });
    }
    updates.push('title = ?');
    values.push(sanitized);
  }
  if (req.body.order_index !== undefined) {
    const ordIdx = validateInteger(req.body.order_index);
    if (ordIdx === null || ordIdx < 0) {
      return res.status(400).json({ error: 'order_index must be a non-negative integer' });
    }
    updates.push('order_index = ?');
    values.push(ordIdx);
  }
  if (req.body.indent_level !== undefined) {
    const indLevel = validateInteger(req.body.indent_level);
    if (indLevel === null || indLevel < 0) {
      return res.status(400).json({ error: 'indent_level must be a non-negative integer' });
    }
    updates.push('indent_level = ?');
    values.push(indLevel);
  }
  if (req.body.parent_id !== undefined && req.body.parent_id !== null) {
    const parId = validateInteger(req.body.parent_id);
    if (parId === null || parId <= 0) {
      return res.status(400).json({ error: 'Invalid parent_id' });
    }
    updates.push('parent_id = ?');
    values.push(parId);
  }
  if (req.body.image_url !== undefined && req.body.image_url !== null) {
    if (typeof req.body.image_url !== 'string' || req.body.image_url.length > MAX_URL_LENGTH) {
      return res.status(400).json({ error: 'Invalid image_url' });
    }
    updates.push('image_url = ?');
    values.push(req.body.image_url);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id);

  dbHelpers.run(
    `UPDATE nodes SET ${updates.join(', ')} WHERE id = ?`,
    values
  )
    .then(() => dbHelpers.get('SELECT * FROM nodes WHERE id = ?', [req.params.id]))
    .then(row => res.json(row))
    .catch(err => sendErrorResponse(res, 500, 'Failed to update node', err));
});

app.delete('/api/nodes/:id', validateInput.nodeId, (req, res) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  dbHelpers.run('DELETE FROM nodes WHERE id = ?', [req.params.id])
    .then(() => res.status(204).send())
    .catch(err => sendErrorResponse(res, 500, 'Failed to delete node', err));
});

// Content routes
app.get('/api/content/:node_id', validateInput.nodeIdParam, (req, res) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  dbHelpers.get('SELECT * FROM content WHERE node_id = ?', [req.params.node_id])
    .then(row => {
      if (!row) return res.status(404).json({ error: 'Content not found' });
      res.json(row);
    })
    .catch(err => sendErrorResponse(res, 500, 'Failed to retrieve content', err));
});

app.put('/api/content/:node_id', validateInput.nodeIdParam, validateInput.content, (req, res) => {
  if (!db || !dbInitialized) {
    return sendErrorResponse(res, 503, 'Database not available', null);
  }
  
  const { content_json } = req.body;
  const node_id = req.params.node_id;
  
  // First verify the node exists
  dbHelpers.get('SELECT id FROM nodes WHERE id = ?', [node_id])
    .then(node => {
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
      
      // Now save the content
      return dbHelpers.run(
        `INSERT INTO content (node_id, content_json) VALUES (?, ?)
         ON CONFLICT(node_id) DO UPDATE SET content_json = ?, updated_at = CURRENT_TIMESTAMP`,
        [node_id, content_json, content_json]
      );
    })
    .then(() => dbHelpers.get('SELECT * FROM content WHERE node_id = ?', [node_id]))
    .then(row => res.json(row))
    .catch(err => {
      console.error('Error saving content:', err);
      console.error('Node ID:', node_id);
      console.error('Content length:', content_json?.length);
      sendErrorResponse(res, 500, 'Failed to save content', err);
    });
});

// File upload route with content verification
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Verify file content matches declared MIME type
  const fileBuffer = fs.readFileSync(req.file.path);
  if (!verifyFileContent(fileBuffer, req.file.mimetype)) {
    // Delete the uploaded file if content doesn't match
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'File content does not match declared type. Possible file corruption or malicious file.' });
  }
  
  res.json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

// PDF export route (placeholder)
app.post('/api/export/pdf', (req, res) => {
  const { document_id, template } = req.body;
  res.json({
    message: 'PDF export not yet implemented',
    document_id,
    template
  });
});

// Error handling middleware (must be after all routes)
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Stop health check monitoring
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  
  // Stop keep-alive
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  
  // Cancel scheduled reconnect
  if (connectionRetryTimeout) {
    clearTimeout(connectionRetryTimeout);
    connectionRetryTimeout = null;
  }
  
  // Stop accepting new requests
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      
      // Close database connection
      if (db) {
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed.');
          }
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Forcing shutdown after timeout');
      if (db) {
        try {
          db.close();
        } catch (e) {
          // 忽略关闭错误
        }
      }
      process.exit(1);
    }, 10000);
  } else {
    if (db) {
      try {
        db.close();
      } catch (e) {
        // 忽略关闭错误
      }
    }
    process.exit(0);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server (only if not in test environment)
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
  });
}

// Export app for testing, server for production
module.exports = process.env.NODE_ENV === 'test' ? app : server;
