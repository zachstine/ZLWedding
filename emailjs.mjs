import { emailJsConfig } from "./emailjs-config.mjs";

export function confirmationDetails(rsvp) {
  const lines = [
    `Attendance: ${rsvp.attendance === "attending" ? "Joyfully accepts" : "Regretfully declines"}`
  ];
  if (rsvp.attendance === "attending") {
    lines.push(
      `Guests attending: ${rsvp.guestCount}`,
      `Dietary needs: ${rsvp.dietaryNeeds || "None provided"}`,
      `Rehearsal dinner on Friday: ${rsvp.rehearsalDinner === "yes" ? "Yes" : "No"}`,
      `Staying after the reception dinner: ${rsvp.stayingAfterReceptionDinner === "yes" ? "Yes" : "No"}`,
      `Planning to drink alcohol: ${rsvp.drinkingAlcohol === "yes" ? "Yes" : "No"}`
    );
  }
  if (rsvp.message) lines.push(`Message: ${rsvp.message}`);
  return lines.join("\n");
}

export function emailConfirmationConfigured() {
  return Object.values(emailJsConfig).every(Boolean);
}

export async function sendRsvpConfirmation(rsvp) {
  if (!emailConfirmationConfigured()) throw new Error("EmailJS is not configured");

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: emailJsConfig.serviceId,
      template_id: emailJsConfig.templateId,
      user_id: emailJsConfig.publicKey,
      template_params: {
        to_email: rsvp.email,
        to_name: rsvp.name,
        email: rsvp.email,
        name: rsvp.name,
        rsvp_details: confirmationDetails(rsvp)
      }
    })
  });
  if (!response.ok) {
    const reason = (await response.text()).slice(0, 300);
    throw new Error(`EmailJS returned HTTP ${response.status}: ${reason}`);
  }
}
