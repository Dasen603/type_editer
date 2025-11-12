/**
 * API 测试脚本 - 用于诊断服务器错误
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/documents',
  method: 'GET',
  headers: {
    'Origin': 'http://localhost:5000',
    'Content-Type': 'application/json'
  }
};

console.log('测试后端 API...');
console.log('请求:', options);
console.log('');

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头:`, res.headers);
  console.log('');

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('响应体:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
    
    if (res.statusCode !== 200) {
      console.log('');
      console.log('❌ API 请求失败');
      process.exit(1);
    } else {
      console.log('');
      console.log('✅ API 请求成功');
    }
  });
});

req.on('error', (e) => {
  console.error(`请求错误: ${e.message}`);
  console.log('');
  console.log('可能的原因:');
  console.log('1. 后端服务器未启动');
  console.log('2. 端口 3001 被占用');
  console.log('3. 防火墙阻止连接');
  process.exit(1);
});

req.end();

