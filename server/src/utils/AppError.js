/**
 * An expected, "operational" error with an HTTP status code.
 * Throw these from services; the global error handler turns them into JSON responses.
 * The static methods are small factory methods so call sites read clearly:
 *   throw AppError.notFound('Restaurant not found');
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }

  static badRequest(message = 'Bad request', errors) {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message = 'Please log in to continue') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'You do not have permission to do this') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Not found') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Conflict') {
    return new AppError(message, 409);
  }
}

module.exports = AppError;
