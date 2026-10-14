import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '../constants/config';

const DEFAULT_TIMEOUT_MS = 15000;

let tokenCache;
const unauthorizedListeners = new Set();

export async function getToken() {
  if (tokenCache === undefined) {
    try {
      tokenCache =
        (await AsyncStorage.getItem(STORAGE_KEYS.token)) ||
        null;
    } catch {
      tokenCache = null;
    }
  }

  return tokenCache;
}

export async function setToken(token) {
  tokenCache = token || null;

  try {
    if (token) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.token,
        token
      );
    } else {
      await AsyncStorage.removeItem(
        STORAGE_KEYS.token
      );
    }
  } catch {
    // The current session can still work without persistent storage.
  }
}

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);

  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function messageFrom(data, status) {
  if (data && typeof data === 'object') {
    if (data.error) return data.error;
    if (data.message) return data.message;
    if (data.title) return data.title;
  }

  if (
    typeof data === 'string' &&
    data.trim() &&
    data.length < 200
  ) {
    return data;
  }

  if (status === 404) {
    return 'Not found.';
  }

  if (status >= 500) {
    return 'The server ran into a problem. Please try again.';
  }

  return 'Something went wrong. Please try again.';
}

export async function request(
  path,
  {
    method = 'GET',
    body,
    auth = true,
    timeout = DEFAULT_TIMEOUT_MS,
  } = {}
) {
  const headers = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const requestToken = auth
    ? await getToken()
    : null;

  if (requestToken) {
    headers.Authorization = `Bearer ${requestToken}`;
  }

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeout
  );

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';

    throw new ApiError(
      timedOut
        ? 'The server took too long to answer. Check your connection and try again.'
        : "Can't reach the WanderWise server. Make sure you're online and the backend is running.",
      0,
      null
    );
  } finally {
    clearTimeout(timer);
  }

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const currentToken = await getToken();

    if (
      response.status === 401 &&
      auth &&
      requestToken &&
      currentToken === requestToken
    ) {
      await setToken(null);

      unauthorizedListeners.forEach((listener) => {
        try {
          listener();
        } catch {
          // One listener must not interrupt the others.
        }
      });
    }

    throw new ApiError(
      messageFrom(data, response.status),
      response.status,
      data
    );
  }

  return data;
}

export const api = {
  get: (path, options) =>
    request(path, {
      ...options,
      method: 'GET',
    }),

  post: (path, body, options) =>
    request(path, {
      ...options,
      method: 'POST',
      body: body ?? {},
    }),

  put: (path, body, options) =>
    request(path, {
      ...options,
      method: 'PUT',
      body: body ?? {},
    }),

  del: (path, options) =>
    request(path, {
      ...options,
      method: 'DELETE',
    }),
};