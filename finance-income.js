// Monthly recognized income for the finance center.
// Cash basis: count money already received in the Hong Kong month of its receipt date,
// or the order entry timestamp when no receipt date was stored.

export const HK_TZ = "Asia/Hong_Kong";

function money(value) {
  const n = typeof value === "string" ? Number(String(value).replace(/,/g, "")) : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100) / 100;
}

function addMoney(a, b) {
  return Math.round((a + b) * 100) / 100;
}

function hasExplicitZone(value) {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
}

function monthKeyFromInstant(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HK_TZ,
    year: "numeric",
    month: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) return null;
  return `${year}-${month}`;
}

// Date-only and zoneless "YYYY-MM-DD HH:mm" values are civil dates already written in HK.
// Instants (ISO with Z/offset, Date, Firestore Timestamp) are converted to Asia/Hong_Kong.
export function hkMonthKey(raw) {
  if (raw == null || raw === "") return null;

  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) return null;
    if (!hasExplicitZone(value)) {
      const civil = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/);
      if (civil) {
        const month = Number(civil[2]);
        const day = Number(civil[3]);
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        return `${civil[1]}-${civil[2]}`;
      }
      const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dmy) {
        const month = Number(dmy[2]);
        const day = Number(dmy[1]);
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        return `${dmy[3]}-${String(month).padStart(2, "0")}`;
      }
    }
    const parsed = new Date(value);
    return monthKeyFromInstant(parsed);
  }

  if (raw instanceof Date) return monthKeyFromInstant(raw);
  if (typeof raw === "number") return monthKeyFromInstant(new Date(raw));
  if (typeof raw === "object" && typeof raw.toDate === "function") return monthKeyFromInstant(raw.toDate());
  if (typeof raw === "object" && typeof raw.seconds === "number") return monthKeyFromInstant(new Date(raw.seconds * 1000));
  return null;
}

export function formatHkMonthLabel(key) {
  const [year, month] = String(key).split("-");
  return `${year}年${Number(month)}月`;
}

export function currentHkMonthKey(now = new Date()) {
  return monthKeyFromInstant(now instanceof Date ? now : new Date(now));
}

function paymentStatusOf(order) {
  if (order.paymentStatus) return String(order.paymentStatus).toLowerCase();
  return order.depositPaid ? "deposit" : "unpaid";
}

function presentDate(...values) {
  for (const value of values) {
    if (hkMonthKey(value)) return value;
  }
  return "";
}

function entryTimestamp(order) {
  return presentDate(order.createdAt, order.enteredAt, order.entryDate, order.orderEnteredAt);
}

// Receipt time (depositReceivedAt / balanceReceivedAt), then the legacy payment date.
// Slip upload timestamps are not a receipt month. shootDate is the rare last resort
// when no receipt date and no entry timestamp was stored.
function datedByReceiptOrEntry(order, ...preferred) {
  return presentDate(...preferred, entryTimestamp(order), order.shootDate);
}

// One fully paid order becomes two receipts only when the deposit and the balance
// were recorded in different months. Otherwise the whole paid amount stays in one month.
function recognizedReceipts(order) {
  const price = money(order.price);
  const recordedDeposit = money(order.depositAmount);
  const deposit = price > 0 ? Math.min(recordedDeposit, price) : 0;
  const status = paymentStatusOf(order);

  if (status === "deposit") {
    if (deposit <= 0) return [];
    return [{
      date: datedByReceiptOrEntry(order, order.depositReceivedAt, order.depositDate),
      amount: deposit,
      label: "訂金"
    }];
  }

  if (status !== "full" || price <= 0) return [];

  const balance = addMoney(price, -deposit);
  const depositDate = presentDate(order.depositReceivedAt, order.depositDate);
  const balanceDate = presentDate(order.balanceReceivedAt, order.balanceDate);
  if (deposit > 0 && balance > 0 && depositDate && balanceDate && hkMonthKey(depositDate) !== hkMonthKey(balanceDate)) {
    return [
      { date: depositDate, amount: deposit, label: "訂金" },
      { date: balanceDate, amount: balance, label: "尾數" }
    ];
  }

  const depositCoversAll = deposit >= price && deposit > 0;
  const date = depositCoversAll
    ? datedByReceiptOrEntry(order, depositDate, balanceDate)
    : datedByReceiptOrEntry(order, balanceDate, depositDate);
  return [{ date, amount: price, label: "全數已付" }];
}

function stored(value) {
  return value == null ? "" : value;
}

function orderLine(order) {
  return {
    id: order.id ? String(order.id) : "",
    clientName: order.clientName || "未知客戶",
    petNames: order.petNames || "未填寫",
    pets: Array.isArray(order.pets) ? order.pets : [],
    amount: 0,
    parts: [],
    // Shown on the month list. Slip upload time is not a receipt month.
    proof: {
      depositReceivedAt: stored(order.depositReceivedAt),
      balanceReceivedAt: stored(order.balanceReceivedAt),
      depositSlipUploadedAt: stored(order.depositSlipUploadedAt),
      balanceSlipUploadedAt: stored(order.balanceSlipUploadedAt),
      depositDate: stored(order.depositDate),
      balanceDate: stored(order.balanceDate)
    }
  };
}

export function aggregateMonthlyIncome(orders, now = new Date()) {
  const buckets = new Map();
  let undated = 0;
  const current = currentHkMonthKey(now);

  for (const [index, order] of (orders || []).entries()) {
    const token = order.id ? String(order.id) : `anon-${index}`;
    for (const receipt of recognizedReceipts(order)) {
      const amount = money(receipt.amount);
      if (amount <= 0) continue;
      const key = hkMonthKey(receipt.date);
      if (!key) {
        undated = addMoney(undated, amount);
        continue;
      }
      if (!buckets.has(key)) buckets.set(key, { amount: 0, lines: new Map() });
      const bucket = buckets.get(key);
      bucket.amount = addMoney(bucket.amount, amount);
      if (!bucket.lines.has(token)) bucket.lines.set(token, orderLine(order));
      const line = bucket.lines.get(token);
      line.amount = addMoney(line.amount, amount);
      line.parts.push({ label: receipt.label, amount });
    }
  }

  const rows = [...buckets.entries()]
    .map(([key, bucket]) => ({
      key,
      label: formatHkMonthLabel(key),
      amount: bucket.amount,
      orders: bucket.lines.size,
      current: key === current,
      lines: [...bucket.lines.values()]
    }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));

  const dated = rows.reduce((sum, row) => addMoney(sum, row.amount), 0);
  return { rows, undated, total: addMoney(dated, undated) };
}
