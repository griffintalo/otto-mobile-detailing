import { NextResponse } from "next/server";
import { ownerToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { passcode } = await request.json().catch(() => ({}));
  const expected = process.env.OWNER_PASSCODE;
  if (!expected) {
    return NextResponse.json({ error: "OWNER_PASSCODE is not configured." }, { status: 500 });
  }
  if (passcode !== expected) {
    return NextResponse.json({ error: "That passcode didn't match." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("owner_session", ownerToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("owner_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
