import db from "./schema";
import { listActiveMeters } from "./meters";

/**
 * Seeds the database with initial meter data.
 * Only runs if the meters table is empty.
 */
export function seedIfEmpty(): void {
  const count = (
    db.prepare(`SELECT COUNT(*) as count FROM meters`).get() as {
      count: number;
    }
  ).count;

  if (count > 0) return;

  const meters = [
    { name: "Ap.1 Pfeiffer", rainWater: true, sortOrder: 1, submeterOf: null },
    {
      name: "Ap.2 Chiriasi",
      rainWater: false,
      sortOrder: 2,
      submeterOf: null,
    },
    { name: "Subsol", rainWater: false, sortOrder: 4, submeterOf: null },
    { name: "Casa Flore", rainWater: true, sortOrder: 3, submeterOf: 2 },
  ];

  const insertMeter = db.prepare(
    `INSERT INTO meters (name, rain_water, sort_order, submeter_of) VALUES (?, ?, ?, ?)`,
  );

  for (const m of meters) {
    insertMeter.run(
      m.name,
      m.rainWater ? 1 : 0,
      m.sortOrder,
      m.submeterOf ?? null,
    );
  }
}

seedIfEmpty();

// Re-export to confirm seeding ran
export const seededMeters = listActiveMeters();
