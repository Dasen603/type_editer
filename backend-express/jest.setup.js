// Jest setup file for backend tests

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.LOG_LEVEL = 'error';

// 全局测试工具
global.testTimeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 控制台静音（除了错误）
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;

console.log = () => {};
console.info = () => {};
console.warn = () => {};

// 只在需要时恢复
global.restoreConsole = () => {
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
};

// Jest hooks are not available in setup files
// They will be available in test files

// 全局异常处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});