// Hong Kong wall time for payment slips.
// Upload time and the moment money landed are stored as instants and shown in Asia/Hong_Kong.
// Date-only and zoneless strings already written by the app are civil Hong Kong times, not UTC.

export const HK_TZ = "Asia/Hong_Kong";
const HK_OFFSET_HOURS = 8;

export function toInstant(raw) {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === "number") {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof raw === "object" && typeof raw.toDate === "function") return toInstant(raw.toDate());
  if (typeof raw === "object" && typeof raw.seconds === "number") return toInstant(new Date(raw.seconds * 1000));
  if (typeof raw !== "string") return null;

  const value = raw.trim();
  if (!value) return null;
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const civil = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (civil && !zoned) {
    const date = new Date(Date.UTC(
      Number(civil[1]),
      Number(civil[2]) - 1,
      Number(civil[3]),
      Number(civil[4] || 0) - HK_OFFSET_HOURS,
      Number(civil[5] || 0),
      Number(civil[6] || 0)
    ));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hkParts(raw) {
  const date = toInstant(raw);
  if (!date) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || "";
  let hour = pick("hour");
  if (hour === "24") hour = "00";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour,
    minute: pick("minute")
  };
}

export function formatPaymentStamp(raw) {
  if (typeof raw === "string") {
    const value = raw.trim();
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) return `${dateOnly[1]}年${Number(dateOnly[2])}月${Number(dateOnly[3])}日`;
    const wall = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (wall && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
      return `${wall[1]}年${Number(wall[2])}月${Number(wall[3])}日 ${wall[4]}:${wall[5]}`;
    }
  }
  const parts = hkParts(raw);
  if (!parts) return "";
  return `${parts.year}年${Number(parts.month)}月${Number(parts.day)}日 ${parts.hour}:${parts.minute}`;
}

export function hkDateTimeLocalValue(raw) {
  const parts = hkParts(raw);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function hkDateOnly(raw) {
  const parts = hkParts(raw);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// datetime-local has no timezone. The numbers staff see are Hong Kong wall time.
export function hkWallToIso(wall) {
  const match = String(wall || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return "";
  const date = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]) - HK_OFFSET_HOURS,
    Number(match[5])
  ));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function slipUploadStamp(now = new Date()) {
  return {
    slipUploadedAt: now.toISOString(),
    legacyDate: hkDateOnly(now),
    receivedLocal: hkDateTimeLocalValue(now)
  };
}

// A new slip always records the upload instant. An 入數 time the staff already typed is kept.
export function applySlipUpload(current = {}, now = new Date()) {
  const stamp = slipUploadStamp(now);
  const kept = typeof current.receivedAt === "string" ? current.receivedAt.trim() : "";
  return {
    slipUploadedAt: stamp.slipUploadedAt,
    legacyDate: stamp.legacyDate,
    receivedAt: kept || stamp.receivedLocal
  };
}

function sideBits(side, received, slip, legacy) {
  const receivedText = formatPaymentStamp(received);
  const uploadedText = formatPaymentStamp(slip) || formatPaymentStamp(legacy);
  const bits = [];
  if (receivedText) bits.push(`${side}入數 ${receivedText}`);
  if (uploadedText) bits.push(`${side}入數紙上傳 ${uploadedText}`);
  return bits;
}

// One side reads 「入數」 / 「入數紙上傳」. Both sides are prefixed 訂金 / 尾數.
export function proofSummary(proof = {}, labels = []) {
  const wantDeposit = labels.some((label) => label === "訂金" || label === "全數已付");
  const wantBalance = labels.some((label) => label === "尾數" || label === "全數已付");
  const deposit = wantDeposit
    ? sideBits(wantBalance ? "訂金" : "", proof.depositReceivedAt, proof.depositSlipUploadedAt, proof.depositDate)
    : [];
  const balance = wantBalance
    ? sideBits(wantDeposit ? "尾數" : "", proof.balanceReceivedAt, proof.balanceSlipUploadedAt, proof.balanceDate)
    : [];
  return [...deposit, ...balance].join(" · ");
}
