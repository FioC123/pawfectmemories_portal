import assert from "node:assert/strict";
import test from "node:test";
import { isPortalPhoneKey, normalizePhone } from "./phone.js";

test("spaces, dashes, and a Hong Kong prefix collapse to 8 digits", () => {
  assert.equal(normalizePhone("9123 4567"), "91234567");
  assert.equal(normalizePhone("9123-4567"), "91234567");
  assert.equal(normalizePhone("+852 9123 4567"), "91234567");
  assert.equal(normalizePhone("85291234567"), "91234567");
  assert.equal(normalizePhone("0085291234567"), "91234567");
  assert.equal(normalizePhone(" 91234567 "), "91234567");
});

test("empty and short values stay non-keys", () => {
  assert.equal(normalizePhone(""), "");
  assert.equal(normalizePhone("abc"), "");
  assert.equal(normalizePhone("1234567"), "1234567");
  assert.equal(isPortalPhoneKey(normalizePhone("1234567")), false);
  assert.equal(isPortalPhoneKey(normalizePhone("91234567")), true);
});

test("a non-HK digit string is kept as one key", () => {
  assert.equal(normalizePhone("+1 (415) 555-0133"), "14155550133");
  assert.equal(isPortalPhoneKey("14155550133"), true);
});
