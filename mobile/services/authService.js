import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.1.151/api';
const TOKEN_KEY = 'wanderwise_token';

async function request(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }

  return data;
}

export async function register({ name, email, password }) {
  const data = await request('/auth/register', { name, email, password });
  if (data.token) {
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
  }
  return data;
}

export async function login({ email, password }) {
  const data = await request('/auth/login', { email, password });
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function logout() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}