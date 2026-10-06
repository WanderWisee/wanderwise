import { api } from './api';

// Journal = "travel stories". Ito rin ang laman ng Guides tab, gaya sa web:
// lahat ng journal post ng mga estudyante, naka-grupo kada lugar.

// Ginagawang mas simpleng hugis ang sagot ng server:
// { id, title, coverImage, createdAt, entries: [{ place, img, rating, description, pros[], cons[], hotels[] }] }
export function normalizeJournalEntry(serverEntry) {
  if (!serverEntry) return null;
  return {
    id: serverEntry.id,
    userId: serverEntry.userId,
    title: serverEntry.title,
    coverImage: serverEntry.coverImage,
    createdAt: serverEntry.createdAt,
    entries: (serverEntry.places || [])
      .slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((p) => ({
        id: p.id,
        place: p.placeName,
        img: p.imageUrl,
        rating: p.rating,
        description: p.description,
        pros: (p.pros || []).map((x) => x.text),
        cons: (p.cons || []).map((x) => x.text),
        hotels: (p.hotels || []).map((h) => ({ id: h.id, name: h.name, description: h.description })),
      })),
  };
}

export async function fetchMyJournal() {
  const data = await api.get('/journal');
  return (Array.isArray(data) ? data : []).map(normalizeJournalEntry);
}

// Gumagana sa sarili at sa journal ng ibang estudyante (read-only).
export async function fetchJournalEntry(id) {
  const data = await api.get(`/journal/${id}/public`);
  return normalizeJournalEntry(data);
}

export async function fetchJournalFeed({ q, limit } = {}) {
  const params = [];
  if (q) params.push(`q=${encodeURIComponent(q)}`);
  if (limit) params.push(`limit=${limit}`);
  const data = await api.get(`/journal/feed${params.length ? `?${params.join('&')}` : ''}`);
  return Array.isArray(data) ? data : [];
}

// payload: { title, coverImage, places: [{ placeName, imageUrl, rating, description, sortOrder, pros[], cons[], hotels[{name, description}] }] }
export function createJournalEntry(payload) {
  return api.post('/journal', payload, { timeout: 90000 });
}

export function deleteJournalEntry(id) {
  return api.del(`/journal/${id}`);
}

export async function fetchComments(id) {
  const data = await api.get(`/journal/${id}/comments`);
  return Array.isArray(data) ? data : [];
}

export function addComment(id, text) {
  return api.post(`/journal/${id}/comments`, { text });
}

// "El Nido, Palawan Travel Story" -> "El Nido, Palawan"
export function bareTitle(title) {
  return String(title || '').replace(/ Travel \w+$/i, '').trim();
}
