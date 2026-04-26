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

  const charges = db
    .prepare(
      `SELECT c.*, m.name
       FROM charges c
       JOIN meters m ON m.id = c.meter_id
       WHERE c.bill_id = ?
       ORDER BY m.sort_order, m.id`,
    )
    .all(bill.id) as unknown as (Charge & { name: string })[];

  return { ...bill, charges };
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
  readings: { meterId: number; value: number }[],
): void {
  const stmt = db.prepare(
    `INSERT INTO readings (meter_id, value) VALUES (?, ?)`,
  );
  for (const r of readings) {
    stmt.run(r.meterId, r.value);
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

export function getBillByMonth(month: string): Bill | undefined {
  return db.prepare(`SELECT * FROM bills WHERE month = ?`).get(month) as
    | Bill
    | undefined;
}
