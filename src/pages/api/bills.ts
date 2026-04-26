import type { APIRoute } from "astro";
import { listBills, getBillById, getBillByMonth } from "../../db/bills";

export const GET: APIRoute = ({ url }) => {
  const idParam = url.searchParams.get("id");

  if (idParam) {
    const bill = getBillById(Number(idParam));
    if (!bill) {
      return new Response(JSON.stringify({ error: "Bill not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(bill), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? 12);
  const result = listBills(page, pageSize);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
};
