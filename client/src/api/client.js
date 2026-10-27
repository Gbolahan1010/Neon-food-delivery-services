/**
 * One small wrapper around fetch for every call to our API.
 * - Same-origin requests to /api, so the httpOnly login cookie is sent automatically.
 * - Always sends and reads JSON.
 * - Turns the API's { success: false, message, errors } replies into an ApiError.
 */
export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  /** Field errors as { email: 'Enter a valid email address', ... } for showing under inputs. */
  get fieldErrors() {
    return Object.fromEntries(this.errors.map((e) => [e.field, e.message]));
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Render's free plan can reply with an HTML page while the API wakes up.
  }

  if (!response.ok || !payload || payload.success === false) {
    const message =
      payload?.message ||
      (response.status >= 500
        ? 'The server is starting up or busy. Please try again in a moment.'
        : 'Something went wrong. Please try again.');
    throw new ApiError(message, response.status, payload?.errors);
  }
  return payload;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
