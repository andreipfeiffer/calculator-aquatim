import type { APIRoute } from "astro";
import { updateMeter } from "../../../db/meters";

export const PUT: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { name, rainWater, active, sortOrder, submeterOf } = body;

  if (!name || typeof name !== "string") {
    return new Response(JSON.stringify({ error: "name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (submeterOf && rainWater) {
    return new Response(
      JSON.stringify({ error: "Sub-meters cannot have rain water" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  updateMeter(
    id,
    name,
    !!rainWater,
    active !== false,
    sortOrder ?? 0,
    submeterOf ?? null,
  );
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
