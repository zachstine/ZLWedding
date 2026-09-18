import { firebaseConfig } from "./firebase-config.js";

const venue = {
  name: "The Big Creek Lodge",
  address: "1068 Wilson Farm Rd, Westfield, NC 27053"
};

const directions = document.querySelector("#directions-link");
directions.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`;

// Change a location's x/y values to move its marker across the aerial image.
// x is the distance from the left edge; y is the distance from the top edge.
const propertyLocations = [
  { id: "big-creek-lodge", name: "Big Creek Lodge", x: 19, y: 40, type: "events-lodging", details: ["Rehearsal", "Ceremony", "Reception", "9 Rooms"] },
  { id: "green-cabin", name: "Green Cabin", x: 35, y: 22, type: "lodging", details: ["Sleeps 6"] },
  { id: "farmhouse", name: "The Farmhouse", x: 46, y: 55, type: "lodging", details: ["Sleeps 16"] },
  { id: "chicken-coop", name: "The Chicken Coop", x: 57, y: 90, type: "lodging", details: ["5 Rooms"] }
];

const propertyMap = document.querySelector("#property-map");
const markersContainer = document.querySelector("#property-markers");
const propertyCard = document.querySelector("#property-card");
let selectedMarker = null;

function closePropertyCard({ returnFocus = false } = {}) {
  propertyCard.hidden = true;
  if (selectedMarker) {
    selectedMarker.classList.remove("is-selected");
    selectedMarker.setAttribute("aria-pressed", "false");
  }
  if (returnFocus && selectedMarker) selectedMarker.focus();
  selectedMarker = null;
}

function showPropertyCard(location, marker) {
  if (selectedMarker === marker) {
    closePropertyCard();
    return;
  }
  if (selectedMarker) {
    selectedMarker.classList.remove("is-selected");
    selectedMarker.setAttribute("aria-pressed", "false");
  }
  selectedMarker = marker;
  marker.classList.add("is-selected");
  propertyCard.style.setProperty("--card-x", `${location.x}%`);
  propertyCard.style.setProperty("--card-y", `${location.y}%`);
  propertyCard.innerHTML = `
    <button class="property-card__close" type="button" aria-label="Close ${location.name} details">×</button>
    <h3>${location.name}</h3>
    <ul>${location.details.map(detail => `<li>${detail}</li>`).join("")}</ul>
  `;
  propertyCard.hidden = false;
  propertyCard.querySelector(".property-card__close").addEventListener("click", () => closePropertyCard({ returnFocus: true }));
}

propertyLocations.forEach((location) => {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "property-marker";
  marker.dataset.locationId = location.id;
  marker.style.left = `${location.x}%`;
  marker.style.top = `${location.y}%`;
  marker.setAttribute("aria-label", `View details for ${location.name}`);
  marker.setAttribute("aria-pressed", "false");
  marker.innerHTML = `<svg class="property-marker__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9Zm6 9h6v-6H9v6Z"/></svg><span class="property-marker__tooltip">${location.name}</span>`;
  marker.addEventListener("click", (event) => {
    event.stopPropagation();
    showPropertyCard(location, marker);
    marker.setAttribute("aria-pressed", String(selectedMarker === marker));
  });
  markersContainer.append(marker);
});

propertyMap.addEventListener("click", (event) => {
  if (event.target === propertyMap || event.target.classList.contains("property-map__image")) closePropertyCard();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !propertyCard.hidden) closePropertyCard({ returnFocus: true });
});

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
  import("https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js")
    .then(async ({ getAnalytics, isSupported }) => {
      if (await isSupported()) getAnalytics(app);
    })
    .catch(() => {});
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
