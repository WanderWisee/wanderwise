import { api, getToken as readToken, setToken } from './api';

// Parehong mga endpoint na gamit ng web (AuthController.cs).
// Ang login ay gamit ang school email (@student.mseuf.edu.ph), hindi
// student number — ang student number ay kinukuha ng backend mula sa email.

export const SCHOOL_EMAIL_REGEX = /^[^@\s]+@student\.mseuf\.edu\.ph$/i;

export async function login({ email, password }) {
  const data = await api.post('/login', { email: email.trim(), password }, { auth: false });
  await setToken(data.token);
  return data;
}

// Hakbang 1 ng pag-register: magpapadala ang backend ng code sa recovery email.
export function sendRegisterOtp({ schoolEmail, recoveryEmail }) {
  return api.post(
    '/register/send-otp',
    { schoolEmail: schoolEmail.trim(), recoveryEmail: recoveryEmail.trim() },
    { auth: false, timeout: 30000 }
  );
}

// Hakbang 2: buuin ang account gamit ang code.
// dob: "YYYY-MM-DD" (tinatanggap din ng backend ang ibang format)
export async function register(form) {
  const data = await api.post(
    '/register',
    {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      schoolEmail: form.schoolEmail.trim(),
      recoveryEmail: form.recoveryEmail.trim(),
      dob: form.dob,
      cellphone: form.cellphone.trim(),
      password: form.password,
      otpCode: form.otpCode.trim(),
    },
    { auth: false }
  );
  if (data && data.token) await setToken(data.token);
  return data;
}

export function sendForgotPasswordOtp(schoolEmail) {
  return api.post('/forgot-password/send-otp', { schoolEmail: schoolEmail.trim() }, { auth: false, timeout: 30000 });
}

export function resetPassword({ schoolEmail, otpCode, newPassword }) {
  return api.post(
    '/forgot-password/reset',
    { schoolEmail: schoolEmail.trim(), otpCode: otpCode.trim(), newPassword },
    { auth: false }
  );
}

export async function logout() {
  await setToken(null);
}

export function getToken() {
  return readToken();
}
