// One phone shape for storage, customer lookup, and portalByPhone document ids.
// Hong Kong numbers are stored as 8 digits. A leading 852 / 00852 is removed.
// Other digit strings are kept so a non-HK number still has one stable key.

export function normalizePhone(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("00852")) digits = digits.slice(5);
  else if (digits.startsWith("852") && digits.length === 11) digits = digits.slice(3);
  return digits;
}

// Matches firestore.rules for portalByPhone/{phone} public get.
export function isPortalPhoneKey(phone) {
  return /^[0-9]{8,15}$/.test(String(phone || ""));
}
