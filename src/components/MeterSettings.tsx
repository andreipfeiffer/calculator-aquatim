import { useState } from "react";

interface MeterData {
  id: number;
  name: string;
  rainWater: boolean;
  active: boolean;
  submeterOf: number | null;
  currentReading: number;
}

interface Props {
  meters: MeterData[];
}

export default function MeterSettings({ meters: initial }: Props) {
  const [meters, setMeters] = useState(initial);
  const [saving, setSaving] = useState<number | null>(null);
  const [savingReading, setSavingReading] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (
    id: number,
    field: keyof MeterData,
    value: string | boolean | number | null,
  ) => {
    setMeters((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  };

  const handleSave = async (meter: MeterData) => {
    setSaving(meter.id);
    setMessage(null);

    const res = await fetch(`/api/meters/${meter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: meter.name,
        rainWater: meter.rainWater,
        active: meter.active,
        submeterOf: meter.submeterOf,
      }),
    });

    if (res.ok) {
      setMessage(`${meter.name} salvat`);
    } else {
      const data = await res.json();
      setMessage(`Eroare: ${data.error}`);
    }

    setSaving(null);
  };

  const handleSaveReading = async (meter: MeterData) => {
    setSavingReading(meter.id);
    setMessage(null);

    const res = await fetch(`/api/meters/${meter.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reading: meter.currentReading }),
    });

    if (res.ok) {
      setMessage(`Index ${meter.name} salvat`);
    } else {
      const data = await res.json();
      setMessage(`Eroare: ${data.error}`);
    }

    setSavingReading(null);
  };

  // Root meters (not sub-meters) for the submeterOf dropdown
  const rootMeters = meters.filter((m) => m.submeterOf === null);

  const isError = message?.startsWith("Eroare");

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1em",
        }}
      >
        <h1>Setări contoare</h1>
        {message && (
          <b
            style={{
              color: isError
                ? "var(--pico-del-color, #c62828)"
                : "var(--pico-ins-color, #2e7d32)",
              fontSize: "0.85rem",
            }}
          >
            {message}
          </b>
        )}
      </div>

      <style>{`
        .settings-table td input,
        .settings-table td select,
        .settings-table td button {
          margin-bottom: 0;
        }
      `}</style>

      <table className="settings-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nume</th>
            <th>Apă pluvială</th>
            <th>Subcontor al</th>
            <th>Activ</th>
            <th>Index curent</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {meters.map((m) => (
            <tr key={m.id} style={{ opacity: m.active ? 1 : 0.5 }}>
              <td>{m.id}</td>
              <td>
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => handleChange(m.id, "name", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={m.rainWater}
                  onChange={(e) =>
                    handleChange(m.id, "rainWater", e.target.checked)
                  }
                />
              </td>
              <td>
                <select
                  value={m.submeterOf ?? ""}
                  onChange={(e) =>
                    handleChange(
                      m.id,
                      "submeterOf",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">—</option>
                  {rootMeters
                    .filter((rm) => rm.id !== m.id)
                    .map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name} (#{rm.id})
                      </option>
                    ))}
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={m.active}
                  onChange={(e) =>
                    handleChange(m.id, "active", e.target.checked)
                  }
                />
              </td>
              <td style={{ display: "flex", gap: "0.25em" }}>
                <input
                  type="number"
                  value={m.currentReading}
                  onChange={(e) =>
                    handleChange(m.id, "currentReading", Number(e.target.value))
                  }
                  style={{ width: "6em" }}
                />
                {m.currentReading !==
                  initial.find((im) => im.id === m.id)!.currentReading && (
                  <button
                    className="outline"
                    onClick={() => handleSaveReading(m)}
                    disabled={savingReading === m.id}
                    aria-busy={savingReading === m.id}
                    style={{ fontSize: "0.85em", padding: "0.25em 0.5em" }}
                  >
                    OK
                  </button>
                )}
              </td>
              <td>
                <button
                  onClick={() => handleSave(m)}
                  disabled={saving === m.id}
                  aria-busy={saving === m.id}
                >
                  Salvează
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
