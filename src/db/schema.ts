import db from "./connection";

db.exec(`
  CREATE TABLE IF NOT EXISTS meters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rain_water INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    submeter_of INTEGER DEFAULT NULL,
    FOREIGN KEY (submeter_of) REFERENCES meters(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL UNIQUE,
    water_cost REAL NOT NULL,
    total_volume REAL NOT NULL,
    sewage_cost REAL NOT NULL,
    rain_water_cost REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    meter_id INTEGER NOT NULL,
    value REAL NOT NULL,
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (meter_id) REFERENCES meters(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    meter_id INTEGER NOT NULL,
    consumption REAL NOT NULL,
    water_amount REAL NOT NULL,
    sewage_amount REAL NOT NULL,
    rain_water_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (meter_id) REFERENCES meters(id)
  )
`);

export default db;
