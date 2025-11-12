#!/usr/bin/env node

/**
 * Type Editor - 跨平台一键启动脚本
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const platform = os.platform();
const isWindows = platform === 'win32';

console.log('========================================');
console.log('   Type Editor - 一键启动脚本');
console.log('========================================');
console.log('');

// 检查 Node.js 版本
const nodeVersion = process.version;
console.log(`[✓] Node.js 版本: ${nodeVersion}`);
console.log('');

// 检查并安装依赖函数
function checkDependencies(dir, name) {
  return new Promise((resolve, reject) => {
    console.log(`[${name}] 检查依赖中...`);
    const npm = isWindows ? 'npm.cmd' : 'npm';
    const install = spawn(npm, ['install'], {
      cwd: dir,
      stdio: 'inherit',
      shell: true
    });
    
    install.on('close', (code) => {
      if (code === 0) {
        console.log(`[✓] ${name} 依赖检查完成`);
        resolve();
      } else {
        reject(new Error(`${name} 依赖安装失败`));
      }
    });
  });
}

// 启动服务器函数
function startServer(dir, name, command, args = []) {
  return new Promise((resolve) => {
    const npm = isWindows ? 'npm.cmd' : 'npm';
    const node = isWindows ? 'node.exe' : 'node';
    
    let proc;
    if (command === 'node') {
      proc = spawn(node, args, {
        cwd: dir,
        stdio: 'inherit',
        shell: true
      });
    } else {
      proc = spawn(npm, ['run', command, ...args], {
        cwd: dir,
        stdio: 'inherit',
        shell: true
      });
    }
    
    proc.on('error', (err) => {
      console.error(`[错误] ${name} 启动失败:`, err.message);
    });
    
    // 给进程一些时间启动
    setTimeout(() => {
      resolve(proc);
    }, 1000);
  });
}

// 主函数
async function main() {
  try {
    // 检查并安装依赖
    console.log('[1/3] 检查并安装依赖...');
    await checkDependencies(path.join(__dirname, 'backend-express'), '后端');
    await checkDependencies(path.join(__dirname, 'frontend'), '前端');
    
    console.log('');
    console.log('[2/3] 启动后端服务器（带监控）...');
    // Use monitor.js for automatic restart on crash
    const backendProcess = await startServer(
      path.join(__dirname, 'backend-express'),
      '后端',
      'node',
      ['monitor.js']
    );
    
    console.log('[3/3] 启动前端开发服务器...');
    const frontendProcess = await startServer(
      path.join(__dirname, 'frontend'),
      '前端',
      'dev'
    );
    
    console.log('');
    console.log('========================================');
    console.log('    启动完成！');
    console.log('========================================');
    console.log('');
    console.log('后端: http://localhost:3001');
    console.log('前端: http://localhost:5000');
    console.log('');
    console.log('提示: 按 Ctrl+C 停止所有服务器');
    console.log('');
    
    // 处理退出信号
    process.on('SIGINT', () => {
      console.log('');
      console.log('正在停止服务器...');
      backendProcess.kill();
      frontendProcess.kill();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      backendProcess.kill();
      frontendProcess.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('[错误]', error.message);
    process.exit(1);
  }
}

main();

