class NotImplementedError extends Error {
  constructor(message = "This method is not implemented yet") {
    super(message);
    this.name = "NotImplementedError";
    this.statusCode = 501;
  }
}

class ValidationError extends Error {
  constructor(message = "Validation failed") {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
    this.statusCode = 401;
  }
}

class AuthorizationError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

class ConflictError extends Error {
  constructor(message = "Resource conflict") {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
  }
}

class SyncConflictError extends Error {
  constructor(message = "Sync conflict detected", conflicts = []) {
    super(message);
    this.name = "SyncConflictError";
    this.statusCode = 409;
    this.conflicts = conflicts;
  }
}

module.exports = {
  NotImplementedError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  SyncConflictError,
};
