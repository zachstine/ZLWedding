import { firebaseConfig } from "./firebase-config.js";

const venue = {
  name: "The Big Creek Lodge",
  address: "1068 Wilson Farm Rd, Westfield, NC 27053",
  coordinates: [36.4754, -80.4467]
};

const directions = document.querySelector("#directions-link");
directions.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`;

const map = L.map("map", { scrollWheelZoom: false }).setView(venue.coordinates, 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
L.marker(venue.coordinates).addTo(map).bindPopup(`<strong>${venue.name}</strong><br>${venue.address}`).openPopup();

const form = document.querySelector("#rsvp-form");
const status = document.querySelector("#form-status");
const attendanceInputs = form.elements.attendance;
const guestCountField = document.querySelector("#guest-count-field");
const dietaryField = document.querySelector("#dietary-field");
let db = null;

async function connectFirebase() {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) return;
  const [{ initializeApp }, { getFirestore, collection, addDoc, serverTimestamp }] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")
  ]);
  const app = initializeApp(firebaseConfig);
  db = { firestore: getFirestore(app), collection, addDoc, serverTimestamp };
}

connectFirebase().catch(() => setStatus("The RSVP service is temporarily unavailable. Please try again shortly.", "error"));

function setStatus(message, type = "") { status.textContent = message; status.className = `form-status ${type}`; }
function updateAttendanceFields() {
  const attending = form.elements.attendance.value === "attending";
  guestCountField.hidden = !attending;
  dietaryField.hidden = !attending;
  form.elements.guestCount.disabled = !attending;
  form.elements.dietaryNeeds.disabled = !attending;
}
attendanceInputs.forEach(input => input.addEventListener("change", updateAttendanceFields));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = new FormData(form);
  const rsvp = {
    name: data.get("name").trim(), email: data.get("email").trim().toLowerCase(),
    attendance: data.get("attendance"),
    guestCount: data.get("attendance") === "attending" ? Number(data.get("guestCount")) : 0,
    dietaryNeeds: data.get("attendance") === "attending" ? data.get("dietaryNeeds").trim() : "",
    message: data.get("message").trim()
  };
  const submit = form.querySelector("button[type=submit]");
  submit.disabled = true; setStatus("Sending your RSVP…");
  try {
    if (!db) throw new Error("Firebase has not been configured");
    await db.addDoc(db.collection(db.firestore, "rsvps"), { ...rsvp, createdAt: db.serverTimestamp() });
    form.reset(); updateAttendanceFields(); setStatus("Thank you — your RSVP is on its way!", "success");
  } catch (error) {
    setStatus("We couldn’t save your RSVP. Please check your connection and try again.", "error");
  } finally { submit.disabled = false; }
});

document.querySelector(".menu-button").addEventListener("click", (event) => {
  const nav = document.querySelector("#site-nav"); const open = nav.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});
