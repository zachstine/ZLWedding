import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmationDetails } from "./emailjs.mjs";

test("attending email includes every RSVP answer", () => {
  const details = confirmationDetails({
    attendance: "attending", guestCount: 2, dietaryNeeds: "Vegetarian",
    rehearsalDinner: "yes", stayingAfterReceptionDinner: "no",
    drinkingAlcohol: "yes", message: "Looking forward to it!"
  });
  for (const answer of [
    "Joyfully accepts", "Guests attending: 2", "Vegetarian",
    "Rehearsal dinner on Friday: Yes", "Staying after the reception dinner: No",
    "Planning to drink alcohol: Yes", "Looking forward to it!"
  ]) assert.ok(details.includes(answer));
});

test("declining email omits unanswered follow-up questions", () => {
  const details = confirmationDetails({ attendance: "declined", message: "" });
  assert.ok(details.includes("Regretfully declines"));
  assert.ok(!details.includes("Guests attending:"));
  assert.ok(!details.includes("Rehearsal dinner on Friday:"));
});
