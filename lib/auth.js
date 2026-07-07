import crypto from "crypto";

export function ownerToken() {
  const secret = process.env.SESSION_SECRET || "change-me";
  return crypto.createHmac("sha256", secret).update("owner-session").digest("hex");
}

export function isOwner(request) {
  const cookie = request.cookies.get("owner_session");
  return Boolean(cookie && cookie.value === ownerToken());
}
