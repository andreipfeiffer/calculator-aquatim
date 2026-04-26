import db from "./schema";

export interface Meter {
  id: number;
  name: string;
  rain_water: number;
  active: number;
  sort_order: number;
  submeter_of: number | null;
}

export function listActiveMeters(): Meter[] {
  return db
    .prepare(`SELECT * FROM meters WHERE active = 1 ORDER BY sort_order, id`)
    .all() as unknown as Meter[];
}

export function listAllMeters(): Meter[] {
  return db
    .prepare(`SELECT * FROM meters ORDER BY sort_order, id`)
    .all() as unknown as Meter[];
}

export function createMeter(
  name: string,
  rainWater: boolean,
  sortOrder: number,
): number {
  const result = db
    .prepare(
      `INSERT INTO meters (name, rain_water, sort_order) VALUES (?, ?, ?)`,
    )
    .run(name, rainWater ? 1 : 0, sortOrder);
  return result.lastInsertRowid as number;
}

export function updateMeter(
  id: number,
  name: string,
  rainWater: boolean,
  active: boolean,
  sortOrder: number,
  submeterOf: number | null,
): void {
  db.prepare(
    `UPDATE meters SET name = ?, rain_water = ?, active = ?, sort_order = ?, submeter_of = ? WHERE id = ?`,
  ).run(name, rainWater ? 1 : 0, active ? 1 : 0, sortOrder, submeterOf, id);
}

export function insertReading(meterId: number, value: number): void {
  db.prepare(`INSERT INTO readings (meter_id, value) VALUES (?, ?)`).run(
    meterId,
    value,
  );
}

export function getLatestReadings(meterIds: number[]): Map<number, number> {
  const result = new Map<number, number>();
  for (const meterId of meterIds) {
    const row = db
      .prepare(
        `SELECT value FROM readings WHERE meter_id = ? ORDER BY created_at DESC LIMIT 1`,
      )
      .get(meterId) as { value: number } | undefined;
    if (row) {
      result.set(meterId, row.value);
    }
  }
  return result;
}
