import { api } from './api';

// Account, profile, at settings — parehong endpoints ng web.

export function fetchMe() {
  return api.get('/me');
}

// bio at location lang ang may endpoint sa backend (PUT /api/me/profile).
export function updateProfile({ bio, location }) {
  return api.put('/me/profile', { bio: bio || null, location: location || null });
}

// Data URL ("data:image/jpeg;base64,...") — parehong format ng web.
export function updateAvatar(dataUrl) {
  return api.put('/me/avatar', { avatarBase64: dataUrl }, { timeout: 60000 });
}

export function fetchSettings() {
  return api.get('/me/settings');
}

// Ipadala lang ang mga field na nagbago.
export function updateSettings(changes) {
  return api.put('/me/settings', changes);
}

export async function searchUsers(q) {
  if (!q || !q.trim()) return [];
  const data = await api.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
  return Array.isArray(data) ? data : [];
}

export function fetchPublicProfile(userId) {
  return api.get(`/users/${userId}/public`);
}

export async function fetchHistory() {
  const data = await api.get('/history');
  return Array.isArray(data) ? data : [];
}

// ===== Notifications =====

export async function fetchNotifications() {
  const data = await api.get('/notifications');
  return Array.isArray(data) ? data : [];
}

export function markNotificationRead(id) {
  return api.put(`/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return api.put('/notifications/read-all');
}

export function fullName(person, fallback = '') {
  if (!person) return fallback;
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || fallback;
}

export function initials(person) {
  const name = fullName(person);
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
