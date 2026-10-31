const mongoose = require("mongoose");
const config = require("../config");
const logger = require("../utils/logger");

class Database {
  constructor() {
    this.connection = null;
  }

  getMongoUri() {
    // Use test database if running tests
    if (process.env.NODE_ENV === 'test' && process.env.MONGODB_URI_TEST) {
      return process.env.MONGODB_URI_TEST;
    }
    // Otherwise use main database
    return process.env.MONGODB_URI;
  }

  maskUri(uri) {
    if (!uri || typeof uri !== "string") return "<empty>";
    try {
      // Do not log credentials
      const u = new URL(uri.replace(/^mongodb\+srv:\/\//, "https://").replace(/^mongodb:\/\//, "https://"));
      const host = u.host;
      const db = u.pathname?.replace(/^\//, "") || "";
      return `mongodb://${host}/${db}`;
    } catch {
      // Fallback basic masking of userinfo between // and @
      return uri.replace(/(\/+)([^@\/]+)@/, "$1***:***@");
    }
  }

  normalizeMongoUri(raw) {
    if (!raw) return null;
    // Normalize whitespace and strip surrounding quotes if present
    let value = String(raw).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // If someone pasted a full ".env" line (e.g., "MONGODB_URI=mongodb+srv://...")
    // extract just the URL part. Otherwise, return as-is.
    const match = value.match(/(mongodb(?:\+srv)?:\/\/[^\s]+)/i);
    if (match) return match[1];
    return value;
  }

  async connect() {
    try {
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      const uriRaw = this.getMongoUri();
      if (!uriRaw) {
        const hint = "Missing MongoDB connection string. Set MONGODB_URI in Render environment variables.";
        logger.error(hint);
        throw new Error(hint);
      }

      const uri = this.normalizeMongoUri(uriRaw);
      if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
        const hint = "Invalid MongoDB URI scheme. MONGODB_URI must start with 'mongodb://' or 'mongodb+srv://'.";
        logger.error(hint, { provided: uriRaw });
        throw new Error(hint);
      }

      logger.info("Connecting to MongoDB", { uri: this.maskUri(uri) });
      this.connection = await mongoose.connect(uri, options);

      logger.info("MongoDB connected successfully");
      mongoose.connection.on("error", (err) => {
        console.log(err);
        logger.error("MongoDB connection error:", err);
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("MongoDB reconnected");
      });

      process.on("SIGINT", this.close.bind(this));
      process.on("SIGTERM", this.close.bind(this));

      return this.connection;
    } catch (error) {
      console.log(error);
      logger.error("Failed to connect to MongoDB:", {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        reason: error?.reason?.message,
      });
      throw error;
    }
  }

  async close() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed");
      }
    } catch (error) {
      logger.error("Error closing MongoDB connection:", error);
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = new Database();
