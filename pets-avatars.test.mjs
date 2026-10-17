import assert from "node:assert/strict";
import test from "node:test";
import { renderPetLines } from "./pets-avatars.js";

function names(html) {
  return [...html.matchAll(/class="pm-pet-name">([^<]*)</g)].map((match) => match[1]);
}

test("each pet is its own photo and name row", () => {
  const html = renderPetLines([
    { name: "Mochi", photoUrl: "https://example.com/mochi.jpg" },
    { name: "Luna", photoUrl: "https://example.com/luna.jpg" }
  ]);
  assert.equal(html.match(/class="pm-pet"/g).length, 2);
  assert.equal(html.match(/class="pm-pet-photo"/g).length, 2);
  assert.deepEqual(names(html), ["Mochi", "Luna"]);
  assert.match(html, /src="https:\/\/example.com\/mochi.jpg"/);
});

test("rows share one markup shape for a single pet and a stack", () => {
  const single = renderPetLines([{ name: "Mochi", photoUrl: "" }]);
  const stack = renderPetLines([
    { name: "Mochi", photoUrl: "" },
    { name: "Luna", photoUrl: "" },
    { name: "Boba", photoUrl: "" }
  ]);
  assert.match(single, /^<div class="pm-pets"><div class="pm-pet">/);
  assert.match(stack, /^<div class="pm-pets"><div class="pm-pet">/);
  assert.equal(single.match(/class="pm-pet-photo"/g).length, 1);
  assert.equal(stack.match(/class="pm-pet-photo"/g).length, 3);
});

test("a fourth pet stays on an aligned +K row", () => {
  const html = renderPetLines([
    { name: "Mochi", photoUrl: "" },
    { name: "Luna", photoUrl: "" },
    { name: "Boba", photoUrl: "" },
    { name: 'Kiki "Kit"', photoUrl: "" }
  ], { maxVisible: 3 });
  assert.equal(html.match(/class="pm-pet-photo"/g).length, 3);
  assert.match(html, /class="pm-pet-more"[^>]*>\+1</);
  assert.match(html, /title="Kiki &quot;Kit&quot;"/);
  assert.deepEqual(names(html), ["Mochi", "Luna", "Boba", "Kiki &quot;Kit&quot;"]);
});

test("a booking with no pets still renders one aligned row", () => {
  const html = renderPetLines([]);
  assert.equal(html.match(/class="pm-pet"/g).length, 1);
  assert.match(html, /class="pm-pet-name">Unknown Pet</);
});
