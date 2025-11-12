#!/usr/bin/env node

/**
 * 后端服务监控脚本 - 自动重启崩溃的服务
 * 使用方法: node monitor.js
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const SERVER_SCRIPT = path.join(__dirname, 'server.js');
const HEALTH_CHECK_URL = 'http://localhost:3001/health';
const HEALTH_CHECK_INTERVAL = 10000; // 10秒检查一次
const MAX_RESTART_ATTEMPTS = 5;
const RESTART_DELAY = 2000; // 重启延迟2秒

let serverProcess = null;
let restartAttempts = 0;
let isRestarting = false;
let healthCheckTimer = null;

/**
 * 启动服务器
 */
function startServer() {
  if (isRestarting) {
    return;
  }

  console.log(`[${new Date().toISOString()}] 启动后端服务器...`);
  
  serverProcess = spawn('node', [SERVER_SCRIPT], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  serverProcess.on('error', (err) => {
    console.error(`[错误] 无法启动服务器:`, err.message);
    scheduleRestart();
  });

  serverProcess.on('exit', (code, signal) => {
    console.warn(`[警告] 服务器进程退出 (code: ${code}, signal: ${signal})`);
    
    if (code !== 0 && code !== null) {
      console.error(`[错误] 服务器异常退出，退出码: ${code}`);
      scheduleRestart();
    } else {
      console.log('[信息] 服务器正常退出');
    }
  });

  // 等待服务器启动
  setTimeout(() => {
    startHealthCheck();
  }, 3000);
}

/**
 * 健康检查
 */
function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_CHECK_URL, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            if (health.status === 'healthy') {
              resolve(true);
              return;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
        resolve(false);
      });
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * 开始健康检查
 */
function startHealthCheck() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }

  healthCheckTimer = setInterval(async () => {
    if (!serverProcess || serverProcess.killed) {
      return;
    }

    const isHealthy = await checkHealth();
    
    if (!isHealthy) {
      console.warn(`[警告] 健康检查失败，服务器可能无响应`);
      
      // 检查进程是否还在运行
      if (serverProcess && !serverProcess.killed) {
        try {
          process.kill(serverProcess.pid, 0); // 检查进程是否存在
        } catch (e) {
          // 进程不存在
          console.error('[错误] 服务器进程已消失');
          scheduleRestart();
        }
      }
    } else {
      restartAttempts = 0; // 重置重启计数
    }
  }, HEALTH_CHECK_INTERVAL);
}

/**
 * 安排重启
 */
function scheduleRestart() {
  if (isRestarting) {
    return;
  }

  restartAttempts++;
  
  if (restartAttempts > MAX_RESTART_ATTEMPTS) {
    console.error(`[错误] 已达到最大重启次数 (${MAX_RESTART_ATTEMPTS})，停止监控`);
    process.exit(1);
  }

  console.log(`[信息] 将在 ${RESTART_DELAY / 1000} 秒后重启服务器 (尝试 ${restartAttempts}/${MAX_RESTART_ATTEMPTS})`);
  
  isRestarting = true;
  
  // 停止健康检查
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }

  // 停止当前进程
  if (serverProcess && !serverProcess.killed) {
    console.log('[信息] 正在停止当前服务器进程...');
    serverProcess.kill('SIGTERM');
    
    // 等待进程退出，最多等待5秒
    const killTimeout = setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        console.warn('[警告] 强制终止服务器进程');
        serverProcess.kill('SIGKILL');
      }
    }, 5000);

    serverProcess.on('exit', () => {
      clearTimeout(killTimeout);
      setTimeout(() => {
        isRestarting = false;
        restartAttempts = 0; // 重置计数，给服务器一次机会
        startServer();
      }, RESTART_DELAY);
    });
  } else {
    setTimeout(() => {
      isRestarting = false;
      startServer();
    }, RESTART_DELAY);
  }
}

/**
 * 优雅关闭
 */
function gracefulShutdown(signal) {
  console.log(`\n[信息] 收到 ${signal} 信号，正在关闭监控器...`);
  
  // 停止健康检查
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }

  // 停止服务器进程
  if (serverProcess && !serverProcess.killed) {
    console.log('[信息] 正在停止服务器进程...');
    serverProcess.kill('SIGTERM');
    
    const killTimeout = setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);

    serverProcess.on('exit', () => {
      clearTimeout(killTimeout);
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

// 注册信号处理器
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('[错误] 未捕获的异常:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[错误] 未处理的Promise拒绝:', reason);
});

// 启动服务器
console.log('========================================');
console.log('   后端服务监控器');
console.log('========================================');
console.log('');
console.log(`健康检查URL: ${HEALTH_CHECK_URL}`);
console.log(`检查间隔: ${HEALTH_CHECK_INTERVAL / 1000}秒`);
console.log(`最大重启次数: ${MAX_RESTART_ATTEMPTS}`);
console.log('');

startServer();

