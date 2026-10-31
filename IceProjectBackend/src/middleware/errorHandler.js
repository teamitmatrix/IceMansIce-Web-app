const logger = require("../utils/logger");

function errorHandler(err, req, res, next) {
  logger.error("Error occurred:", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Ensure CORS headers are set on error responses
  const origin = req.headers.origin;
  if (origin && res.getHeader('Access-Control-Allow-Origin')) {
    // Headers already set by CORS middleware
  } else if (origin) {
    // Set CORS headers if not already set
    const allowedOrigins = [
      process.env.FRONTEND_URL || "https://icemansice.com",
      "https://icemansice.com",
      "https://www.icemansice.com",
      "http://localhost:3000",
      "http://localhost:3001",
    ];
    
    // Always allow icemansice.com and subdomains
    if (origin.endsWith('icemansice.com') || allowedOrigins.includes(origin) || /^https:\/\/.*\.vercel\.app$/.test(origin) || /^https:\/\/.*\.ngrok-free\.dev$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cache-Control, Pragma, X-Requested-With, Accept, Expires, If-None-Match, If-Modified-Since');
    }
  }

  if (err.isJoi) {
    return res.status(400).json({
      error: "Validation Error",
      message: err.message,
      details: err.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      })),
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      error: "Duplicate Error",
      message: `${field} already exists`,
      field: field,
    });
  }

  if (err.name === "ValidationError") {
  const errors = err.errors
    ? Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }))
    : [{ field: null, message: err.message }];

  return res.status(400).json({
    error: "Validation Error",
    message: "Invalid data provided",
    details: errors,
  });
}


  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Authentication Error",
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Authentication Error",
      message: "Token expired",
    });
  }

  if (err.name === "NotImplementedError") {
    return res.status(501).json({
      error: "Not Implemented",
      message: err.message,
    });
  }

  if (err.name === "BusinessLogicError") {
    return res.status(400).json({
      error: "Business Logic Error",
      message: err.message,
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "File Too Large",
      message: "File size exceeds the limit",
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      error: "Invalid File",
      message: "Unexpected file field",
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: "Server Error",
    message:
      process.env.NODE_ENV === "production" ? "Something went wrong" : message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
