/**
 * 错误处理中间件
 */

/**
 * 404 错误处理器 - 处理未找到的路由
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * 全局错误处理器
 */
function errorHandler(error, req, res, next) {
  // 如果响应已经发送，将错误传递给默认的 Express 错误处理器
  if (res.headersSent) {
    return next(error);
  }

  // 设置错误状态码
  const statusCode = error.status || error.statusCode || 500;
  
  // 准备错误响应
  const errorResponse = {
    error: error.message || 'Internal Server Error',
    status: statusCode
  };

  // 在开发环境中提供更多错误信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = {
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
      headers: req.headers
    };
  }

  // 记录错误日志
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${statusCode}:`, {
    error: error.message,
    stack: error.stack,
    user: req.user?.id || 'anonymous',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });

  // 特殊错误类型处理
  if (error.name === 'ValidationError') {
    errorResponse.error = 'Validation Error';
    errorResponse.details = error.details || error.message;
    return res.status(400).json(errorResponse);
  }

  if (error.name === 'CastError') {
    errorResponse.error = 'Invalid ID format';
    return res.status(400).json(errorResponse);
  }

  if (error.code === 'SQLITE_CONSTRAINT') {
    errorResponse.error = 'Database constraint violation';
    return res.status(400).json(errorResponse);
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    errorResponse.error = 'File too large';
    return res.status(400).json(errorResponse);
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    errorResponse.error = 'Too many files';
    return res.status(400).json(errorResponse);
  }

  if (error.code === 'INVALID_FILE_TYPE') {
    errorResponse.error = 'Invalid file type';
    return res.status(400).json(errorResponse);
  }

  // 数据库相关错误
  if (error.message && error.message.includes('database')) {
    errorResponse.error = 'Database operation failed';
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.originalError = error.message;
    }
  }

  // CORS 错误
  if (error.message && error.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS Policy Violation',
      message: 'Request blocked by CORS policy'
    });
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
}

/**
 * 异步错误包装器 - 用于包装异步路由处理器
 */
function asyncHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 请求超时处理
 */
function timeoutHandler(timeout = 30000) {
  return function(req, res, next) {
    // 设置请求超时
    req.setTimeout(timeout, () => {
      const error = new Error('Request timeout');
      error.status = 408;
      next(error);
    });

    // 设置响应超时
    res.setTimeout(timeout, () => {
      const error = new Error('Response timeout');
      error.status = 408;
      next(error);
    });

    next();
  };
}

/**
 * 速率限制错误处理
 */
function rateLimitHandler(req, res, next) {
  if (req.rateLimit && req.rateLimit.exceeded) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
  next();
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  timeoutHandler,
  rateLimitHandler
};