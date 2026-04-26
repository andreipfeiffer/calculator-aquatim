import type { APIRoute } from "astro";
import { calculate } from "../../lib/calculate";
import type { MeterInput, BillInput } from "../../lib/calculate";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { bill, meters } = body as {
    bill: BillInput;
    meters: MeterInput[];
  };

  if (!bill || !meters || !Array.isArray(meters)) {
    return new Response(
      JSON.stringify({ error: "bill and meters are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const invalidSubMeter = meters.find(
    (m) => m.submeterOf !== null && m.rainWater,
  );
  if (invalidSubMeter) {
    return new Response(
      JSON.stringify({
        error: `Sub-meter "${invalidSubMeter.name}" cannot have rain water`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = calculate(bill, meters);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
};
