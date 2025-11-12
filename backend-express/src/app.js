const express = require('express');
const path = require('path');
const helmet = require('helmet');

// 导入配置
const config = require('./config');

// 导入中间件
const corsMiddleware = require('./middleware/cors');
const { errorHandler, notFoundHandler, timeoutHandler } = require('./middleware/errorHandler');
const { getLoggerMiddleware, requestIdMiddleware } = require('./middleware/logger');
const { getRateLimit } = require('./middleware/rateLimit');

// 导入路由
const documentsRouter = require('./routes/documents');
const nodesRouter = require('./routes/nodes');
const contentRouter = require('./routes/content');
const uploadRouter = require('./routes/upload');

// 导入服务
const db = require('./services/database');

// 创建 Express 应用
const app = express();

/**
 * 初始化数据库连接
 */
async function initializeDatabase() {
  try {
    await db.initConnection();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    if (config.server.env === 'production') {
      process.exit(1);
    }
  }
}

/**
 * 配置中间件
 */
function setupMiddlewares() {
  // 信任代理（如果在反向代理后面）
  app.set('trust proxy', 1);

  // 请求ID中间件
  app.use(requestIdMiddleware);

  // 安全中间件
  app.use(helmet(config.security.helmet));

  // CORS 中间件
  app.use(corsMiddleware);

  // 请求超时
  app.use(timeoutHandler(config.security.timeout));

  // 日志中间件
  const loggerMiddlewares = getLoggerMiddleware();
  loggerMiddlewares.forEach(middleware => app.use(middleware));

  // 解析请求体
  app.use(express.json({ 
    limit: config.security.bodyLimit,
    strict: true
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: config.security.bodyLimit 
  }));

  // 静态文件服务
  app.use('/uploads', express.static(config.upload.directory, {
    maxAge: '1d',
    etag: true,
    lastModified: true
  }));

  console.log('✅ Middlewares configured successfully');
}

/**
 * 配置路由
 */
function setupRoutes() {
  // 健康检查端点
  app.get('/health', getRateLimit('health'), (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: require('../package.json').version,
      database: db.dbInitialized ? 'connected' : 'disconnected'
    });
  });

  // API 根路径（必须在其他 API 路由之前）
  app.get('/api', (req, res) => {
    res.json({
      name: 'Type Editor API',
      version: require('../package.json').version,
      description: 'API for Type Editor application',
      endpoints: {
        documents: '/api/documents',
        nodes: '/api/nodes',
        content: '/api/content',
        upload: '/api/upload',
        health: '/health'
      }
    });
  });

  // API 路由
  app.use('/api/documents', documentsRouter);
  app.use('/api/nodes', nodesRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/upload', uploadRouter);

  console.log('✅ Routes configured successfully');
}

/**
 * 配置错误处理
 */
function setupErrorHandling() {
  // 404 处理
  app.use(notFoundHandler);

  // 全局错误处理
  app.use(errorHandler);

  console.log('✅ Error handling configured successfully');
}

/**
 * 优雅关闭处理
 */
function setupGracefulShutdown() {
  const gracefulShutdown = async (signal) => {
    console.log(`\n📡 ${signal} received, starting graceful shutdown...`);
    
    try {
      // 关闭服务器
      if (server) {
        await new Promise((resolve) => {
          server.close(resolve);
        });
        console.log('✅ HTTP server closed');
      }

      // 关闭数据库连接
      await db.close();
      console.log('✅ Database connection closed');

      console.log('👋 Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // 监听关闭信号
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

  console.log('✅ Graceful shutdown handlers configured');
}

/**
 * 启动清理任务
 */
function startCleanupTasks() {
  if (!config.features.enableCleanup) {
    return;
  }

  // 定期清理上传文件
  setInterval(async () => {
    try {
      const contentService = require('./services/contentService');
      await contentService.cleanupExpiredContent();
      console.log('🧹 Cleanup task completed');
    } catch (error) {
      console.error('❌ Cleanup task failed:', error);
    }
  }, config.upload.cleanupInterval);

  console.log('✅ Cleanup tasks started');
}

/**
 * 启动服务器
 */
async function startServer() {
  try {
    console.log('🚀 Starting Type Editor Server...\n');

    // 初始化数据库
    await initializeDatabase();

    // 配置中间件
    setupMiddlewares();

    // 配置路由
    setupRoutes();

    // 配置错误处理
    setupErrorHandling();

    // 配置优雅关闭
    setupGracefulShutdown();

    // 启动清理任务
    startCleanupTasks();

    // 启动服务器
    const server = app.listen(config.server.port, config.server.host, () => {
      const serverAddress = server.address();
      const address = serverAddress?.address || config.server.host;
      const port = serverAddress?.port || config.server.port;
      
      console.log('\n🎉 Server started successfully!');
      console.log(`📍 Server running at: http://${address === '::' ? 'localhost' : address}:${port}`);
      console.log(`🌍 Environment: ${config.server.env}`);
      console.log(`💾 Database: ${config.database.path}`);
      console.log(`📁 Upload directory: ${config.upload.directory}`);
      console.log(`\n🔗 Available endpoints:`);
      console.log(`   Health check: http://localhost:${port}/health`);
      console.log(`   API docs: http://localhost:${port}/api`);
      console.log(`   Documents: http://localhost:${port}/api/documents`);
      console.log(`   Upload: http://localhost:${port}/api/upload`);
      console.log('\n✨ Ready to handle requests!');
    });

    // 设置服务器超时
    server.timeout = config.security.timeout;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // 导出服务器实例供测试使用
    global.server = server;

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startServer().catch(console.error);
}

// 导出应用和启动函数供测试使用
module.exports = { app, startServer };

// Debug: 列出已注册的路由（仅开发环境可用）
if (config.server.env === 'development') {
  app.get('/__routes', (req, res) => {
    try {
      const stack = app._router && app._router.stack ? app._router.stack : [];
      const debug = stack.map((layer, idx) => {
        return {
          index: idx,
          name: layer.name,
          regexp: layer.regexp && layer.regexp.source,
          route: !!layer.route,
          methods: layer.route ? Object.keys(layer.route.methods) : undefined
        };
      });
      res.json({ routes: debug });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}