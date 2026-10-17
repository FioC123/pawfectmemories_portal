import assert from "node:assert/strict";
import test from "node:test";
import {
  extraStudioFromOrder,
  packageOptionLabel,
  quoteBooking,
  studioTopUpForReceipt
} from "./booking-finance.js";

const studio = { name: "Pawfect Studio", price: 3888, studioLimit: 1500 };
const signature = { name: "Pawfect Signature", price: 4888, studioLimit: 1500 };
const outdoor = { name: "Pawfect Outdoor", price: 2788, studioLimit: 0 };

test("included studio rental stays inside the package price", () => {
  const quote = quoteBooking({
    packagePrice: studio.price,
    studioLimit: studio.studioLimit,
    extraStudioFee: 0,
    manualOtherFee: 0,
    extraPaxCount: 0,
    discount: 0
  });
  assert.equal(quote.includedStudio, 1500);
  assert.equal(quote.extraStudioFee, 0);
  assert.equal(quote.otherFee, 0);
  assert.equal(quote.total, 3888);
});

test("only the amount over the included rental is added", () => {
  const quote = quoteBooking({
    packagePrice: signature.price,
    studioLimit: signature.studioLimit,
    extraStudioFee: 500,
    manualOtherFee: 200,
    discount: 100
  });
  assert.equal(quote.total, 4888 + 500 + 200 - 100);
  assert.equal(quote.otherFee, 700);
});

test("packages without included rental keep extras as add-ons and do not assume 1500", () => {
  const quote = quoteBooking({
    packagePrice: outdoor.price,
    studioLimit: 0,
    extraStudioFee: 800,
    manualOtherFee: 0,
    extraPaxCount: 1,
    discount: 300
  });
  assert.equal(quote.includedStudio, 0);
  assert.equal(quote.extraPaxCost, 300);
  assert.equal(quote.total, 2788 + 800 + 300 - 300);
  assert.equal(quote.otherFee, 1100);
});

test("blank fee inputs do not change the package price", () => {
  const quote = quoteBooking({ packagePrice: "3888", studioLimit: "1500", extraStudioFee: "", manualOtherFee: "", discount: "" });
  assert.equal(quote.total, 3888);
  assert.equal(quote.extraStudioFee, 0);
});

test("a full historical studio cost is converted to the overage only", () => {
  assert.equal(extraStudioFromOrder({ actualStudioCost: 2000 }, studio), 500);
  assert.equal(extraStudioFromOrder({ actualStudioCost: 1500 }, studio), 0);
  assert.equal(extraStudioFromOrder({ actualStudioCost: 800 }, outdoor), 800);
  assert.equal(extraStudioFromOrder({ extraStudioFee: 500, actualStudioCost: 2000 }, studio), 500);
  assert.equal(extraStudioFromOrder({ extraStudioFee: 0, actualStudioCost: 2000 }, studio), 0);
});

test("receipt uses the stored overage and falls back for older orders", () => {
  assert.equal(studioTopUpForReceipt({ extraStudioFee: 500, otherFee: 9999, manualOtherFee: 0 }), 500);
  assert.equal(studioTopUpForReceipt({ extraStudioFee: 0, otherFee: 800, manualOtherFee: 0 }), 0);
  assert.equal(studioTopUpForReceipt({ otherFee: 800, extraPaxCount: 1, manualOtherFee: 200 }), 300);
  assert.equal(studioTopUpForReceipt({ otherFee: 500, manualOtherFee: 500 }), 0);
});

test("package menu shows the included rental and leaves other packages unchanged", () => {
  assert.equal(packageOptionLabel(studio), "Pawfect Studio (HK$ 3888 · 已包租金 1500)");
  assert.equal(packageOptionLabel(outdoor), "Pawfect Outdoor (HK$ 2788)");
});
