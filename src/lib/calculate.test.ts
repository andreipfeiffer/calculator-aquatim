import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { calculate } from "./calculate.ts";
import type { BillInput, MeterInput } from "./calculate.ts";

function meter(
  overrides: Partial<MeterInput> & { meterId: number },
): MeterInput {
  return {
    name: `Meter ${overrides.meterId}`,
    rainWater: false,
    submeterOf: null,
    currentReading: 0,
    previousReading: 0,
    ...overrides,
  };
}

const bill: BillInput = {
  waterCost: 200,
  totalVolume: 100,
  sewageCost: 100,
  rainWaterCost: 60,
};

describe("calculate", () => {
  it("splits proportionally by consumption", () => {
    const meters = [
      meter({ meterId: 1, previousReading: 0, currentReading: 40 }),
      meter({ meterId: 2, previousReading: 0, currentReading: 60 }),
    ];

    const result = calculate(bill, meters);

    assert.equal(result.totalMeteredConsumption, 100);
    assert.equal(result.volumeDifference, 0);

    const c1 = result.charges.find((c) => c.meterId === 1)!;
    const c2 = result.charges.find((c) => c.meterId === 2)!;

    // waterCost = 200, sewageCost = 100, rainWaterCost = 60
    // No rainWater flag → rain split equally among all: 30 each
    // meter 1: 40% → water 80, sewage 40, rain 30, total 150
    // meter 2: 60% → water 120, sewage 60, rain 30, total 210
    assert.equal(c1.consumption, 40);
    assert.equal(c1.waterAmount, 80);
    assert.equal(c1.sewageAmount, 40);
    assert.equal(c1.rainWaterAmount, 30);
    assert.equal(c1.totalAmount, 150);

    assert.equal(c2.consumption, 60);
    assert.equal(c2.waterAmount, 120);
    assert.equal(c2.sewageAmount, 60);
    assert.equal(c2.rainWaterAmount, 30);
    assert.equal(c2.totalAmount, 210);
  });

  it("splits rain water equally among flagged meters", () => {
    const meters = [
      meter({
        meterId: 1,
        rainWater: true,
        previousReading: 0,
        currentReading: 50,
      }),
      meter({
        meterId: 2,
        rainWater: true,
        previousReading: 0,
        currentReading: 50,
      }),
      meter({
        meterId: 3,
        rainWater: false,
        previousReading: 0,
        currentReading: 0,
      }),
    ];

    const result = calculate(bill, meters);

    const c1 = result.charges.find((c) => c.meterId === 1)!;
    const c2 = result.charges.find((c) => c.meterId === 2)!;
    const c3 = result.charges.find((c) => c.meterId === 3)!;

    assert.equal(c1.rainWaterAmount, 30);
    assert.equal(c2.rainWaterAmount, 30);
    assert.equal(c3.rainWaterAmount, 0);
  });

  it("charges total matches bill total after rounding adjustment", () => {
    const roundingBill: BillInput = {
      waterCost: 100,
      totalVolume: 100,
      sewageCost: 100,
      rainWaterCost: 100,
    };
    const meters = [
      meter({ meterId: 1, previousReading: 0, currentReading: 33 }),
      meter({ meterId: 2, previousReading: 0, currentReading: 33 }),
      meter({ meterId: 3, previousReading: 0, currentReading: 34 }),
    ];

    const result = calculate(roundingBill, meters);
    const total = result.charges.reduce((s, c) => s + c.totalAmount, 0);
    const billTotal =
      roundingBill.waterCost +
      roundingBill.sewageCost +
      roundingBill.rainWaterCost;

    assert.equal(Math.round(total * 100) / 100, billTotal);

    // Meter 3 (largest consumption) absorbs the 0.01 rounding difference
    const c3 = result.charges.find((c) => c.meterId === 3)!;
    assert.equal(c3.waterAmount, 34.01);
    assert.equal(c3.totalAmount, 101.34);
  });

  it("computes volume difference when metered < billed", () => {
    const meters = [
      meter({ meterId: 1, previousReading: 0, currentReading: 60 }),
      meter({ meterId: 2, previousReading: 0, currentReading: 20 }),
    ];

    const result = calculate(bill, meters);

    assert.equal(result.totalMeteredConsumption, 80);
    assert.equal(result.volumeDifference, 20);

    const c1 = result.charges.find((c) => c.meterId === 1)!;
    const c2 = result.charges.find((c) => c.meterId === 2)!;

    // meter 1: 75% → water 150, sewage 75, rain 30, total 255
    // meter 2: 25% → water 50, sewage 25, rain 30, total 105
    assert.equal(c1.consumption, 60);
    assert.equal(c1.waterAmount, 150);
    assert.equal(c1.sewageAmount, 75);
    assert.equal(c1.rainWaterAmount, 30);
    assert.equal(c1.totalAmount, 255);

    assert.equal(c2.consumption, 20);
    assert.equal(c2.waterAmount, 50);
    assert.equal(c2.sewageAmount, 25);
    assert.equal(c2.rainWaterAmount, 30);
    assert.equal(c2.totalAmount, 105);
  });

  it("handles sub-meters: parent share reduced by child consumption", () => {
    // Parent meter reads 100 total, sub-meter reads 40 of that
    const meters = [
      meter({
        meterId: 1,
        submeterOf: null,
        previousReading: 0,
        currentReading: 100,
      }),
      meter({
        meterId: 2,
        submeterOf: 1,
        previousReading: 0,
        currentReading: 40,
      }),
    ];

    const simpleBill: BillInput = {
      waterCost: 100,
      totalVolume: 100,
      sewageCost: 0,
      rainWaterCost: 0,
    };

    const result = calculate(simpleBill, meters);

    // Only root counts toward total metered consumption
    assert.equal(result.totalMeteredConsumption, 100);

    const parent = result.charges.find((c) => c.meterId === 1)!;
    const child = result.charges.find((c) => c.meterId === 2)!;

    // Parent net = 100 - 40 = 60, child = 40
    assert.equal(parent.consumption, 60);
    assert.equal(child.consumption, 40);

    // waterCost = 100, all goes to root's share, then split 60/40
    assert.equal(parent.waterAmount, 60);
    assert.equal(child.waterAmount, 40);
  });

  it("handles sub-meter with rain water flag", () => {
    const meters = [
      meter({
        meterId: 1,
        rainWater: true,
        previousReading: 0,
        currentReading: 80,
      }),
      meter({
        meterId: 2,
        submeterOf: 1,
        rainWater: true,
        previousReading: 0,
        currentReading: 20,
      }),
    ];

    const result = calculate(
      { waterCost: 100, totalVolume: 80, sewageCost: 0, rainWaterCost: 30 },
      meters,
    );

    assert.equal(result.totalMeteredConsumption, 80);
    assert.equal(result.volumeDifference, 0);
    assert.equal(result.waterCost, 100);

    const parent = result.charges.find((c) => c.meterId === 1)!;
    const child = result.charges.find((c) => c.meterId === 2)!;

    // Parent net = 80 - 20 = 60, child = 20
    assert.equal(parent.consumption, 60);
    assert.equal(parent.waterAmount, 75);
    assert.equal(parent.sewageAmount, 0);
    assert.equal(parent.rainWaterAmount, 15);
    assert.equal(parent.totalAmount, 90);

    assert.equal(child.consumption, 20);
    assert.equal(child.waterAmount, 25);
    assert.equal(child.sewageAmount, 0);
    assert.equal(child.rainWaterAmount, 15);
    assert.equal(child.totalAmount, 40);
  });

  it("handles zero consumption across all meters", () => {
    const meters = [
      meter({ meterId: 1, previousReading: 100, currentReading: 100 }),
      meter({ meterId: 2, previousReading: 50, currentReading: 50 }),
    ];

    const result = calculate(bill, meters);

    assert.equal(result.totalMeteredConsumption, 0);
    assert.equal(result.volumeDifference, 100);
    assert.equal(result.waterCost, 200);
    assert.equal(result.charges.length, 2);

    const c1 = result.charges.find((c) => c.meterId === 1)!;
    const c2 = result.charges.find((c) => c.meterId === 2)!;

    // Equal split (1/2 each) since zero consumption
    assert.equal(c1.consumption, 0);
    assert.equal(c1.waterAmount, 100);
    assert.equal(c1.sewageAmount, 50);
    assert.equal(c1.rainWaterAmount, 30);
    assert.equal(c1.totalAmount, 180);

    assert.equal(c2.consumption, 0);
    assert.equal(c2.waterAmount, 100);
    assert.equal(c2.sewageAmount, 50);
    assert.equal(c2.rainWaterAmount, 30);
    assert.equal(c2.totalAmount, 180);
  });
});
