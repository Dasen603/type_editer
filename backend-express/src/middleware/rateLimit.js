const rateLimit = require('express-rate-limit');

/**
 * 通用速率限制配置
 */
const createRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 100, // 每个窗口期的最大请求数
    message: {
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: 'Check the Retry-After header'
    },
    standardHeaders: true, // 返回速率限制信息在 `RateLimit-*` headers
    legacyHeaders: false, // 禁用 `X-RateLimit-*` headers
    // 跳过成功的请求（只计算错误请求）
    skipSuccessfulRequests: false,
    // 跳过失败的请求
    skipFailedRequests: false,
    // 自定义处理器
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.round(options.windowMs / 1000) || 900
      });
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * API 路由的速率限制
 */
const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 200, // 每个IP每15分钟最多200个请求
  message: {
    error: 'API Rate Limit Exceeded',
    message: 'Too many API requests from this IP, please try again after 15 minutes.'
  }
});

/**
 * 文件上传的速率限制
 */
const uploadRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 分钟
  max: 10, // 每个IP每5分钟最多10次上传
  message: {
    error: 'Upload Rate Limit Exceeded',
    message: 'Too many upload requests from this IP, please try again after 5 minutes.'
  }
});

/**
 * 创建和删除操作的严格限制
 */
const strictRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟
  max: 20, // 每个IP每分钟最多20次创建/删除操作
  message: {
    error: 'Strict Rate Limit Exceeded',
    message: 'Too many create/delete operations from this IP, please slow down.'
  }
});

/**
 * 搜索操作的限制
 */
const searchRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟
  max: 30, // 每个IP每分钟最多30次搜索
  message: {
    error: 'Search Rate Limit Exceeded',
    message: 'Too many search requests from this IP, please try again after 1 minute.'
  }
});

/**
 * 健康检查的宽松限制
 */
const healthCheckRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟
  max: 60, // 每分钟60次健康检查
  skipSuccessfulRequests: true,
  message: {
    error: 'Health Check Rate Limit Exceeded',
    message: 'Too many health check requests.'
  }
});

/**
 * 开发环境的宽松限制
 */
const developmentRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟
  max: 1000, // 开发环境下很宽松的限制
  message: {
    error: 'Development Rate Limit Exceeded',
    message: 'Even in development, you are making too many requests.'
  }
});

/**
 * 根据环境选择合适的速率限制
 */
function getRateLimit(type = 'api') {
  if (process.env.NODE_ENV === 'development') {
    return developmentRateLimit;
  }

  switch (type) {
    case 'upload':
      return uploadRateLimit;
    case 'strict':
      return strictRateLimit;
    case 'search':
      return searchRateLimit;
    case 'health':
      return healthCheckRateLimit;
    default:
      return apiRateLimit;
  }
}

module.exports = {
  createRateLimit,
  apiRateLimit,
  uploadRateLimit,
  strictRateLimit,
  searchRateLimit,
  healthCheckRateLimit,
  developmentRateLimit,
  getRateLimit
};