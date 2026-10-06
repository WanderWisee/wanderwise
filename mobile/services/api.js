import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '../constants/config';

// Iisang pinto papunta sa backend. Lahat ng service file ay dito dumadaan,
// kaya iisa ang paghawak ng token, timeout, at mga error.

const DEFAULT_TIMEOUT_MS = 15000;

let tokenCache; // undefined = hindi pa nababasa sa storage
const unauthorizedListeners = new Set();

export async function getToken() {
  if (tokenCache === undefined) {
    try {
      tokenCache = (await AsyncStorage.getItem(STORAGE_KEYS.token)) || null;
    } catch {
      tokenCache = null;
    }
  }
  return tokenCache;
}

export async function setToken(token) {
  tokenCache = token || null;
  try {
    if (token) await AsyncStorage.setItem(STORAGE_KEYS.token, token);
    else await AsyncStorage.removeItem(STORAGE_KEYS.token);
  } catch {
    // Kahit hindi ma-save, gagana pa rin ang session hanggang isara ang app.
  }
}

// Tinatawag kapag nag-expire o naging invalid ang token (401), para
// maibalik ng app ang user sa Login.
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
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
    if (data.title) return data.title; // ASP.NET ProblemDetails
  }
  if (typeof data === 'string' && data.trim() && data.length < 200) return data;
  if (status === 404) return 'Not found.';
  if (status >= 500) return 'The server ran into a problem. Please try again.';
  return 'Something went wrong. Please try again.';
}

/**
 * request('/trips', { method: 'POST', body: {...} })
 * - Kusang naglalagay ng Authorization header kapag may token.
 * - Ibinabalik ang JSON (o null kapag 204 / walang laman).
 * - Nagtatapon ng ApiError na may .status kapag hindi ok.
 */
export async function request(path, { method = 'GET', body, auth = true, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = err && err.name === 'AbortError';
    throw new ApiError(
      timedOut
        ? "The server took too long to answer. Check your connection and try again."
        : "Can't reach the WanderWise server. Make sure you're online and the backend is running.",
      0,
      null
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      await setToken(null);
      unauthorizedListeners.forEach((fn) => {
        try {
          fn();
        } catch {
          // walang dapat makasira sa ibang listener
        }
      });
    }
    throw new ApiError(messageFrom(data, res.status), res.status, data);
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body: body ?? {} }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body: body ?? {} }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};
