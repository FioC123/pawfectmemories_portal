import assert from "node:assert/strict";
import test from "node:test";
import { resolveWhatsAppTemplates } from "./whatsapp-templates.js";

test("missing template keys still produce a message", () => {
  const templates = resolveWhatsAppTemplates(null);
  assert.match(templates.pick_photos, /揀/);
  assert.match(templates.finished, /完成/);
  assert.match(templates.reminder, /聽日/);
  assert.match(templates.balance, /尾數/);
});

test("a saved template replaces only that key", () => {
  const templates = resolveWhatsAppTemplates({ reminder: "自訂提醒 {name}", pick_photos: "   " });
  assert.equal(templates.reminder, "自訂提醒 {name}");
  assert.match(templates.pick_photos, /揀/);
});
