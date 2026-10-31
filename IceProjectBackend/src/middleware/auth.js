const jwt = require("jsonwebtoken");
const config = require("../config");
const { AuthenticationError } = require("../utils/errors");
const logger = require("../utils/logger");
const authenticateToken = (req, res, next) => {
  console.log("AUTH MIDDLEWARE CALLED:", req.path, req.method);
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  

  // Debug logging for OAuth routes
  if (req.path.includes("/qbo/oauth/start")) {
    logger.info("Authentication middleware for OAuth start", {
      hasAuthHeader: !!authHeader,
      authHeader: authHeader ? `${authHeader.substring(0, 50)}...` : null,
      hasToken: !!token,
      token: token ? `${token.substring(0, 50)}...` : null,
      fullToken: token, // Log the full token for debugging
      path: req.path,
      method: req.method,
    });
  }

  if (!token) {
    logger.warn("No token provided for authenticated route", {
      path: req.path,
      method: req.method,
      authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : null,
    });
    return res.status(401).json({
      error: "Access token required",
      message: "No authorization token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    // Normalize common id field variants (id, userId, sub)
    const normalizedId = decoded.id || decoded.userId || decoded.userID || decoded.sub;
    req.user = { ...decoded, id: normalizedId };
    // console.log("Authenticated user:", req.user);
    // Enhanced logging for driver routes
    if (req.path.includes('/driver/')) {
      logger.info("Authentication successful for driver route", {
        path: req.path,
        method: req.method,
        userId: req.user.id,
        userRole: req.user.role,
        tokenValid: true,
      });
    }

    // Debug logging for OAuth routes
    if (req.path.includes("/qbo/oauth/start")) {
      logger.info("JWT token verified successfully", {
        userId: req.user.id,
        userRole: req.user.role,
        path: req.path,
        fullToken: token, // Log the full token for debugging
      });
    }

    next();
  } catch (error) {
    // console.log("Authentication error:", error);
    logger.warn("Invalid JWT token", {
      error: error.message,
      errorName: error.name,
      path: req.path,
      tokenPreview: token ? `${token.substring(0, 50)}...` : null,
      fullToken: token, // Log the full token for debugging
      jwtSecret: config.jwt.secret ? "Present" : "Missing",
    });

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        message: "Access token has expired",
      });
    }

    return res.status(401).json({
      error: "Invalid token",
      message: "Invalid authorization token",
    });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
    } catch (error) {
      logger.debug("Invalid token in optional auth", { error: error.message });
    }
  }

  next();
};

const authenticateRefreshToken = (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      error: "Refresh token required",
      message: "No refresh token provided",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    req.user = decoded;
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    logger.warn("Invalid refresh token", { error: error.message });

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Refresh token expired",
        message: "Refresh token has expired",
      });
    }

    return res.status(401).json({
      error: "Invalid refresh token",
      message: "Invalid refresh token",
    });
  }
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      type: "refresh",
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

const getTokenFromHeader = (req) => {
  const authHeader = req.headers["authorization"];
  return authHeader && authHeader.split(" ")[1];
};

module.exports = {
  authenticateToken,
  authenticate: authenticateToken, // Alias for backward compatibility
  requireAuth: authenticateToken, // Alias for backward compatibility
  optionalAuth,
  authenticateRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  getTokenFromHeader,
};
