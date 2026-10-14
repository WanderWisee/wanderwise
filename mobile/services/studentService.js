import { api } from './api';

export const fetchClasses = () => api.get('/classes/mine');
export const joinClass = (code) => api.post('/classes/join', { code: code.trim().toUpperCase() });
export const fetchClass = (id) => api.get(`/classes/${id}`);
export const fetchClassAnnouncements = (id) => api.get(`/classes/${id}/announcements`);
export const fetchTourDay = (id, date) => api.get(`/trips/${id}/tour?date=${encodeURIComponent(date)}`);
export const saveMeetingPoint = (id, body) => api.put(`/trips/${id}/tour/day`, body);
export const checkIn = (id, body) => api.post(`/trips/${id}/tour/checkin`, body, { timeout: 60000 });
export const markAttendance = (id, body) => api.put(`/trips/${id}/tour/attendance`, body);
export const postAnnouncement = (id, message) => api.post(`/trips/${id}/tour/announcements`, { message });
export const deleteAnnouncement = (id, item) => api.del(`/trips/${id}/tour/announcements/${item}`);
export const createActivity = (id, body) => api.post(`/trips/${id}/tour/activities`, body);
export const deleteActivity = (id, item) => api.del(`/trips/${id}/tour/activities/${item}`);
