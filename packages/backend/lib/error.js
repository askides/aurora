export class ApiError extends Error {
  constructor(statusCode = 500, message = "Internal server error") {
    super(message);
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  constructor(statusCode = 422, message = "Unprocessable Entity") {
    super(message);
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends Error {
  constructor(statusCode = 401, message = "Unauthorized") {
    super(message);
    this.statusCode = statusCode;
  }
}
