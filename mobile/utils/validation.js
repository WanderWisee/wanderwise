// Mga pagsusuri sa Sign up / Log in / Forgot password — pareho sa web
// (web/src/utils/validation.js). Sinusuri ulit ito ng backend.

const LETTERS = 'A-Za-zÀ-ÖØ-öø-ÿ';
export const NAME_RE = new RegExp(`^[${LETTERS}][${LETTERS} .'-]{0,49}$`);
const NOT_NAME_CHARS = new RegExp(`[^${LETTERS} .'-]`, 'g');

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const STUDENT_EMAIL_RE = /^[^@\s]+@student\.mseuf\.edu\.ph$/i;
// 11 digits na nagsisimula sa 09 (hal. 09171234567)
export const PH_MOBILE_RE = /^09\d{9}$/;

export const keepNameChars = (value) => value.replace(NOT_NAME_CHARS, '').replace(/\s{2,}/g, ' ').slice(0, 50);
export const keepDigits = (value, max = 11) => value.replace(/\D/g, '').slice(0, max);
export const keepEmail = (value) => value.replace(/\s/g, '').slice(0, 120);

// Pinakabatang edad: 13. Pinakamatandang taon: 1920.
export function dobBounds() {
  const today = new Date();
  const max = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
  return { min: new Date(1920, 0, 1), max };
}

// Date -> "MM/DD/YYYY" (format na ipinapadala sa backend)
export function toMdy(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(date.getMonth() + 1)}/${p(date.getDate())}/${date.getFullYear()}`;
}

export function fromMdy(text) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text || '');
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return d.getMonth() === Number(m[1]) - 1 ? d : null;
}

export function passwordProblem(pw) {
  if (!pw || pw.length < 8) return 'registerErrPasswordLength';
  if (pw.length > 100) return 'valPasswordLong';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'valPasswordMix';
  return '';
}

export function dobProblem(text) {
  const d = fromMdy(text);
  if (!d) return 'valDobInvalid';
  const { min, max } = dobBounds();
  if (d < min) return 'valDobInvalid';
  if (d > new Date()) return 'valDobFuture';
  if (d > max) return 'valDobAge';
  return '';
}

// Ibinabalik ang { field: translationKey } ng mga kailangang ayusin.
export function registrationErrors(form) {
  const e = {};
  const v = (x) => (x || '').trim();
  if (!v(form.firstName)) e.firstName = 'valRequired';
  else if (!NAME_RE.test(v(form.firstName))) e.firstName = 'valName';
  if (!v(form.lastName)) e.lastName = 'valRequired';
  else if (!NAME_RE.test(v(form.lastName))) e.lastName = 'valName';

  const school = v(form.schoolEmail);
  if (!school) e.schoolEmail = 'valRequired';
  else if (!STUDENT_EMAIL_RE.test(school)) e.schoolEmail = 'registerErrSchoolEmail';

  const recovery = v(form.recoveryEmail);
  if (!recovery) e.recoveryEmail = 'valRequired';
  else if (!EMAIL_RE.test(recovery)) e.recoveryEmail = 'valEmail';
  else if (recovery.toLowerCase() === school.toLowerCase()) e.recoveryEmail = 'valRecoverySame';

  if (!form.dob) e.dob = 'valRequired';
  else {
    const dob = dobProblem(form.dob);
    if (dob) e.dob = dob;
  }

  if (!form.cellphone) e.cellphone = 'valRequired';
  else if (!PH_MOBILE_RE.test(form.cellphone)) e.cellphone = 'valPhone';

  const pw = passwordProblem(form.password);
  if (pw) e.password = pw;
  if (!form.confirmPassword) e.confirmPassword = 'valRequired';
  else if (form.password !== form.confirmPassword) e.confirmPassword = 'registerErrPasswordMismatch';
  return e;
}
