import db from "./schema";

export interface Bill {
  id: number;
  month: string;
  water_cost: number;
  total_volume: number;
  sewage_cost: number;
  rain_water_cost: number;
  created_at: string;
}

export interface Reading {
  id: number;
  bill_id: number;
  meter_id: number;
  value: number;
}

export interface Charge {
  id: number;
  bill_id: number;
  meter_id: number;
  consumption: number;
  water_amount: number;
  sewage_amount: number;
  rain_water_amount: number;
  total_amount: number;
}

export interface BillDetail extends Bill {
  readings: Reading[];
  charges: (Charge & { name: string })[];
}

export function createBill(
  month: string,
  waterCost: number,
  totalVolume: number,
  sewageCost: number,
  rainWaterCost: number,
): number {
  const result = db
    .prepare(
      `INSERT INTO bills (month, water_cost, total_volume, sewage_cost, rain_water_cost)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(month, waterCost, totalVolume, sewageCost, rainWaterCost);
  return result.lastInsertRowid as number;
}

export function getBillById(id: number): BillDetail | undefined {
  const bill = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(id) as
    | Bill
    | undefined;

  if (!bill) return undefined;

  const readings = db
    .prepare(`SELECT * FROM readings WHERE bill_id = ?`)
    .all(bill.id) as unknown as Reading[];

  const charges = db
    .prepare(
      `SELECT c.*, m.name
       FROM charges c
       JOIN meters m ON m.id = c.meter_id
       WHERE c.bill_id = ?
       ORDER BY m.sort_order, m.id`,
    )
    .all(bill.id) as unknown as (Charge & { name: string })[];

  return { ...bill, readings, charges };
}

export function listBills(
  page: number,
  pageSize: number,
): { bills: Bill[]; total: number } {
  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM bills`).get() as {
      count: number;
    }
  ).count;

  const bills = db
    .prepare(`SELECT * FROM bills ORDER BY month DESC LIMIT ? OFFSET ?`)
    .all(pageSize, (page - 1) * pageSize) as unknown as Bill[];

  return { bills, total };
}

export function saveReadings(
  billId: number,
  readings: { meterId: number; value: number }[],
): void {
  const stmt = db.prepare(
    `INSERT INTO readings (bill_id, meter_id, value) VALUES (?, ?, ?)`,
  );
  for (const r of readings) {
    stmt.run(billId, r.meterId, r.value);
  }
}

export function saveCharges(
  billId: number,
  charges: {
    meterId: number;
    consumption: number;
    waterAmount: number;
    sewageAmount: number;
    rainWaterAmount: number;
    totalAmount: number;
  }[],
): void {
  const stmt = db.prepare(
    `INSERT INTO charges (bill_id, meter_id, consumption, water_amount, sewage_amount, rain_water_amount, total_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const c of charges) {
    stmt.run(
      billId,
      c.meterId,
      c.consumption,
      c.waterAmount,
      c.sewageAmount,
      c.rainWaterAmount,
      c.totalAmount,
    );
  }
}

export function getPreviousReadings(meterIds: number[]): Map<number, number> {
  const result = new Map<number, number>();
  if (meterIds.length === 0) return result;

  for (const meterId of meterIds) {
    const row = db
      .prepare(
        `SELECT r.value FROM readings r
         JOIN bills b ON b.id = r.bill_id
         WHERE r.meter_id = ?
         ORDER BY b.month DESC
         LIMIT 1`,
      )
      .get(meterId) as { value: number } | undefined;

    if (row) {
      result.set(meterId, row.value);
    }
  }

  return result;
}

export function getBillByMonth(month: string): Bill | undefined {
  return db.prepare(`SELECT * FROM bills WHERE month = ?`).get(month) as
    | Bill
    | undefined;
}
