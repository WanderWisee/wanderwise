import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { journalEntryHasContent, journalEntriesMissingPhotos } from '../utils/journalValidation.js';

test('journal validation protects text, ratings and tips without treating blank entries as content', () => {
  const entries = [
    { id: 'blank', placeName: ' ', description: '', rating: 0, pros: [], cons: [] },
    { id: 'story', description: 'Keep this story' },
    { id: 'rating', rating: 4 },
    { id: 'tip', prosInput: 'Bring water' },
    { id: 'con', cons: ['Long queues'] },
    { id: 'ready', photoUri: 'file:///photo.jpg', description: 'Ready to publish' },
  ];
  assert.equal(journalEntryHasContent(entries[0]), false);
  assert.deepEqual(journalEntriesMissingPhotos(entries).map((entry) => entry.id), ['story', 'rating', 'tip', 'con']);
  assert.equal(entries[1].description, 'Keep this story');
});

// Load the real request implementation with in-memory storage/config adapters.
const source = (await readFile(new URL('../services/api.js', import.meta.url), 'utf8'))
  .replace("import AsyncStorage from '@react-native-async-storage/async-storage';", 'const AsyncStorage = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };')
  .replace("import { API_URL, STORAGE_KEYS } from '../constants/config';", "const API_URL = 'http://test.invalid/api'; const STORAGE_KEYS = { token: 'test' };");
const { request } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('API timeout covers a stalled response body after headers arrive', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, { signal }) => ({
    text: () => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')), { once: true });
    }),
  });
  try {
    await assert.rejects(request('/slow-body', { auth: false, timeout: 10 }), (error) => error.status === 0 && /too long/.test(error.message));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('API reports connection loss during response body reading consistently', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ text: async () => { throw new TypeError('Connection lost'); } });
  try {
    await assert.rejects(request('/broken-body', { auth: false }), (error) => error.status === 0 && /Can't reach/.test(error.message));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
