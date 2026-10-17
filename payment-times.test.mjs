import assert from "node:assert/strict";
import test from "node:test";
import {
  applySlipUpload,
  formatPaymentStamp,
  hkDateTimeLocalValue,
  hkWallToIso,
  proofSummary,
  slipUploadStamp
} from "./payment-times.js";

const AFTERNOON_UTC = new Date("2026-10-17T08:30:00.000Z");
const AFTER_MIDNIGHT_UTC = new Date("2026-10-17T16:30:00.000Z");

test("a slip upload records Hong Kong upload time and does not use the UTC date", () => {
  const stamp = slipUploadStamp(AFTER_MIDNIGHT_UTC);
  assert.equal(stamp.slipUploadedAt, "2026-10-17T16:30:00.000Z");
  assert.equal(stamp.legacyDate, "2026-10-18");
  assert.equal(stamp.receivedLocal, "2026-10-18T00:30");
});

test("uploading a slip keeps an 入數 time the staff already entered", () => {
  const first = applySlipUpload({}, AFTERNOON_UTC);
  assert.equal(first.slipUploadedAt, "2026-10-17T08:30:00.000Z");
  assert.equal(first.receivedAt, "2026-10-17T16:30");

  const again = applySlipUpload({ receivedAt: "2026-10-16T09:15" }, AFTER_MIDNIGHT_UTC);
  assert.equal(again.slipUploadedAt, "2026-10-17T16:30:00.000Z");
  assert.equal(again.receivedAt, "2026-10-16T09:15");
  assert.equal(again.legacyDate, "2026-10-18");
});

test("datetime-local values are saved as the same Hong Kong clock time", () => {
  assert.equal(hkWallToIso("2026-10-17T16:30"), "2026-10-17T08:30:00.000Z");
  assert.equal(hkDateTimeLocalValue("2026-10-17T08:30:00.000Z"), "2026-10-17T16:30");
  assert.equal(formatPaymentStamp("2026-10-17T08:30:00.000Z"), "2026年10月17日 16:30");
  assert.equal(hkWallToIso(""), "");
});

test("older payment strings stay on the calendar day that was written", () => {
  assert.equal(formatPaymentStamp("2026-09-08"), "2026年9月8日");
  assert.equal(formatPaymentStamp("2026-06-21 13:11"), "2026年6月21日 13:11");
  assert.equal(formatPaymentStamp("2026-04-12 21:52"), "2026年4月12日 21:52");
});

test("finance lines name 入數 and 入數紙上傳 without using the slip time as the received time", () => {
  assert.equal(proofSummary({
    depositDate: "2026-05-02",
    balanceDate: "2026-05-18"
  }, ["全數已付"]), "訂金入數紙上傳 2026年5月2日 · 尾數入數紙上傳 2026年5月18日");

  assert.equal(proofSummary({
    depositReceivedAt: "2026-10-17T08:30:00.000Z",
    depositSlipUploadedAt: "2026-10-17T09:05:00.000Z",
    depositDate: "2026-01-01"
  }, ["訂金"]), "入數 2026年10月17日 16:30 · 入數紙上傳 2026年10月17日 17:05");
});
