import assert from "node:assert/strict";
import test from "node:test";
import { balanceDue, depositWasStored, recordedDeposit } from "./order-money.js";

test("a stored deposit of 0 is not treated as missing", () => {
  const unpaid = { price: 3888, depositAmount: 0, paymentStatus: "unpaid" };
  assert.equal(depositWasStored(unpaid), true);
  assert.equal(recordedDeposit(unpaid), 0);
  assert.equal(balanceDue(unpaid), 3888);

  const deposit = { price: 3888, depositAmount: 0, paymentStatus: "deposit" };
  assert.equal(balanceDue(deposit), 3888);
  assert.equal(balanceDue({ price: "3,888", depositAmount: "0", paymentStatus: "full" }), 0);
});

test("a missing deposit on a deposit-status order still assumes half", () => {
  const legacy = { price: 3888, paymentStatus: "deposit" };
  assert.equal(depositWasStored(legacy), false);
  assert.equal(recordedDeposit(legacy), 1944);
  assert.equal(balanceDue(legacy), 1944);
});

test("unpaid orders owe the full price even when the deposit field was never stored", () => {
  assert.equal(balanceDue({ price: 3888, paymentStatus: "unpaid" }), 3888);
  assert.equal(balanceDue({ price: 3888, depositAmount: 1000, paymentStatus: "deposit" }), 2888);
});
