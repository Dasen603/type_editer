const cors = require('cors');

/**
 * CORS 中间件配置
 */
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的域名列表
    const allowedOrigins = [
      'http://localhost:3000',  // React 开发服务器
      'http://localhost:5173',  // Vite 开发服务器
      'http://localhost:8080',  // 其他可能的前端端口
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080'
    ];

    // 在开发环境中允许所有来源（当 origin 为 undefined 时，通常是同源请求）
    if (process.env.NODE_ENV === 'development' && !origin) {
      return callback(null, true);
    }

    // 在生产环境中检查具体的域名
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true, // 允许携带 cookies
  optionsSuccessStatus: 200, // 对于旧浏览器的兼容性
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400 // 24 小时的预检缓存
};

const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;