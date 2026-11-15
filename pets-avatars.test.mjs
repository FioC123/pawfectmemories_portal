import assert from "node:assert/strict";
import test from "node:test";
import { clientGalleryHref, clientGalleryLink, petPhotoSrc, renderPetLines, safeHttpUrl } from "./pets-avatars.js";

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

test("photo urls only allow http and https", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), "");
  assert.equal(safeHttpUrl("https://example.com/a.jpg"), "https://example.com/a.jpg");
  assert.match(petPhotoSrc({ photoUrl: "javascript:alert(1)" }), /^https:\/\//);
});

test("a drive link shows from pick-photos onward and stays hidden before that", () => {
  const drive = "https://drive.google.com/drive/folders/abc?usp=sharing&resourcekey=k";
  assert.equal(clientGalleryHref({ status: "col-pick-photos", galleryUrl: `\u200b${drive}` }), drive);
  assert.equal(clientGalleryHref({ status: "col-final-retouch", galleryUrl: drive }), drive);
  assert.equal(clientGalleryHref({ status: "col-completed", galleryUrl: drive }), drive);
  assert.equal(clientGalleryHref({ status: "col-new", galleryUrl: drive }), "");
  assert.equal(clientGalleryHref({ status: "col-basic-edit", galleryUrl: drive }), "");
  assert.equal(clientGalleryHref({ status: "col-completed", galleryUrl: "javascript:alert(1)" }), "");
  assert.equal(clientGalleryHref({ status: "col-completed", galleryUrl: "drive.google.com/drive/folders/abc" }), "");
  assert.equal(clientGalleryHref({ status: "col-completed", galleryUrl: "" }), "");
  const html = clientGalleryLink({ status: "col-completed", galleryUrl: drive }, "album");
  assert.match(html, /href="https:\/\/drive\.google\.com\/drive\/folders\/abc\?usp=sharing&amp;resourcekey=k"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.equal(clientGalleryLink({ status: "col-new", galleryUrl: drive }, "album"), "");
});

test("a booking with no pets still renders one aligned row", () => {
  const html = renderPetLines([]);
  assert.equal(html.match(/class="pm-pet"/g).length, 1);
  assert.match(html, /class="pm-pet-name">Unknown Pet</);
});
