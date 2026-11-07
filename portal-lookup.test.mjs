import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeFirestoreFields,
  firestorePortalDocumentUrl,
  lookupPortalByPhone
} from "./portal-lookup.js";

const PROJECT = "pawfect-memories-2c8a0";

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body
  };
}

test("decodes the portal document shape the guest pages already read", () => {
  const data = decodeFirestoreFields({
    clientName: { stringValue: "Ada" },
    updatedAt: { timestampValue: "2026-11-04T00:00:00Z" },
    orders: {
      mapValue: {
        fields: {
          order1: {
            mapValue: {
              fields: {
                id: { stringValue: "order1" },
                price: { integerValue: "1500" },
                depositAmount: { nullValue: null },
                depositPaid: { booleanValue: false },
                pets: {
                  arrayValue: {
                    values: [
                      { mapValue: { fields: { name: { stringValue: "Mochi" }, photoUrl: { stringValue: "" } } } }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  assert.equal(data.clientName, "Ada");
  assert.equal(data.orders.order1.price, 1500);
  assert.equal(data.orders.order1.depositAmount, null);
  assert.equal(data.orders.order1.depositPaid, false);
  assert.equal(data.orders.order1.pets[0].name, "Mochi");
  assert.deepEqual(decodeFirestoreFields({ empty: { arrayValue: {} } }).empty, []);
});

test("document url is one get, never a collection list", () => {
  const url = firestorePortalDocumentUrl(PROJECT, "90000001");
  assert.equal(
    url,
    "https://firestore.googleapis.com/v1/projects/pawfect-memories-2c8a0/databases/(default)/documents/portalByPhone/90000001"
  );
  assert.equal(url.includes("?"), false);
  assert.equal(url.includes("runQuery"), false);
  assert.throws(() => firestorePortalDocumentUrl(PROJECT, "90000001/../Clients"));
  assert.throws(() => firestorePortalDocumentUrl("evil/other", "90000001"));
});

test("a hung client read still returns the document", async () => {
  const urls = [];
  const started = Date.now();
  const result = await lookupPortalByPhone("9000-0001", {
    projectId: PROJECT,
    deadlineMs: 500,
    readSdk: () => new Promise(() => {}),
    fetchImpl: async (url) => {
      urls.push(url);
      return jsonResponse(200, {
        fields: {
          clientName: { stringValue: "Ada" },
          orders: { mapValue: { fields: { order1: { mapValue: { fields: { id: { stringValue: "order1" } } } } } } }
        }
      });
    }
  });
  assert.ok(Date.now() - started < 400);
  assert.deepEqual(urls, [
    "https://firestore.googleapis.com/v1/projects/pawfect-memories-2c8a0/databases/(default)/documents/portalByPhone/90000001"
  ]);
  assert.equal(result.exists, true);
  assert.equal(result.data.orders.order1.id, "order1");
});

test("a missing document is not found, including when the client read hangs", async () => {
  const result = await lookupPortalByPhone("90000001", {
    projectId: PROJECT,
    deadlineMs: 500,
    readSdk: () => new Promise(() => {}),
    fetchImpl: async () => jsonResponse(404, { error: { status: "NOT_FOUND" } })
  });
  assert.deepEqual(result, { exists: false, data: null });
});

test("a client hit is used without waiting for the other read", async () => {
  let restCalled = false;
  const result = await lookupPortalByPhone("90000001", {
    projectId: PROJECT,
    deadlineMs: 500,
    readSdk: async () => ({ exists: true, data: { clientName: "Ada", orders: {} } }),
    fetchImpl: () => {
      restCalled = true;
      return new Promise(() => {});
    }
  });
  assert.equal(result.exists, true);
  assert.equal(result.data.clientName, "Ada");
  assert.equal(restCalled, true);
});

test("client and document failures end in an error", async () => {
  const started = Date.now();
  await assert.rejects(
    () => lookupPortalByPhone("90000001", {
      projectId: PROJECT,
      deadlineMs: 80,
      readSdk: async () => {
        throw Object.assign(new Error("offline"), { code: "unavailable" });
      },
      fetchImpl: async () => jsonResponse(403, { error: { status: "PERMISSION_DENIED" } })
    }),
    (error) => error.code === "unavailable"
  );
  assert.ok(Date.now() - started < 400);
});

test("two silent reads reject at the deadline", async () => {
  const started = Date.now();
  await assert.rejects(
    () => lookupPortalByPhone("90000001", {
      projectId: PROJECT,
      deadlineMs: 50,
      readSdk: () => new Promise(() => {}),
      fetchImpl: () => new Promise(() => {})
    }),
    (error) => error.code === "deadline-exceeded"
  );
  assert.ok(Date.now() - started < 400);
});

test("a short number never starts a read", async () => {
  let calls = 0;
  await assert.rejects(
    () => lookupPortalByPhone("123", {
      projectId: PROJECT,
      readSdk: () => {
        calls += 1;
        return Promise.resolve({ exists: false, data: null });
      },
      fetchImpl: () => {
        calls += 1;
        return Promise.resolve(jsonResponse(404, {}));
      }
    }),
    (error) => error.code === "invalid-argument"
  );
  assert.equal(calls, 0);
});
