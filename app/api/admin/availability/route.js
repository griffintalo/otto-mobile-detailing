import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isOwner } from "@/lib/auth";
import { LOCATIONS } from "@/lib/business";

export const dynamic = "force-dynamic";

// Toggle a date open/closed for a location.
export async function POST(request) {
  if (!isOwner(request)) {
    return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  }
  try {
    const { locId, date } = await request.json().catch(() => ({}));
    if (!LOCATIONS.some((l) => l.id === locId) || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      return NextResponse.json({ error: "Invalid location or date." }, { status: 400 });
    }
    const supabase = getSupabase();

    // Don't close a date that has a booking
    const { data: booked } = await supabase
      .from("bookings")
      .select("id")
      .eq("loc_id", locId)
      .eq("date", date)
      .maybeSingle();
    if (booked) {
      return NextResponse.json({ error: "That date has a booking. Cancel it first.", open: true }, { status: 409 });
    }

    const { data: existing } = await supabase
      .from("availability")
      .select("date")
      .eq("loc_id", locId)
      .eq("date", date)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("availability").delete().eq("loc_id", locId).eq("date", date);
      if (error) throw error;
      return NextResponse.json({ open: false });
    } else {
      const { error } = await supabase.from("availability").insert({ loc_id: locId, date });
      if (error) throw error;
      return NextResponse.json({ open: true });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not update that date." }, { status: 500 });
  }
}
