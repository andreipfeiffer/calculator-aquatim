import type { APIRoute } from "astro";
import { listActiveMeters, createMeter } from "../../../db/meters";

export const GET: APIRoute = () => {
  const meters = listActiveMeters();
  return new Response(JSON.stringify(meters), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { name, rainWater, sortOrder } = body;

  if (!name || typeof name !== "string") {
    return new Response(JSON.stringify({ error: "name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const id = createMeter(name, !!rainWater, sortOrder ?? 0);
  return new Response(JSON.stringify({ id }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
