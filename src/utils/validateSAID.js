/**
 * Validates a South African ID number using the Luhn algorithm.
 * @param {string} id
 * @returns {string|null} error message or null if valid
 */
export function validateSAID(id) {
  if (!id) return null;
  if (id.length !== 13 || !/^\d+$/.test(id)) return 'ID must be exactly 13 digits';

  const month = parseInt(id.substring(2, 4), 10);
  const day = parseInt(id.substring(4, 6), 10);
  if (month < 1 || month > 12) return 'Invalid birth month';
  if (day < 1 || day > 31) return 'Invalid birth day';

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    let digit = parseInt(id[i], 10);
    if (i % 2 !== 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== parseInt(id[12], 10)) return 'Invalid South African ID (Check digit failure)';

  return null;
}
