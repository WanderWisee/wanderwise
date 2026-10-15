// Shared form checks for the sign-up, log in and password pages.
// The backend checks the same rules again, so these are for quick,
// friendly messages before anything is sent.

const LETTERS = "A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF";
export const NAME_RE = new RegExp(`^[${LETTERS}][${LETTERS} .'-]{0,49}$`);
const NOT_NAME_CHARS = new RegExp(`[^${LETTERS} .'-]`, "g");

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const STUDENT_EMAIL_RE = /^[^@\s]+@student\.mseuf\.edu\.ph$/i;
export const TEACHER_EMAIL_RE = /^[^@\s]+@mseuf\.edu\.ph$/i;
// Philippine mobile number: 11 digits starting with 09 (e.g. 09171234567).
export const PH_MOBILE_RE = /^09\d{9}$/;
export const EMPLOYEE_ID_RE = /^[A-Za-z0-9-]{3,20}$/;

// Input filters: run on every keystroke so a field can't hold bad characters.
export const keepNameChars = (value) => value.replace(NOT_NAME_CHARS, "").replace(/\s{2,}/g, " ").slice(0, 50);
export const keepDigits = (value, max = 11) => value.replace(/\D/g, "").slice(0, max);
export const keepEmployeeId = (value) => value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase().slice(0, 20);
export const keepEmail = (value) => value.replace(/\s/g, "").slice(0, 120);

function isoDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Birthday limits for the calendar: at least 13 years old, born 1920 or later.
export function dobLimits() {
  const max = new Date();
  max.setFullYear(max.getFullYear() - 13);
  return { min: "1920-01-01", max: isoDate(max) };
}

// Returns a translation key when something is wrong, or "" when it's fine.
export function passwordProblem(pw) {
  if (!pw || pw.length < 8) return "registerErrPasswordLength";
  if (pw.length > 100) return "valPasswordLong";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "valPasswordMix";
  return "";
}

export function dobProblem(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "valDobInvalid";
  const { min, max } = dobLimits();
  if (iso < min) return "valDobInvalid";
  if (iso > isoDate(new Date())) return "valDobFuture";
  if (iso > max) return "valDobAge";
  return "";
}

// Checks every sign-up field. Returns { field: translationKey } for the
// fields that need fixing (empty object = all good).
export function registrationErrors(form, { teacher = false } = {}) {
  const e = {};
  const name = (v) => (v || "").trim();
  if (!name(form.firstName)) e.firstName = "valRequired";
  else if (!NAME_RE.test(name(form.firstName))) e.firstName = "valName";
  if (!name(form.lastName)) e.lastName = "valRequired";
  else if (!NAME_RE.test(name(form.lastName))) e.lastName = "valName";

  if (teacher) {
    if (!name(form.employeeId)) e.employeeId = "valRequired";
    else if (!EMPLOYEE_ID_RE.test(name(form.employeeId))) e.employeeId = "valEmployeeId";
  }

  const school = name(form.schoolEmail);
  if (!school) e.schoolEmail = "valRequired";
  else if (!(teacher ? TEACHER_EMAIL_RE : STUDENT_EMAIL_RE).test(school))
    e.schoolEmail = teacher ? "teacherErrEmail" : "registerErrSchoolEmail";

  const recovery = name(form.recoveryEmail);
  if (!recovery) e.recoveryEmail = "valRequired";
  else if (!EMAIL_RE.test(recovery)) e.recoveryEmail = "valEmail";
  else if (recovery.toLowerCase() === school.toLowerCase()) e.recoveryEmail = "valRecoverySame";

  if (!form.dob) e.dob = "valRequired";
  else {
    const dob = dobProblem(form.dob);
    if (dob) e.dob = dob;
  }

  if (!form.cellphone) e.cellphone = "valRequired";
  else if (!PH_MOBILE_RE.test(form.cellphone)) e.cellphone = "valPhone";

  const pw = passwordProblem(form.password);
  if (pw) e.password = pw;
  if (!form.confirmPassword) e.confirmPassword = "valRequired";
  else if (form.password !== form.confirmPassword) e.confirmPassword = "registerErrPasswordMismatch";
  return e;
}
