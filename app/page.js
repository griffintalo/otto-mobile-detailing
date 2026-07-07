"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BRAND, PHONE, EMAIL, GOOGLE_REVIEW_URL, HOURS,
  LOCATIONS, SERVICES, priceFor, serviceById,
} from "@/lib/business";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function keyFor(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function prettyDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// ---------------- Calendar ----------------

function Calendar({ month, year, onPrev, onNext, isOpen, isBooked, onPick, selected, admin }) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="px-3 py-1 rounded-lg text-neutral-600 hover:bg-neutral-100 font-semibold">‹</button>
        <div className="font-bold text-neutral-900 tracking-wide uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.25rem" }}>
          {MONTHS[month]} {year}
        </div>
        <button onClick={onNext} className="px-3 py-1 rounded-lg text-neutral-600 hover:bg-neutral-100 font-semibold">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400 mb-1">
        {DOW.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={"e" + i} />;
          const dt = new Date(year, month, d);
          const iso = keyFor(dt);
          const past = dt < today;
          const open = isOpen(iso);
          const booked = isBooked(iso);
          const sel = selected === iso;

          let cls = "aspect-square flex items-center justify-center rounded-lg text-sm transition-colors ";
          let style = {};
          let clickable = false;

          if (admin) {
            if (past) cls += "text-neutral-300";
            else {
              clickable = true;
              if (booked) { cls += "font-bold text-white"; style = { background: BRAND.black }; }
              else if (open) { cls += "font-bold text-white"; style = { background: BRAND.red }; }
              else cls += "text-neutral-600 hover:bg-neutral-100";
            }
          } else {
            if (past || !open || booked) cls += "text-neutral-300";
            else {
              clickable = true;
              if (sel) { cls += "font-bold text-white"; style = { background: BRAND.red }; }
              else cls += "bg-red-50 text-red-700 font-semibold hover:bg-red-100 ring-1 ring-red-200";
            }
          }

          return (
            <button key={iso} disabled={!clickable} onClick={() => clickable && onPick(iso)} className={cls} style={style}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Main app ----------------

export default function OttoDetailing() {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState({}); // { locId: { iso: true } }
  const [bookedMap, setBookedMap] = useState({});       // { locId: { iso: true } }
  const [bookings, setBookings] = useState([]);         // owner-only, loaded after sign-in

  const [view, setView] = useState("home"); // home | book | confirm | admin | adminLogin
  const [loc, setLoc] = useState(null);
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({ service: "premium-full", vehicleType: "sedan", name: "", phone: "", email: "", vehicle: "", notes: "" });
  const [confirmed, setConfirmed] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [adminLoc, setAdminLoc] = useState("bucks");
  const [passInput, setPassInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminMsg, setAdminMsg] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/public", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setAvailability(data.availability || {});
        setBookedMap(data.booked || {});
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const isOpen = (locId) => (iso) => !!(availability[locId] && availability[locId][iso]);
  const isBooked = (locId) => (iso) => !!(bookedMap[locId] && bookedMap[locId][iso]);

  const monthNav = {
    prev: () => {
      if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
      else setCalMonth(calMonth - 1);
    },
    next: () => {
      if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
      else setCalMonth(calMonth + 1);
    },
  };

  // ---- client actions ----
  const startBooking = (l) => {
    setLoc(l);
    setSelectedDate(null);
    setForm({ service: "premium-full", vehicleType: "sedan", name: "", phone: "", email: "", vehicle: "", notes: "" });
    setFormError("");
    setView("book");
    refresh();
  };

  const submitBooking = async () => {
    if (!selectedDate) { setFormError("Pick an open date on the calendar first."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locId: loc.id,
          date: selectedDate,
          service: form.service,
          vehicleType: form.vehicleType,
          name: form.name,
          phone: form.phone,
          email: form.email,
          vehicle: form.vehicle,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Something went wrong. Please try again.");
        if (data.conflict) {
          setSelectedDate(null);
          refresh();
        }
        return;
      }
      setConfirmed({
        date: data.booking.date,
        service: data.booking.service,
        vehicleType: data.booking.vehicle_type,
        locId: data.booking.loc_id,
        vehicle: data.booking.vehicle,
        phone: data.booking.phone,
      });
      setView("confirm");
      refresh();
    } catch (e) {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- admin actions ----
  const loadAdminBookings = async () => {
    const res = await fetch("/api/admin/bookings", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setBookings(data.bookings || []);
      return true;
    }
    return false;
  };

  const tryLogin = async () => {
    setLoginError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: passInput }),
    });
    if (res.ok) {
      setPassInput("");
      await loadAdminBookings();
      setView("admin");
    } else {
      const data = await res.json().catch(() => ({}));
      setLoginError(data.error || "That passcode didn't match.");
    }
  };

  const toggleDate = async (iso) => {
    setAdminMsg("");
    const res = await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locId: adminLoc, date: iso }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && data.error) setAdminMsg(data.error);
    refresh();
  };

  const cancelBooking = async (id) => {
    const res = await fetch(`/api/admin/bookings?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      setBookings((b) => b.filter((x) => x.id !== id));
      refresh();
    }
  };

  const selectedService = serviceById(form.service);

  // ---------------- render ----------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-500">
        Loading your calendar…
      </div>
    );
  }

  const header = (
    <header style={{ background: BRAND.black }} className="text-white">
      <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
        <button onClick={() => setView("home")} className="text-left">
          <div className="flex items-baseline gap-2">
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-3xl font-bold tracking-wider uppercase">
              OTTO
            </span>
            <span style={{ color: BRAND.red, fontFamily: "'Barlow Condensed', sans-serif" }} className="text-xl font-bold uppercase tracking-widest">
              Mobile Detailing
            </span>
          </div>
        </button>
        <div className="text-xs text-neutral-400 text-right">
          PA · NC<br />We come to you
        </div>
      </div>
      <div className="h-1" style={{ background: `linear-gradient(to right, ${BRAND.red}, ${BRAND.redDark}, transparent)` }} />
    </header>
  );

  const footer = (
    <footer style={{ background: BRAND.black }} className="mt-10 text-white">
      <div className="max-w-4xl mx-auto px-5 py-8 grid sm:grid-cols-3 gap-6">
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-lg font-bold uppercase tracking-wide mb-2">
            Contact
          </div>
          <div className="text-sm text-neutral-300">📞 {PHONE}</div>
          <div className="text-sm text-neutral-300 mt-1">✉️ {EMAIL}</div>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm font-semibold underline hover:no-underline"
            style={{ color: BRAND.red }}
          >
            ⭐ Review us on Google
          </a>
        </div>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-lg font-bold uppercase tracking-wide mb-2">
            Hours
          </div>
          {HOURS.map(([day, time]) => (
            <div key={day} className="text-sm text-neutral-300 flex justify-between max-w-48">
              <span>{day}</span>
              <span>{time}</span>
            </div>
          ))}
        </div>
        <div className="sm:text-right">
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-lg font-bold uppercase tracking-wide mb-2">
            Areas
          </div>
          <div className="text-sm text-neutral-300">Bucks County, PA</div>
          <div className="text-sm text-neutral-300 mt-1">Lake Norman, NC</div>
        </div>
      </div>
      <div className="border-t border-neutral-800">
        <div className="max-w-4xl mx-auto px-5 py-4 text-xs text-neutral-500 text-center">
          © 2026 Otto Mobile Detailing ·{" "}
          <button onClick={() => { setView("adminLogin"); setLoginError(""); }} className="underline hover:text-white">
            Owner
          </button>
        </div>
      </div>
    </footer>
  );

  // ----- HOME -----
  if (view === "home") {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        {header}
        <main className="max-w-4xl mx-auto px-5 flex-1 w-full">
          <section className="py-12 text-center">
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-5xl font-bold text-neutral-900 uppercase tracking-tight">
              Showroom shine, <span style={{ color: BRAND.red }}>in your driveway</span>
            </h1>
            <p className="mt-3 text-neutral-500 max-w-xl mx-auto">
              Pick your area, choose an open date, and we'll bring the full detail to you.
            </p>
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:shadow"
            >
              <span style={{ color: "#F5B301" }}>★★★★★</span> 5.0 on Google
            </a>
          </section>

          <section className="grid md:grid-cols-2 gap-4 pb-4">
            {LOCATIONS.map((l) => (
              <button
                key={l.id}
                onClick={() => startBooking(l)}
                className="group text-left rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.red }}>{l.state}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-3xl font-bold text-neutral-900 mt-1 uppercase">
                  {l.name}
                </div>
                <div className="text-sm text-neutral-500 mt-2">{l.blurb}</div>
                <div className="mt-4 inline-flex items-center gap-1 font-semibold text-sm group-hover:gap-2 transition-all" style={{ color: BRAND.red }}>
                  Book in {l.name} <span>→</span>
                </div>
              </button>
            ))}
          </section>

          <section className="py-8">
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-3xl font-bold text-neutral-900 uppercase tracking-wide mb-4">
              Meet the Owner
            </h2>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-2xl font-bold text-neutral-900 uppercase">
                Griffin Talomie
              </div>
              <div className="text-sm font-semibold mt-1" style={{ color: BRAND.red }}>
                Owner · Otto Mobile Detailing
              </div>
              <p className="text-neutral-600 mt-3 leading-relaxed">
                Hi, I'm Griffin — a mechanical engineering student at the University of Tennessee with
                professional experience at a dealership detail center working on BMW, Lexus, and Toyota
                vehicles. I'll treat your car like my own, from wash and wax to full interior and
                exterior details.
              </p>
              <p className="text-neutral-600 mt-2 leading-relaxed">
                Best of all, you don't even need to leave your house. I detail your car right in your
                driveway — all I need is access to power and water.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {["Dealership-trained", "BMW · Lexus · Toyota experience", "We come to you"].map((tag) => (
                  <span key={tag} className="rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="py-8">
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-3xl font-bold text-neutral-900 uppercase tracking-wide mb-4">
              Services & Pricing
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {SERVICES.map((s) => (
                <div key={s.id} className="rounded-xl border border-neutral-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-xl font-bold text-neutral-900 uppercase">
                      {s.name}{s.varies ? "*" : ""}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="font-bold text-lg" style={{ color: BRAND.red }}>${s.sedan}</div>
                      <div className="text-xs text-neutral-400 uppercase font-semibold">Sedan</div>
                      <div className="font-bold text-lg mt-1" style={{ color: BRAND.red }}>${s.suv}</div>
                      <div className="text-xs text-neutral-400 uppercase font-semibold">SUV/Truck</div>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {s.items.map((it) => (
                      <li key={it} className="text-sm text-neutral-600 flex gap-2">
                        <span style={{ color: BRAND.red }}>–</span>{it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-400 mt-3">*Price may vary depending on condition of car</p>
          </section>
        </main>
        {footer}
      </div>
    );
  }

  // ----- BOOK -----
  if (view === "book" && loc) {
    const price = selectedService ? priceFor(selectedService, form.vehicleType) : 0;
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        {header}
        <main className="max-w-4xl mx-auto px-5 py-8 flex-1 w-full">
          <button onClick={() => setView("home")} className="text-sm text-neutral-500 hover:text-neutral-700 mb-4">← Change location</button>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-4xl font-bold text-neutral-900 uppercase tracking-tight">
            Book in {loc.name}, {loc.state}
          </h1>
          <p className="text-neutral-500 mt-1 mb-6">
            Highlighted dates are open. One appointment per day. We detail in your driveway — just make sure power and water are accessible.
          </p>

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <Calendar
                month={calMonth}
                year={calYear}
                onPrev={monthNav.prev}
                onNext={monthNav.next}
                isOpen={isOpen(loc.id)}
                isBooked={isBooked(loc.id)}
                onPick={(iso) => { setSelectedDate(iso); setFormError(""); }}
                selected={selectedDate}
                admin={false}
              />
              {selectedDate && (
                <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold" style={{ color: BRAND.redDark }}>
                  Selected: {prettyDate(selectedDate)}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-neutral-900 mb-3">Your details</h2>

              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Vehicle type</label>
              <div className="flex gap-2 mb-3">
                {[["sedan", "Sedan"], ["suv", "SUV / Truck"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setForm({ ...form, vehicleType: val })}
                    className={"flex-1 rounded-lg py-2 text-sm font-semibold border transition-colors " +
                      (form.vehicleType === val ? "text-white border-transparent" : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400")}
                    style={form.vehicleType === val ? { background: BRAND.black } : {}}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Service</label>
              <select
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 mb-1 bg-white"
              >
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — ${priceFor(s, form.vehicleType)}</option>
                ))}
              </select>
              {selectedService && selectedService.varies ? (
                <p className="text-xs text-neutral-400 mb-3">*Price may vary depending on condition of car</p>
              ) : (
                <div className="mb-3" />
              )}

              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 mb-3" placeholder="Full name" />

              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 mb-3" placeholder="(555) 555-5555" />

              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Email (optional)</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 mb-3" placeholder="you@email.com" />

              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Vehicle</label>
              <input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 mb-3" placeholder="2022 Toyota 4Runner" />

              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Notes (optional)</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 mb-3" rows={2}
                placeholder="Pet hair, gated driveway, preferred time…" />

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-sm px-3 py-2 mb-3" style={{ color: BRAND.redDark }}>
                  {formError}
                </div>
              )}

              <button
                onClick={submitBooking}
                disabled={submitting}
                className="w-full rounded-xl text-white font-bold py-3 transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: BRAND.red }}
              >
                {submitting ? "Booking…" : `Request this date — $${price}`}
              </button>
              <p className="text-xs text-neutral-400 mt-2 text-center">We'll call or text to confirm your appointment.</p>
            </div>
          </div>
        </main>
        {footer}
      </div>
    );
  }

  // ----- CONFIRM -----
  if (view === "confirm" && confirmed) {
    const s = serviceById(confirmed.service);
    const l = LOCATIONS.find((x) => x.id === confirmed.locId);
    const price = s ? priceFor(s, confirmed.vehicleType || "sedan") : null;
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        {header}
        <main className="max-w-lg mx-auto px-5 py-16 text-center flex-1 w-full">
          <div className="text-5xl mb-4">✅</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-4xl font-bold text-neutral-900 uppercase">
            You're on the books
          </h1>
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm">
            <div className="text-sm text-neutral-500">Appointment</div>
            <div className="font-bold text-neutral-900">{prettyDate(confirmed.date)}</div>
            <div className="mt-2 text-sm text-neutral-500">Service</div>
            <div className="font-semibold text-neutral-800">
              {s ? s.name : confirmed.service}
              {price !== null && <span style={{ color: BRAND.red }}> — ${price}</span>}
              <span className="text-neutral-400 text-sm"> ({confirmed.vehicleType === "suv" ? "SUV/Truck" : "Sedan"})</span>
            </div>
            <div className="mt-2 text-sm text-neutral-500">Area</div>
            <div className="font-semibold text-neutral-800">{l ? `${l.name}, ${l.state}` : confirmed.locId}</div>
            <div className="mt-2 text-sm text-neutral-500">Vehicle</div>
            <div className="font-semibold text-neutral-800">{confirmed.vehicle}</div>
          </div>
          <p className="text-neutral-500 text-sm mt-4">We'll reach out at {confirmed.phone} to confirm the time.</p>
          <button onClick={() => setView("home")} className="mt-6 rounded-xl text-white font-bold px-6 py-3" style={{ background: BRAND.black }}>
            Back to home
          </button>
        </main>
        {footer}
      </div>
    );
  }

  // ----- ADMIN LOGIN -----
  if (view === "adminLogin") {
    return (
      <div className="min-h-screen bg-neutral-50">
        {header}
        <main className="max-w-sm mx-auto px-5 py-16">
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-3xl font-bold text-neutral-900 uppercase text-center">
            Owner sign-in
          </h1>
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Passcode</label>
            <input
              type="password"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryLogin()}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 mb-3"
              placeholder="Enter passcode"
            />
            {loginError && <div className="text-sm mb-3" style={{ color: BRAND.redDark }}>{loginError}</div>}
            <button onClick={tryLogin} className="w-full rounded-xl text-white font-bold py-3" style={{ background: BRAND.black }}>
              Open dashboard
            </button>
          </div>
          <button onClick={() => setView("home")} className="block mx-auto mt-4 text-sm text-neutral-400 hover:text-neutral-600">
            ← Back to site
          </button>
        </main>
      </div>
    );
  }

  // ----- ADMIN -----
  if (view === "admin") {
    const locBookings = bookings
      .filter((b) => b.loc_id === adminLoc)
      .sort((a, b) => a.date.localeCompare(b.date));

    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        {header}
        <main className="max-w-4xl mx-auto px-5 py-8 flex-1 w-full">
          <div className="flex items-center justify-between mb-6">
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-4xl font-bold text-neutral-900 uppercase tracking-tight">
              Owner dashboard
            </h1>
            <button onClick={() => setView("home")} className="text-sm text-neutral-500 hover:text-neutral-700">
              View site →
            </button>
          </div>

          <div className="flex gap-2 mb-6">
            {LOCATIONS.map((l) => (
              <button
                key={l.id}
                onClick={() => setAdminLoc(l.id)}
                className={
                  "px-4 py-2 rounded-xl font-semibold text-sm " +
                  (adminLoc === l.id ? "text-white" : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400")
                }
                style={adminLoc === l.id ? { background: BRAND.black } : {}}
              >
                {l.name}, {l.state}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <h2 className="font-bold text-neutral-900 mb-2">Set open dates</h2>
              <p className="text-sm text-neutral-500 mb-3">
                Tap a date to open or close it. <span className="font-semibold" style={{ color: BRAND.red }}>Red</span> = open,{" "}
                <span className="font-semibold text-neutral-900">black</span> = booked.
              </p>
              {adminMsg && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-sm px-3 py-2 mb-3" style={{ color: BRAND.redDark }}>
                  {adminMsg}
                </div>
              )}
              <Calendar
                month={calMonth}
                year={calYear}
                onPrev={monthNav.prev}
                onNext={monthNav.next}
                isOpen={isOpen(adminLoc)}
                isBooked={isBooked(adminLoc)}
                onPick={toggleDate}
                selected={null}
                admin={true}
              />
            </div>

            <div>
              <h2 className="font-bold text-neutral-900 mb-2">Upcoming bookings</h2>
              {locBookings.length === 0 && (
                <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
                  No bookings yet for this area. Open some dates to get started.
                </div>
              )}
              <div className="space-y-3">
                {locBookings.map((b) => {
                  const s = serviceById(b.service);
                  const price = s ? priceFor(s, b.vehicle_type || "sedan") : null;
                  return (
                    <div key={b.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-neutral-900">{prettyDate(b.date)}</div>
                          <div className="text-sm text-neutral-600 mt-1">
                            {b.name} · {b.phone}{b.email ? ` · ${b.email}` : ""}
                          </div>
                          <div className="text-sm text-neutral-600">
                            {b.vehicle} <span className="text-neutral-400">({b.vehicle_type === "suv" ? "SUV/Truck" : "Sedan"})</span>
                          </div>
                          <div className="text-sm font-semibold mt-1" style={{ color: BRAND.red }}>
                            {s ? s.name : b.service}{price !== null ? ` — $${price}` : ""}
                          </div>
                          {b.notes && <div className="text-xs text-neutral-400 mt-1">"{b.notes}"</div>}
                        </div>
                        <button
                          onClick={() => cancelBooking(b.id)}
                          className="text-xs text-neutral-400 hover:text-red-600 whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
        {footer}
      </div>
    );
  }

  return null;
}
