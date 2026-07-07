// Shared business data — edit prices/services here and the whole site updates.

export const BRAND = {
  red: "#D6212B",
  redDark: "#B0121C",
  black: "#111111",
};

export const PHONE = "+1 267-576-2232";
export const EMAIL = "ottocardetailing@gmail.com";
export const GOOGLE_REVIEW_URL = "https://g.page/r/CZ6bOdcsoEFmEBM/review";

export const HOURS = [
  ["Tue\u2013Fri", "3:30 \u2013 6 PM"],
  ["Saturday", "8 AM \u2013 6 PM"],
  ["Sun & Mon", "Closed"],
];

export const LOCATIONS = [
  {
    id: "bucks",
    name: "Bucks County",
    state: "PA",
    blurb: "Serving all of Bucks County & surrounding areas",
  },
  {
    id: "lakenorman",
    name: "Lake Norman",
    state: "NC",
    blurb: "Serving Mooresville, Cornelius, Davidson & Huntersville",
  },
];

export const SERVICES = [
  {
    id: "basic-wash",
    name: "Basic Wash",
    sedan: 55,
    suv: 75,
    items: ["pH Neutral Hand Wash", "Hand Wash Rims", "Exterior & Interior Window Clean", "Tire Shine", "Spray Wax"],
    varies: false,
  },
  {
    id: "basic-interior",
    name: "Basic Interior",
    sedan: 60,
    suv: 80,
    items: ["Vacuum", "Mat Cleaning & Carpet Shampoo", "Interior & Exterior Window Clean", "All Surface Wipe Down"],
    varies: false,
  },
  {
    id: "premium-exterior",
    name: "Premium Exterior",
    sedan: 110,
    suv: 130,
    items: ["pH Neutral Hand Wash", "Hand Wash Rims", "Exterior & Interior Window Clean", "Tire Shine", "Clay Bar (Paint Decontamination)", "Finishing Wax Application"],
    varies: true,
  },
  {
    id: "premium-interior",
    name: "Premium Interior",
    sedan: 140,
    suv: 160,
    items: ["Vacuum", "Mat Cleaning & Carpet Shampoo", "Interior & Exterior Window Clean", "All Surface Wipe Down", "Surface Steam Clean", "Trim & Seat Protectant", "Carpet & Seat Extraction"],
    varies: true,
  },
  {
    id: "premium-full",
    name: "Premium Full Detail",
    sedan: 270,
    suv: 310,
    items: ["Premium Exterior Detail", "Premium Interior Detail"],
    varies: true,
  },
  {
    id: "deluxe-paint",
    name: "Deluxe Paint Care",
    sedan: 750,
    suv: 800,
    items: ["Hand Wash", "Hand Wash Wheels", "Exterior & Interior Window Clean", "Clay Bar (Paint Decontamination, Bug & Tar Removal)", "Two-step Paint Correction", "Spray Ceramic Coating (12\u201324 months)", "Tire Shine"],
    varies: true,
  },
];

export function priceFor(service, vehicleType) {
  return vehicleType === "suv" ? service.suv : service.sedan;
}

export function serviceById(id) {
  return SERVICES.find((s) => s.id === id);
}

// Multiple services are stored as a comma-joined string of ids, e.g. "basic-wash,premium-interior"
export function servicesFromString(str) {
  return (str || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => serviceById(id))
    .filter(Boolean);
}

export function totalPriceFor(serviceIds, vehicleType) {
  return serviceIds
    .map((id) => serviceById(id))
    .filter(Boolean)
    .reduce((sum, s) => sum + priceFor(s, vehicleType), 0);
}
