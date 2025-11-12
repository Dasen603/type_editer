// 测试环境的应用设置
const express = require('express');
const cors = require('cors');

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

// 导入服务和路由
const db = require('../src/services/database');
const documentsRouter = require('../src/routes/documents');
const nodesRouter = require('../src/routes/nodes');
const contentRouter = require('../src/routes/content');
const uploadRouter = require('../src/routes/upload');

// 创建测试应用
const app = express();

// 基本中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    database: db.dbInitialized ? 'connected' : 'disconnected'
  });
});

// API 根路径
app.get('/api', (req, res) => {
  res.json({
    name: 'Type Editor API',
    version: '1.0.0',
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

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理
app.use((error, req, res, next) => {
  console.error('Test app error:', error.message);
  res.status(500).json({ error: error.message });
});

// 初始化测试数据库
async function setupTestDatabase() {
  try {
    await db.initConnection();
    console.log('Test database initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    return false;
  }
}

// 清理测试数据库
async function cleanupTestDatabase() {
  try {
    await db.close();
    console.log('Test database closed');
  } catch (error) {
    console.error('Failed to close test database:', error);
  }
}

module.exports = {
  app,
  setupTestDatabase,
  cleanupTestDatabase
};