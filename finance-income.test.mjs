import assert from "node:assert/strict";
import test from "node:test";
import { aggregateMonthlyIncome, hkMonthKey } from "./finance-income.js";

test("zoneless payment timestamps keep the written Hong Kong calendar month", () => {
  assert.equal(hkMonthKey("2026-04-12"), "2026-04");
  assert.equal(hkMonthKey("2026-04-12 21:52"), "2026-04");
  assert.equal(hkMonthKey("2026-05-25 22:28"), "2026-05");
  assert.equal(hkMonthKey("2026-04-08 00:20"), "2026-04");
});

test("instants convert into the Asia/Hong_Kong month", () => {
  assert.equal(hkMonthKey("2026-03-31T16:00:00.000Z"), "2026-04");
  assert.equal(hkMonthKey("2026-03-31T15:59:00.000Z"), "2026-03");
  assert.equal(hkMonthKey(new Date("2026-06-30T16:30:00.000Z")), "2026-07");
});

test("a fully paid booking in one month is counted once", () => {
  const summary = aggregateMonthlyIncome([{
    id: "a",
    price: 2800,
    depositAmount: 1400,
    paymentStatus: "full",
    depositDate: "2026-05-02 19:24",
    balanceDate: "2026-05-18",
    shootDate: "2026-06-01"
  }], new Date("2026-10-17T00:00:00Z"));

  assert.equal(summary.rows.length, 1);
  assert.equal(summary.rows[0].key, "2026-05");
  assert.equal(summary.rows[0].label, "2026年5月");
  assert.equal(summary.rows[0].amount, 2800);
  assert.equal(summary.rows[0].orders, 1);
  assert.equal(summary.total, 2800);
  assert.equal(summary.undated, 0);
});

test("deposit and balance in different months split without double counting", () => {
  const summary = aggregateMonthlyIncome([{
    id: "b",
    price: 2830,
    depositAmount: 1415,
    paymentStatus: "full",
    depositDate: "2026-06-21 13:11",
    balanceDate: "2026-09-08",
    shootDate: "2026-07-01"
  }]);

  assert.deepEqual(
    summary.rows.map((row) => [row.key, row.amount, row.orders]),
    [["2026-09", 1415, 1], ["2026-06", 1415, 1]]
  );
  assert.equal(summary.total, 2830);
});

test("a fully paid booking with only one payment date stays in that month", () => {
  const summary = aggregateMonthlyIncome([{
    price: 2000,
    depositAmount: 800,
    paymentStatus: "full",
    depositDate: "2026-04-03 08:52",
    balanceDate: "",
    shootDate: "2026-08-01"
  }]);

  assert.equal(summary.rows.length, 1);
  assert.equal(summary.rows[0].key, "2026-04");
  assert.equal(summary.rows[0].amount, 2000);
});

test("deposit-only bookings recognize the deposit, not the unpaid balance", () => {
  const summary = aggregateMonthlyIncome([{
    price: 3000,
    depositAmount: 1000,
    paymentStatus: "deposit",
    depositDate: "2026-03-27 16:18",
    balanceDate: "2026-11-01",
    shootDate: "2026-04-02"
  }]);

  assert.equal(summary.rows.length, 1);
  assert.equal(summary.rows[0].key, "2026-03");
  assert.equal(summary.rows[0].amount, 1000);
  assert.equal(summary.total, 1000);
});

test("unpaid bookings and missing dates do not invent a month", () => {
  const summary = aggregateMonthlyIncome([
    { price: 1500, depositAmount: 0, paymentStatus: "unpaid", shootDate: "2026-01-01" },
    { price: 900, depositAmount: 900, paymentStatus: "full" }
  ]);

  assert.equal(summary.rows.length, 0);
  assert.equal(summary.undated, 900);
  assert.equal(summary.total, 900);
});

test("paid bookings with no receipt date fall back to the shoot month", () => {
  const summary = aggregateMonthlyIncome([{
    price: 1600,
    depositAmount: 0,
    paymentStatus: "full",
    shootDate: "2026-02-14"
  }]);

  assert.equal(summary.rows[0].key, "2026-02");
  assert.equal(summary.rows[0].amount, 1600);
});

test("legacy depositPaid flag and over-recorded deposits stay inside the order total", () => {
  const summary = aggregateMonthlyIncome([{
    price: 1000,
    depositAmount: 1800,
    depositPaid: true,
    depositDate: "2026-07-01"
  }]);

  assert.equal(summary.rows[0].amount, 1000);
  assert.equal(summary.rows[0].key, "2026-07");
});

test("several bookings in the same month add up and the current month is marked", () => {
  const summary = aggregateMonthlyIncome([
    { price: 500, depositAmount: 500, paymentStatus: "full", balanceDate: "2026-10-02" },
    { price: 700, depositAmount: 200, paymentStatus: "deposit", depositDate: "2026-10-09" },
    { price: 400, depositAmount: 400, paymentStatus: "full", depositDate: "2026-08-01", balanceDate: "2026-08-20" }
  ], new Date("2026-10-17T04:00:00Z"));

  const october = summary.rows.find((row) => row.key === "2026-10");
  assert.equal(october.amount, 700);
  assert.equal(october.orders, 2);
  assert.equal(october.current, true);
  assert.equal(summary.total, 1100);
});
