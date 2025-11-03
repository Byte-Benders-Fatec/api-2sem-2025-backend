const crypto = require("crypto");

function shuffleString(str) {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

function generateTemporaryPassword(length = 8) {
  const originalCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charset = shuffleString(originalCharset);
  const bytes = crypto.randomBytes(length);
  let tempPassword = "";
  for (let i = 0; i < length; i++) {
    tempPassword += charset[bytes[i] % charset.length];
  }
  return tempPassword;
}

module.exports = { generateTemporaryPassword };
