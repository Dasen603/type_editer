const morgan = require('morgan');

/**
 * 自定义日志格式
 */
const customFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

/**
 * 开发环境日志格式
 */
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

/**
 * 生产环境日志格式
 */
const prodFormat = ':remote-addr - :remote-user [:date[iso]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

/**
 * 创建自定义 token
 */
morgan.token('id', function getId(req) {
  return req.id || req.headers['x-request-id'] || 'unknown';
});

morgan.token('body', function getBody(req) {
  if (req.method === 'POST' || req.method === 'PUT') {
    // 不记录敏感信息
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '[HIDDEN]';
    if (safeBody.token) safeBody.token = '[HIDDEN]';
    return JSON.stringify(safeBody);
  }
  return '';
});

morgan.token('user', function getUser(req) {
  return req.user?.id || req.user?.email || 'anonymous';
});

/**
 * 跳过某些请求的日志记录
 */
const skipFunction = (req, res) => {
  // 跳过健康检查请求
  if (req.url === '/health' || req.url === '/api/health') {
    return true;
  }
  
  // 跳过静态文件请求
  if (req.url.startsWith('/uploads/') || req.url.startsWith('/static/')) {
    return true;
  }
  
  // 跳过 favicon 请求
  if (req.url === '/favicon.ico') {
    return true;
  }
  
  // 在测试环境中跳过所有日志
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  
  return false;
};

/**
 * 错误日志记录
 */
const errorLogger = morgan(prodFormat, {
  skip: (req, res) => {
    return res.statusCode < 400 || skipFunction(req, res);
  },
  stream: {
    write: (message) => {
      console.error('HTTP Error:', message.trim());
    }
  }
});

/**
 * 访问日志记录
 */
const accessLogger = morgan(
  process.env.NODE_ENV === 'development' ? devFormat : prodFormat,
  {
    skip: skipFunction,
    stream: {
      write: (message) => {
        console.log('HTTP Access:', message.trim());
      }
    }
  }
);

/**
 * 详细日志记录（包含请求体）
 */
const detailedLogger = morgan(
  ':method :url :status :response-time ms - User: :user - Body: :body',
  {
    skip: (req, res) => {
      // 只记录POST和PUT请求
      if (req.method !== 'POST' && req.method !== 'PUT') {
        return true;
      }
      return skipFunction(req, res);
    }
  }
);

/**
 * 性能日志记录
 */
const performanceLogger = morgan(
  ':method :url :response-time ms',
  {
    skip: (req, res) => {
      // 只记录慢请求（超过1秒）
      return res.responseTime < 1000 || skipFunction(req, res);
    },
    stream: {
      write: (message) => {
        console.warn('Slow Request:', message.trim());
      }
    }
  }
);

/**
 * 根据环境获取日志中间件
 */
function getLoggerMiddleware() {
  const middlewares = [];
  
  if (process.env.NODE_ENV === 'development') {
    middlewares.push(accessLogger);
    middlewares.push(detailedLogger);
  } else {
    middlewares.push(accessLogger);
    middlewares.push(errorLogger);
    middlewares.push(performanceLogger);
  }
  
  return middlewares;
}

/**
 * 请求ID生成中间件
 */
function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || 
           `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  res.set('X-Request-ID', req.id);
  next();
}

module.exports = {
  accessLogger,
  errorLogger,
  detailedLogger,
  performanceLogger,
  getLoggerMiddleware,
  requestIdMiddleware
};