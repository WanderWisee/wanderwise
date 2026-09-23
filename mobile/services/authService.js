import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.1.151:3001/api'; // TODO: palitan ng totoong IP
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

export async function register({ studentNumber, dob, cellphone, password }) {
  const data = await request('/register', { studentNumber, dob, cellphone, password });
  if (data.token) {
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
  }
  return data;
}

export async function login({ studentNumber, password }) {
  const data = await request('/login', { studentNumber, password });
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function logout() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}