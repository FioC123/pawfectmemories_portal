// Booking totals for packages that already include studio rental.
// studioLimit (設定裡的「包底租金上限」) is inside the package price.
// extraStudioFee is only the amount above that allowance. It is not the full rent,
// and it must not be typed again into 附加費項目金額.

export const EXTRA_PAX_RATE = 300;

export function amount(value) {
  const n = typeof value === "string" ? Number(String(value).replace(/,/g, "")) : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function includedStudioLimit(pkg) {
  return Math.max(0, amount(pkg && pkg.studioLimit));
}

export function packageIncludesStudio(pkg) {
  return includedStudioLimit(pkg) > 0;
}

export function packageOptionLabel(pkg) {
  const name = pkg && pkg.name ? pkg.name : "套餐";
  const price = amount(pkg && pkg.price);
  const limit = includedStudioLimit(pkg);
  if (limit > 0) return `${name} (HK$ ${price} · 已包租金 ${limit})`;
  return `${name} (HK$ ${price})`;
}

// Staff enter only the overage. The included rental is never added on top of the package.
export function quoteBooking(input = {}) {
  const packagePrice = Math.max(0, amount(input.packagePrice));
  const extraStudioFee = Math.max(0, amount(input.extraStudioFee));
  const manualOtherFee = amount(input.manualOtherFee);
  const extraPaxCount = Math.max(0, Math.floor(Number(input.extraPaxCount) || 0));
  const extraPaxCost = extraPaxCount * EXTRA_PAX_RATE;
  const discount = Math.max(0, amount(input.discount));
  const includedStudio = Math.max(0, amount(input.studioLimit));
  const otherFee = round2(extraStudioFee + extraPaxCost + manualOtherFee);
  const total = Math.max(0, round2(packagePrice + extraStudioFee + manualOtherFee + extraPaxCost - discount));
  return {
    packagePrice,
    includedStudio,
    extraStudioFee,
    manualOtherFee,
    extraPaxCount,
    extraPaxCost,
    discount,
    otherFee,
    total
  };
}

function hasAmount(value) {
  return value != null && value !== "";
}

// Older bookings stored the full studio rent in actualStudioCost.
// Convert that to the overage so the included HK$1500 is not charged again.
export function extraStudioFromOrder(order, pkg) {
  if (order && hasAmount(order.extraStudioFee)) return Math.max(0, amount(order.extraStudioFee));
  if (order && hasAmount(order.actualStudioCost)) {
    const actual = amount(order.actualStudioCost);
    const limit = includedStudioLimit(pkg);
    if (limit > 0) return Math.max(0, round2(actual - limit));
    return Math.max(0, actual);
  }
  return 0;
}

// Receipt line for studio rent above the included allowance.
// A stored extraStudioFee of 0 stays 0. Orders from before the field existed
// still recover the overage from otherFee minus pax and other surcharges.
export function studioTopUpForReceipt(order = {}) {
  if (hasAmount(order.extraStudioFee)) return Math.max(0, amount(order.extraStudioFee));
  const extraPaxCost = Math.max(0, Math.floor(Number(order.extraPaxCount) || 0)) * EXTRA_PAX_RATE;
  const manual = amount(order.manualOtherFee);
  const remainder = round2(amount(order.otherFee) - extraPaxCost - manual);
  return remainder > 0 ? remainder : 0;
}
