// Shared format validators — same patterns used across labController's CSV validation
// and the admin frontend forms, kept in one place so they stay consistent.
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[+\d][\d\s\-().]{6,19}$/;
const PINCODE_REGEX = /^\d{6}$/;

const isValidEmail = (v) => EMAIL_REGEX.test(String(v || '').trim());
const isValidPhone = (v) => PHONE_REGEX.test(String(v || '').trim());
const isValidPincode = (v) => PINCODE_REGEX.test(String(v || '').trim());
const emailDomain = (v) => (String(v || '').split('@')[1] || '').toLowerCase().trim();

module.exports = { EMAIL_REGEX, PHONE_REGEX, PINCODE_REGEX, isValidEmail, isValidPhone, isValidPincode, emailDomain };
