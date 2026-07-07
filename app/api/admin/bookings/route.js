import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isOwner(request)) return unauthorized();
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ bookings: data || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load bookings." }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!isOwner(request)) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing booking id." }, { status: 400 });
    const supabase = getSupabase();
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not cancel booking." }, { status: 500 });
  }
}

function unauthorized() {
  return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
}
