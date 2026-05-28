/**
 * Raised when the backend reports a task does not exist (HTTP 404).
 */
export class NotFoundError extends Error {
  constructor(message = 'Task not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Raised when the backend rejects a request as invalid (HTTP 400). Carries the
 * backend's `errors` list (RFC-7807 body) as raw `"field: message"` strings so
 * the form layer can map them back onto the corresponding fields.
 */
export class ValidationApiError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super('The backend rejected the request as invalid');
    this.name = 'ValidationApiError';
    this.errors = errors;
  }
}

/**
 * Raised for any other non-2xx response or a network/transport failure. Carries
 * no internal detail so nothing sensitive leaks to the user.
 */
export class ApiError extends Error {
  constructor(message = 'The service is currently unavailable') {
    super(message);
    this.name = 'ApiError';
  }
}
