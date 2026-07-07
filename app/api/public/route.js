import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Public data: which dates are open and which are taken.
// Deliberately does NOT include any customer information.
export async function GET() {
  try {
    const supabase = getSupabase();
    const [{ data: av, error: e1 }, { data: bk, error: e2 }] = await Promise.all([
      supabase.from("availability").select("loc_id,date"),
      supabase.from("bookings").select("loc_id,date"),
    ]);
    if (e1 || e2) throw e1 || e2;

    const availability = {};
    (av || []).forEach((r) => {
      availability[r.loc_id] = availability[r.loc_id] || {};
      availability[r.loc_id][r.date] = true;
    });
    const booked = {};
    (bk || []).forEach((r) => {
      booked[r.loc_id] = booked[r.loc_id] || {};
      booked[r.loc_id][r.date] = true;
    });

    return NextResponse.json(
      { availability, booked },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load calendar." }, { status: 500 });
  }
}
