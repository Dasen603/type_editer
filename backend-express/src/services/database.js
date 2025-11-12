const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库连接管理类
class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbInitialized = false;
    this.isConnecting = false;
    this.connectionRetryTimeout = null;
    this.healthCheckTimer = null;
    this.keepAliveTimer = null;
    this.consecutiveHealthCheckFailures = 0;
    
    // 配置常量
    this.DB_RETRY_DELAY = 1000;
    this.DB_MAX_RETRIES = 5;
    this.HEALTH_CHECK_INTERVAL = 30000;
    this.MAX_CONSECUTIVE_FAILURES = 3;
    this.KEEP_ALIVE_INTERVAL = 60000;
    
    this.dbPath = process.env.DB_PATH || path.join(__dirname, '../../..', 'type_editor.db');
  }

  /**
   * 初始化数据库连接
   */
  async initConnection(retries = 0) {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        const checkInterval = setInterval(() => {
          if (!this.isConnecting) {
            clearInterval(checkInterval);
            if (this.dbInitialized && this.db) {
              resolve();
            } else {
              reject(new Error('Previous connection attempt failed'));
            }
          }
        }, 100);
        return;
      }

      if (this.db) {
        try {
          this.db.close((err) => {
            if (err) console.warn('Error closing old database connection:', err.message);
          });
        } catch (e) {
          // 忽略关闭错误
        }
        this.db = null;
      }

      this.isConnecting = true;
      this.dbInitialized = false;

      try {
        const newDb = new sqlite3.Database(this.dbPath, (err) => {
          this.isConnecting = false;
          
          if (err) {
            console.error(`Database connection error (attempt ${retries + 1}/${this.DB_MAX_RETRIES}):`, err.message);
            
            if (retries < this.DB_MAX_RETRIES - 1) {
              const delay = this.DB_RETRY_DELAY * Math.pow(2, retries);
              setTimeout(() => {
                this.initConnection(retries + 1).then(resolve).catch(reject);
              }, delay);
              return;
            }
            
            if (process.env.NODE_ENV !== 'test') {
              console.error('Failed to connect to database after retries');
              this.scheduleReconnect();
              reject(err);
            } else {
              reject(err);
            }
            return;
          }
          
          this.configureDatabase(newDb);
          this.db = newDb;
          this.dbInitialized = true;
          
          if (process.env.NODE_ENV !== 'test') {
            console.log(`Database connected: ${this.dbPath}`);
            this.startHealthCheckMonitoring();
            this.startKeepAlive();
          }
          
          this.initTables();
          resolve();
        });
        
        newDb.on('error', (err) => {
          console.error('Database error:', err.message);
          if (err.code === 'SQLITE_CORRUPT') {
            console.error('Database corruption detected!');
            this.dbInitialized = false;
            this.scheduleReconnect();
          } else {
            this.dbInitialized = false;
            console.warn('Database connection lost, will reconnect on next query');
          }
        });
        
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * 配置数据库设置
   */
  configureDatabase(db) {
    // Enable WAL mode for better concurrency
    db.run('PRAGMA journal_mode = WAL;', (err) => {
      if (err) console.warn('Warning: Could not enable WAL mode:', err.message);
    });
    
    db.configure('busyTimeout', 10000);
    
    db.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) console.warn('Warning: Could not enable foreign keys:', err.message);
    });

    db.run('PRAGMA synchronous = NORMAL;', (err) => {
      if (err) console.warn('Warning: Could not set synchronous mode:', err.message);
    });

    db.run('PRAGMA cache_size = -64000;', (err) => {
      if (err) console.warn('Warning: Could not set cache size:', err.message);
    });
  }

  /**
   * 初始化数据库表
   */
  initTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS nodes (
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
      )`,
      
      `CREATE TABLE IF NOT EXISTS content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id INTEGER NOT NULL UNIQUE,
        content_json TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
      )`
    ];

    tables.forEach(sql => {
      this.db.run(sql, (err) => {
        if (err) console.error('Error creating table:', err);
      });
    });

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_nodes_document_id ON nodes(document_id)',
      'CREATE INDEX IF NOT EXISTS idx_nodes_order_index ON nodes(order_index)',
      'CREATE INDEX IF NOT EXISTS idx_content_node_id ON content(node_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at)'
    ];

    indexes.forEach(sql => {
      this.db.run(sql, (err) => {
        if (err && process.env.NODE_ENV !== 'test') {
          console.error('Error creating index:', err);
        }
      });
    });

    // Add image_url column if it doesn't exist
    this.db.run('ALTER TABLE nodes ADD COLUMN image_url TEXT', () => {
      // Ignore error if column already exists
    });
  }

  /**
   * 执行数据库查询
   */
  async query(method, sql, params = [], retries = 3) {
    return new Promise((resolve, reject) => {
      if (!this.db || !this.dbInitialized) {
        if (!this.isConnecting) {
          console.warn('Database not initialized, attempting to reconnect...');
          this.initConnection(0)
            .then(() => {
              this.query(method, sql, params, retries).then(resolve).catch(reject);
            })
            .catch((err) => {
              reject(new Error('Database not available and reconnection failed: ' + err.message));
            });
        } else {
          setTimeout(() => {
            this.query(method, sql, params, retries).then(resolve).catch(reject);
          }, 500);
        }
        return;
      }
      
      const execute = (attempt) => {
        if (!this.db || !this.dbInitialized) {
          if (attempt < retries && !this.isConnecting) {
            this.initConnection(0)
              .then(() => {
                setTimeout(() => execute(attempt + 1), this.DB_RETRY_DELAY);
              })
              .catch(() => reject(new Error('Database connection lost')));
          } else {
            reject(new Error('Database connection not available'));
          }
          return;
        }

        try {
          const queryTimeout = setTimeout(() => {
            reject(new Error('Database query timeout'));
          }, 30000);

          if (method === 'run') {
            this.db.run(sql, params, function(err) {
              clearTimeout(queryTimeout);
              
              if (err) {
                if (this.shouldRetry(err, attempt, retries)) {
                  const delay = this.DB_RETRY_DELAY * Math.pow(2, attempt);
                  setTimeout(() => execute(attempt + 1), delay);
                  return;
                }
                reject(err);
                return;
              }
              
              resolve({ lastID: this.lastID, changes: this.changes });
            });
          } else {
            this.db[method](sql, params, (err, result) => {
              clearTimeout(queryTimeout);
              
              if (err) {
                if (this.shouldRetry(err, attempt, retries)) {
                  const delay = this.DB_RETRY_DELAY * Math.pow(2, attempt);
                  setTimeout(() => execute(attempt + 1), delay);
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
            setTimeout(() => execute(attempt + 1), this.DB_RETRY_DELAY * (attempt + 1));
          } else {
            reject(error);
          }
        }
      };
      
      execute(0);
    });
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(err, attempt, maxRetries) {
    if (attempt >= maxRetries) return false;
    
    if (err.code === 'SQLITE_CORRUPT') {
      this.dbInitialized = false;
      this.scheduleReconnect();
      return true;
    }
    
    if (err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED') {
      return true;
    }
    
    if (err.message?.includes('database is locked') || err.message?.includes('no such table')) {
      this.dbInitialized = false;
      this.scheduleReconnect();
      return true;
    }
    
    return false;
  }

  /**
   * 安排重连
   */
  scheduleReconnect() {
    if (this.connectionRetryTimeout) return;
    
    this.connectionRetryTimeout = setTimeout(() => {
      this.connectionRetryTimeout = null;
      if (!this.dbInitialized && !this.isConnecting) {
        console.log('Attempting to reconnect to database...');
        this.initConnection(0).catch((err) => {
          console.error('Reconnection failed:', err.message);
        });
      }
    }, this.DB_RETRY_DELAY * 5);
  }

  /**
   * 启动健康检查
   */
  startHealthCheckMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(() => {
      if (!this.db || !this.dbInitialized) {
        this.consecutiveHealthCheckFailures++;
        console.warn(`Health check failed: Database not initialized (${this.consecutiveHealthCheckFailures}/${this.MAX_CONSECUTIVE_FAILURES})`);
        
        if (this.consecutiveHealthCheckFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          console.error('Too many consecutive health check failures. Attempting to reconnect...');
          this.consecutiveHealthCheckFailures = 0;
          this.dbInitialized = false;
          this.scheduleReconnect();
        }
        return;
      }
      
      const healthCheckTimeout = setTimeout(() => {
        this.consecutiveHealthCheckFailures++;
        console.warn(`Health check timeout (${this.consecutiveHealthCheckFailures}/${this.MAX_CONSECUTIVE_FAILURES})`);
        
        if (this.consecutiveHealthCheckFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          console.error('Database health check timeout multiple times. Attempting to reconnect...');
          this.consecutiveHealthCheckFailures = 0;
          this.dbInitialized = false;
          this.scheduleReconnect();
        }
      }, 5000);
      
      this.db.get('SELECT 1', (err) => {
        clearTimeout(healthCheckTimeout);
        
        if (err) {
          this.consecutiveHealthCheckFailures++;
          console.warn(`Health check failed: ${err.message} (${this.consecutiveHealthCheckFailures}/${this.MAX_CONSECUTIVE_FAILURES})`);
          
          if (this.consecutiveHealthCheckFailures >= this.MAX_CONSECUTIVE_FAILURES) {
            console.error('Database health check failed multiple times. Attempting to reconnect...');
            this.consecutiveHealthCheckFailures = 0;
            this.dbInitialized = false;
            this.scheduleReconnect();
          }
        } else {
          this.consecutiveHealthCheckFailures = 0;
        }
      });
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * 启动保活机制
   */
  startKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
    }
    
    this.keepAliveTimer = setInterval(() => {
      if (this.db && this.dbInitialized) {
        this.db.get('SELECT 1', (err) => {
          if (err) {
            console.warn('Keep-alive check failed:', err.message);
            this.dbInitialized = false;
            this.scheduleReconnect();
          }
        });
      }
    }, this.KEEP_ALIVE_INTERVAL);
  }

  /**
   * 优雅关闭
   */
  async close() {
    return new Promise((resolve) => {
      // 停止定时器
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }
      
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = null;
      }
      
      if (this.connectionRetryTimeout) {
        clearTimeout(this.connectionRetryTimeout);
        this.connectionRetryTimeout = null;
      }
      
      // 关闭数据库连接
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed.');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // 便捷方法
  async all(sql, params = []) {
    return this.query('all', sql, params);
  }

  async get(sql, params = []) {
    return this.query('get', sql, params);
  }

  async run(sql, params = []) {
    return this.query('run', sql, params);
  }
}

// 创建单例实例
const databaseManager = new DatabaseManager();

module.exports = databaseManager;