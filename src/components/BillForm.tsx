import { useState, useCallback, useEffect } from "react";
import type { CalculationResult, MeterCharge } from "../lib/calculate";

interface MeterData {
  id: number;
  name: string;
  rainWater: boolean;
  submeterOf: number | null;
  previousReading: number;
}

interface Props {
  meters: MeterData[];
}

export default function BillForm({ meters }: Props) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [waterCost, setWaterCost] = useState("");
  const [totalVolume, setTotalVolume] = useState("");
  const [sewageCost, setSewageCost] = useState("");
  const [rainWaterCost, setRainWaterCost] = useState("");

  const [readings, setReadings] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};

    for (const m of meters) {
      init[m.id] = "";
    }
    return init;
  });

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [adjustedCharges, setAdjustedCharges] = useState<MeterCharge[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const canCalculate =
    waterCost !== "" &&
    totalVolume !== "" &&
    sewageCost !== "" &&
    rainWaterCost !== "" &&
    meters.every((m) => readings[m.id] !== "");

  const doCalculate = useCallback(async () => {
    if (!canCalculate) return;

    const bill = {
      waterCost: Number(waterCost),
      totalVolume: Number(totalVolume),
      sewageCost: Number(sewageCost),
      rainWaterCost: Number(rainWaterCost),
    };

    const meterInputs = meters.map((m) => ({
      meterId: m.id,
      name: m.name,
      rainWater: m.rainWater,
      submeterOf: m.submeterOf,
      currentReading: Number(readings[m.id]),
      previousReading: m.previousReading,
    }));

    const res = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bill, meters: meterInputs }),
    });

    if (res.ok) {
      const data: CalculationResult = await res.json();
      setResult(data);
      setAdjustedCharges(data.charges.map((c) => ({ ...c })));
      setError(null);
    }
  }, [
    canCalculate,
    waterCost,
    totalVolume,
    sewageCost,
    rainWaterCost,
    meters,
    readings,
  ]);

  useEffect(() => {
    if (canCalculate) {
      const timer = setTimeout(doCalculate, 300);
      return () => clearTimeout(timer);
    }
  }, [canCalculate, doCalculate]);

  const adjustedTotal = adjustedCharges.reduce(
    (sum, c) => sum + c.totalAmount,
    0,
  );
  const billTotal =
    (Number(waterCost) || 0) +
    (Number(sewageCost) || 0) +
    (Number(rainWaterCost) || 0);
  const totalMismatch =
    adjustedCharges.length > 0 && Math.abs(adjustedTotal - billTotal) > 0.01;

  const handleAdjust = (meterId: number, value: string) => {
    setAdjustedCharges((prev) =>
      prev.map((c) =>
        c.meterId === meterId ? { ...c, totalAmount: Number(value) || 0 } : c,
      ),
    );
  };

  const handleSave = async () => {
    if (totalMismatch) {
      setError(
        `Totalul repartizat (${adjustedTotal.toFixed(2)}) nu coincide cu totalul facturii (${billTotal.toFixed(2)})`,
      );
      return;
    }

    setSaving(true);
    setError(null);

    const billData = {
      waterCost: Number(waterCost),
      totalVolume: Number(totalVolume),
      sewageCost: Number(sewageCost),
      rainWaterCost: Number(rainWaterCost),
    };

    const readingsData = meters.map((m) => ({
      meterId: m.id,
      value: Number(readings[m.id]),
    }));

    const res = await fetch("/api/save-bill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        bill: billData,
        readings: readingsData,
        charges: adjustedCharges,
      }),
    });

    if (res.ok) {
      setSaved(true);
    } else {
      const data = await res.json();
      setError(data.error || "Eroare la salvare");
    }

    setSaving(false);
  };

  if (saved) {
    return (
      <div>
        <p>Factura a fost salvată cu succes!</p>
        <a href="/">Înapoi acasă</a>
        {" | "}
        <a href="/bill/new" onClick={() => window.location.reload()}>
          Factură nouă
        </a>
      </div>
    );
  }

  return (
    <div>
      <section>
        <h2>Date factură</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <label>
            Luna
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <label>
            Cost apă (lei)
            <input
              type="number"
              step="0.01"
              value={waterCost}
              onChange={(e) => setWaterCost(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label>
            Volum total (m³)
            <input
              type="number"
              step="0.01"
              value={totalVolume}
              onChange={(e) => setTotalVolume(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label>
            Cost canalizare (lei)
            <input
              type="number"
              step="0.01"
              value={sewageCost}
              onChange={(e) => setSewageCost(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label>
            Cost apă pluvială (lei)
            <input
              type="number"
              step="0.01"
              value={rainWaterCost}
              onChange={(e) => setRainWaterCost(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <div>
            <strong>Total factură:</strong> {billTotal.toFixed(2)} lei
          </div>
        </div>
      </section>

      <section>
        <h2>Citiri contoare</h2>
        <table>
          <thead>
            <tr>
              <th>Apartament</th>
              <th>Index anterior</th>
              <th>Index curent</th>
              <th>Consum</th>
            </tr>
          </thead>
          <tbody>
            {meters.map((m) => {
              const current = Number(readings[m.id]) || 0;
              const consumption = Math.max(0, current - m.previousReading);
              const readingTooLow =
                readings[m.id] !== "" && current < m.previousReading;

              return (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.previousReading}</td>
                  <td>
                    <input
                      type="number"
                      step="1"
                      value={readings[m.id]}
                      onChange={(e) =>
                        setReadings((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }))
                      }
                      placeholder={m.previousReading.toString()}
                      style={{ width: "10em", marginBottom: 0 }}
                      aria-invalid={readingTooLow || undefined}
                    />
                  </td>
                  <td>{readings[m.id] ? consumption : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {result && (
        <section>
          <h2>Repartizare</h2>

          <div style={{ display: "flex", gap: "2rem", marginBottom: "1rem" }}>
            <div>
              <strong>Consum total contorizat:</strong>{" "}
              {result.totalMeteredConsumption.toFixed(2)} m³
            </div>
            <div>
              <strong>Diferență volum:</strong>{" "}
              <span
                style={{
                  color:
                    Math.abs(result.volumeDifference) > 0.01
                      ? "var(--pico-color-red-500)"
                      : "inherit",
                }}
              >
                {result.volumeDifference.toFixed(2)} m³
              </span>
            </div>
            <div>
              <strong>Cost apă:</strong> {result.waterCost.toFixed(2)} lei
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Apartament</th>
                <th>Consum (m³)</th>
                <th>Apă (lei)</th>
                <th>Canalizare (lei)</th>
                <th>Apă pluvială (lei)</th>
                <th>Total (lei)</th>
              </tr>
            </thead>
            <tbody>
              {adjustedCharges.map((charge) => (
                <tr key={charge.meterId}>
                  <td>{charge.name}</td>
                  <td>{charge.consumption.toFixed(2)}</td>
                  <td>{charge.waterAmount.toFixed(2)}</td>
                  <td>{charge.sewageAmount.toFixed(2)}</td>
                  <td>{charge.rainWaterAmount.toFixed(2)}</td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={charge.totalAmount}
                      onChange={(e) =>
                        handleAdjust(charge.meterId, e.target.value)
                      }
                      style={{ width: "10em" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td>
                  <strong>
                    {adjustedCharges
                      .reduce((s, c) => s + c.consumption, 0)
                      .toFixed(2)}
                  </strong>
                </td>
                <td>
                  <strong>
                    {adjustedCharges
                      .reduce((s, c) => s + c.waterAmount, 0)
                      .toFixed(2)}
                  </strong>
                </td>
                <td>
                  <strong>
                    {adjustedCharges
                      .reduce((s, c) => s + c.sewageAmount, 0)
                      .toFixed(2)}
                  </strong>
                </td>
                <td>
                  <strong>
                    {adjustedCharges
                      .reduce((s, c) => s + c.rainWaterAmount, 0)
                      .toFixed(2)}
                  </strong>
                </td>
                <td>
                  <strong
                    style={{
                      color: totalMismatch
                        ? "var(--pico-color-red-500)"
                        : "inherit",
                    }}
                  >
                    {adjustedTotal.toFixed(2)}
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>

          {totalMismatch && (
            <p style={{ color: "var(--pico-color-red-500)" }}>
              Totalul repartizat ({adjustedTotal.toFixed(2)} lei) nu coincide cu
              totalul facturii ({billTotal.toFixed(2)} lei). Diferență:{" "}
              {(adjustedTotal - billTotal).toFixed(2)} lei.
            </p>
          )}

          {error && (
            <p style={{ color: "var(--pico-color-red-500)" }}>{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || totalMismatch}
            aria-busy={saving}
          >
            {saving ? "Se salvează..." : "Salvează factura"}
          </button>
        </section>
      )}
    </div>
  );
}
