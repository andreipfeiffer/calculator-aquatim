import type { APIRoute } from "astro";
import {
  createBill,
  saveReadings,
  saveCharges,
  getBillByMonth,
} from "../../db/bills";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { month, bill, readings, charges } = body;

  if (!month || !bill || !readings || !charges) {
    return new Response(
      JSON.stringify({
        error: "month, bill, readings, and charges are required",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const existing = getBillByMonth(month);
  if (existing) {
    return new Response(
      JSON.stringify({ error: `Bill for ${month} already exists` }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  }

  const billId = createBill(
    month,
    bill.waterCost,
    bill.totalVolume,
    bill.sewageCost,
    bill.rainWaterCost,
  );

  saveReadings(
    billId,
    readings.map((r: { meterId: number; value: number }) => ({
      meterId: r.meterId,
      value: r.value,
    })),
  );

  saveCharges(
    billId,
    charges.map(
      (c: {
        meterId: number;
        consumption: number;
        waterAmount: number;
        sewageAmount: number;
        rainWaterAmount: number;
        totalAmount: number;
      }) => ({
        meterId: c.meterId,
        consumption: c.consumption,
        waterAmount: c.waterAmount,
        sewageAmount: c.sewageAmount,
        rainWaterAmount: c.rainWaterAmount,
        totalAmount: c.totalAmount,
      }),
    ),
  );

  return new Response(JSON.stringify({ id: billId }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
