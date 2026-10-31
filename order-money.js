// Outstanding balance for the workspace, tracker, and finance list.
// A stored deposit of 0 is zero. Only a missing deposit field falls back to half
// the price, and only when the order is already marked as deposit received.
// Unpaid orders still owe the full price.

function money(value) {
  const n = typeof value === "string" ? Number(String(value).replace(/,/g, "")) : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function paymentStatus(order) {
  if (order && order.paymentStatus) return String(order.paymentStatus).toLowerCase();
  return order && order.depositPaid ? "deposit" : "unpaid";
}

export function depositWasStored(order) {
  return !!order && order.depositAmount != null && order.depositAmount !== "";
}

export function recordedDeposit(order) {
  const price = Math.max(0, money(order && order.price));
  if (!depositWasStored(order)) return Math.floor(price / 2);
  return Math.max(0, money(order.depositAmount));
}

export function balanceDue(order) {
  const price = Math.max(0, money(order && order.price));
  const status = paymentStatus(order || {});
  if (status === "full") return 0;
  if (status === "unpaid") return price;
  const deposit = depositWasStored(order) ? Math.max(0, money(order.depositAmount)) : Math.floor(price / 2);
  return Math.max(0, money(price - deposit));
}
