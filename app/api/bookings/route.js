import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { LOCATIONS, serviceById } from "@/lib/business";
import { sendBookingNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const { locId, date, services, vehicleType, name, phone, email, vehicle, notes } = body || {};

    // Validate
    if (!LOCATIONS.some((l) => l.id === locId)) return bad("Unknown location.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return bad("Invalid date.");
    if (!Array.isArray(services) || services.length === 0) return bad("Choose at least one service.");
    if (!services.every((id) => serviceById(id))) return bad("Unknown service selected.");
    if (!["sedan", "suv"].includes(vehicleType)) return bad("Invalid vehicle type.");
    if (!name || !name.trim()) return bad("Enter your name so we know who to expect.");
    if (!phone || !phone.trim()) return bad("Enter a phone number so we can confirm your appointment.");
    if (!vehicle || !vehicle.trim()) return bad("Tell us the vehicle (year, make, model).");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = date.split("-").map(Number);
    if (new Date(y, m - 1, d) < today) return bad("That date has already passed.");

    const supabase = getSupabase();

    // Date must be open
    const { data: open } = await supabase
      .from("availability")
      .select("date")
      .eq("loc_id", locId)
      .eq("date", date)
      .maybeSingle();
    if (!open) return conflict();

    // Insert — unique (loc_id, date) constraint prevents double-booking races
    const { data: inserted, error } = await supabase
      .from("bookings")
      .insert({
        loc_id: locId,
        date,
        service: services.join(","),
        vehicle_type: vehicleType,
        name: name.trim().slice(0, 120),
        phone: phone.trim().slice(0, 40),
        email: (email || "").trim().slice(0, 160),
        vehicle: vehicle.trim().slice(0, 160),
        notes: (notes || "").trim().slice(0, 500),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return conflict(); // unique violation: date just taken
      throw error;
    }

    // Fire off the owner notification email. Don't let a slow/failed email
    // block the customer's confirmation — the booking already succeeded.
    sendBookingNotification(inserted).catch((e) => console.error(e));

    return NextResponse.json({ booking: inserted });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

function bad(msg) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
function conflict() {
  return NextResponse.json({ error: "That date was just taken. Pick another open date.", conflict: true }, { status: 409 });
}
