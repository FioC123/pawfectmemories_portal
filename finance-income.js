// Monthly recognized income for the finance center.
// Cash basis: count money already received, and put it in the Hong Kong calendar month it arrived.

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

// One fully paid order becomes two receipts only when the deposit and the balance
// were received in different months. Otherwise the whole paid amount stays in one month.
function recognizedReceipts(order) {
  const price = money(order.price);
  const recordedDeposit = money(order.depositAmount);
  const deposit = price > 0 ? Math.min(recordedDeposit, price) : 0;
  const status = paymentStatusOf(order);

  if (status === "deposit") {
    if (deposit <= 0) return [];
    return [{ date: order.depositDate || order.shootDate || "", amount: deposit }];
  }

  if (status !== "full" || price <= 0) return [];

  const balance = addMoney(price, -deposit);
  const depositMonth = hkMonthKey(order.depositDate);
  const balanceMonth = hkMonthKey(order.balanceDate);
  if (deposit > 0 && balance > 0 && depositMonth && balanceMonth && depositMonth !== balanceMonth) {
    return [
      { date: order.depositDate, amount: deposit },
      { date: order.balanceDate, amount: balance }
    ];
  }

  const depositCoversAll = deposit >= price;
  const date = (depositCoversAll && order.depositDate)
    ? order.depositDate
    : (order.balanceDate || order.depositDate || order.shootDate || "");
  return [{ date, amount: price }];
}

export function aggregateMonthlyIncome(orders, now = new Date()) {
  const buckets = new Map();
  let undated = 0;
  const current = currentHkMonthKey(now);

  for (const order of orders || []) {
    const touched = new Set();
    for (const receipt of recognizedReceipts(order)) {
      const amount = money(receipt.amount);
      if (amount <= 0) continue;
      const key = hkMonthKey(receipt.date);
      if (!key) {
        undated = addMoney(undated, amount);
        continue;
      }
      if (!buckets.has(key)) buckets.set(key, { amount: 0, orders: 0 });
      const bucket = buckets.get(key);
      bucket.amount = addMoney(bucket.amount, amount);
      if (!touched.has(key)) {
        touched.add(key);
        bucket.orders += 1;
      }
    }
  }

  const rows = [...buckets.entries()]
    .map(([key, bucket]) => ({
      key,
      label: formatHkMonthLabel(key),
      amount: bucket.amount,
      orders: bucket.orders,
      current: key === current
    }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));

  const dated = rows.reduce((sum, row) => addMoney(sum, row.amount), 0);
  return { rows, undated, total: addMoney(dated, undated) };
}
