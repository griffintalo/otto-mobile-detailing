import { EMAIL, LOCATIONS, servicesFromString, totalPriceFor } from "@/lib/business";

// Sends an email to the business owner when a new booking comes in.
// Uses Resend (resend.com). If RESEND_API_KEY isn't set, this silently
// does nothing so bookings still work while you're setting email up.
export async function sendBookingNotification(booking) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping booking notification email.");
    return;
  }

  const loc = LOCATIONS.find((l) => l.id === booking.loc_id);
  const services = servicesFromString(booking.service);
  const serviceIds = services.map((s) => s.id);
  const total = totalPriceFor(serviceIds, booking.vehicle_type);
  const serviceNames = services.map((s) => s.name).join(", ");

  const prettyDate = (() => {
    const [y, m, d] = booking.date.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  })();

  const subject = `New booking: ${prettyDate} — ${booking.name}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="margin-bottom: 4px;">New booking request</h2>
      <p style="color: #555; margin-top: 0;">${loc ? `${loc.name}, ${loc.state}` : booking.loc_id}</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #777;">Date</td><td style="padding: 4px 0; font-weight: bold;">${prettyDate}</td></tr>
        <tr><td style="padding: 4px 0; color: #777;">Services</td><td style="padding: 4px 0;">${serviceNames || booking.service} — $${total}</td></tr>
        <tr><td style="padding: 4px 0; color: #777;">Vehicle</td><td style="padding: 4px 0;">${booking.vehicle} (${booking.vehicle_type === "suv" ? "SUV/Truck" : "Sedan"})</td></tr>
        <tr><td style="padding: 4px 0; color: #777;">Name</td><td style="padding: 4px 0;">${booking.name}</td></tr>
        <tr><td style="padding: 4px 0; color: #777;">Phone</td><td style="padding: 4px 0;"><a href="tel:${booking.phone}">${booking.phone}</a></td></tr>
        ${booking.email ? `<tr><td style="padding: 4px 0; color: #777;">Email</td><td style="padding: 4px 0;">${booking.email}</td></tr>` : ""}
        ${booking.notes ? `<tr><td style="padding: 4px 0; color: #777;">Notes</td><td style="padding: 4px 0;">${booking.notes}</td></tr>` : ""}
      </table>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Otto Mobile Detailing <onboarding@resend.dev>",
        to: EMAIL,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Resend email failed:", res.status, text);
    }
  } catch (err) {
    console.error("Resend email error:", err);
  }
}
