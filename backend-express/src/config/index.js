const path = require('path');

/**
 * 应用程序配置
 */
const config = {
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT) || 3001,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // 数据库配置
  database: {
    path: process.env.DB_PATH || path.join(__dirname, '../../../type_editor.db'),
    retryDelay: parseInt(process.env.DB_RETRY_DELAY) || 1000,
    maxRetries: parseInt(process.env.DB_MAX_RETRIES) || 5,
    healthCheckInterval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL) || 30000,
    keepAliveInterval: parseInt(process.env.DB_KEEP_ALIVE_INTERVAL) || 60000,
    maxConsecutiveFailures: parseInt(process.env.DB_MAX_CONSECUTIVE_FAILURES) || 3
  },

  // 上传配置
  upload: {
    directory: path.join(__dirname, '../../../uploads'),
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    maxFiles: parseInt(process.env.UPLOAD_MAX_FILES) || 5,
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ],
    cleanupInterval: parseInt(process.env.UPLOAD_CLEANUP_INTERVAL) || 24 * 60 * 60 * 1000, // 24 小时
    maxAge: parseInt(process.env.UPLOAD_MAX_AGE) || 30 * 24 * 60 * 60 * 1000 // 30 天
  },

  // CORS 配置
  cors: {
    origins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080'
      ],
    credentials: process.env.CORS_CREDENTIALS === 'true' || true,
    maxAge: parseInt(process.env.CORS_MAX_AGE) || 86400 // 24 小时
  },

  // 速率限制配置
  rateLimit: {
    api: {
      windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW) || 15 * 60 * 1000, // 15 分钟
      max: parseInt(process.env.RATE_LIMIT_API_MAX) || 200
    },
    upload: {
      windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW) || 5 * 60 * 1000, // 5 分钟
      max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX) || 10
    },
    strict: {
      windowMs: parseInt(process.env.RATE_LIMIT_STRICT_WINDOW) || 1 * 60 * 1000, // 1 分钟
      max: parseInt(process.env.RATE_LIMIT_STRICT_MAX) || 20
    },
    search: {
      windowMs: parseInt(process.env.RATE_LIMIT_SEARCH_WINDOW) || 1 * 60 * 1000, // 1 分钟
      max: parseInt(process.env.RATE_LIMIT_SEARCH_MAX) || 30
    }
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    skipHealthCheck: process.env.LOG_SKIP_HEALTH_CHECK === 'true' || true,
    skipStaticFiles: process.env.LOG_SKIP_STATIC === 'true' || true,
    slowRequestThreshold: parseInt(process.env.LOG_SLOW_THRESHOLD) || 1000 // 1 秒
  },

  // 安全配置
  security: {
    helmet: {
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    },
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000, // 30 秒
    bodyLimit: process.env.BODY_LIMIT || '50mb'
  },

  // 功能开关
  features: {
    enableMetrics: process.env.ENABLE_METRICS === 'true' || false,
    enableSwagger: process.env.ENABLE_SWAGGER === 'true' || process.env.NODE_ENV === 'development',
    enableDebug: process.env.ENABLE_DEBUG === 'true' || process.env.NODE_ENV === 'development',
    enableCleanup: process.env.ENABLE_CLEANUP === 'true' || true
  },

  // API 配置
  api: {
    prefix: process.env.API_PREFIX || '/api',
    version: process.env.API_VERSION || 'v1',
    documentation: {
      title: 'Type Editor API',
      version: '1.0.0',
      description: 'API documentation for Type Editor application'
    }
  },

  // 监控配置
  monitoring: {
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED === 'true' || true,
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true' || false,
      endpoint: process.env.METRICS_ENDPOINT || '/metrics'
    }
  }
};

/**
 * 验证配置
 */
function validateConfig() {
  const errors = [];

  // 验证端口
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('Server port must be between 1 and 65535');
  }

  // 验证文件大小限制
  if (config.upload.maxFileSize < 1024) {
    errors.push('Upload max file size must be at least 1KB');
  }

  // 验证速率限制
  if (config.rateLimit.api.max < 1) {
    errors.push('API rate limit max must be at least 1');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * 获取环境特定的配置
 */
function getEnvConfig() {
  const envConfigs = {
    development: {
      server: {
        ...config.server,
        host: '0.0.0.0' // 允许外部访问
      },
      logging: {
        ...config.logging,
        level: 'debug'
      },
      security: {
        ...config.security,
        helmet: {
          ...config.security.helmet,
          contentSecurityPolicy: false
        }
      }
    },
    
    production: {
      logging: {
        ...config.logging,
        level: 'warn'
      },
      features: {
        ...config.features,
        enableSwagger: false,
        enableDebug: false
      }
    },

    test: {
      server: {
        ...config.server,
        port: 0 // 使用随机端口
      },
      database: {
        ...config.database,
        path: ':memory:' // 使用内存数据库
      },
      logging: {
        ...config.logging,
        level: 'error'
      }
    }
  };

  const envConfig = envConfigs[config.server.env] || {};
  
  // 深度合并配置
  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  return deepMerge({ ...config }, envConfig);
}

// 验证并导出配置
try {
  validateConfig();
  const finalConfig = getEnvConfig();
  
  // 在开发环境中显示配置信息
  if (finalConfig.server.env === 'development' && finalConfig.features.enableDebug) {
    console.log('Configuration loaded:', {
      env: finalConfig.server.env,
      port: finalConfig.server.port,
      dbPath: finalConfig.database.path,
      uploadDir: finalConfig.upload.directory
    });
  }
  
  module.exports = finalConfig;
} catch (error) {
  console.error('Configuration error:', error.message);
  process.exit(1);
}