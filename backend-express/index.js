#!/usr/bin/env node

/**
 * Type Editor 服务器启动脚本
 */

const { startServer } = require('./src/app');
const config = require('./src/config');

// 显示启动信息
console.log('='.repeat(50));
console.log('🏗️  Type Editor Backend Server');
console.log('='.repeat(50));

// 启动服务器
startServer().catch((error) => {
  console.error('\n❌ Server startup failed:', error);
  process.exit(1);
});