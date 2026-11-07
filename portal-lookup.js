// Guest phone lookup.
//
// getDoc() follows a WebChannel listen stream and does not settle if that
// stream stays silent. firebase-js-sdk 10.8 already turns on
// experimentalAutoDetectLongPolling inside getFirestore(), and that detector
// never abandons a stream that stays open without a payload. The button that
// awaits getDoc() then stays on "搜尋中..." forever.
//
// Rules allow get of one portalByPhone/{phone} document and deny list. This
// races the client read with that same document GET so a silent stream cannot
// hold the screen open. Callers keep their own success and error copy.

import { isPortalPhoneKey, normalizePhone } from "./phone.js";

const DEFAULT_DEADLINE_MS = 6000;

function coded(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function firestorePortalDocumentUrl(projectId, phone) {
  if (!/^[a-z0-9-]+$/.test(String(projectId || ""))) {
    throw coded("invalid project", "invalid-argument");
  }
  if (!isPortalPhoneKey(phone)) {
    throw coded("invalid phone", "invalid-argument");
  }
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/portalByPhone/${phone}`;
}

export function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value) {
    return decodeFirestoreFields(value.mapValue && value.mapValue.fields);
  }
  if ("arrayValue" in value) {
    const values = (value.arrayValue && value.arrayValue.values) || [];
    return values.map((item) => decodeFirestoreValue(item));
  }
  return null;
}

export function decodeFirestoreFields(fields) {
  const data = {};
  if (!fields || typeof fields !== "object") return data;
  for (const [key, value] of Object.entries(fields)) {
    data[key] = decodeFirestoreValue(value);
  }
  return data;
}

export function portalResultFromSnapshot(snap) {
  const exists = !!(snap && typeof snap.exists === "function" && snap.exists());
  return { exists, data: exists ? snap.data() : null };
}

export async function lookupPortalByPhone(rawPhone, options = {}) {
  const phone = normalizePhone(rawPhone);
  if (!isPortalPhoneKey(phone)) throw coded("invalid phone", "invalid-argument");

  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const controller = new AbortController();
  const attempts = [
    () => readPortalRest(phone, {
      projectId: options.projectId,
      fetchImpl,
      signal: controller.signal
    })
  ];
  if (typeof options.readSdk === "function") {
    attempts.push(() => options.readSdk(phone));
  }

  try {
    return await firstResult(attempts, deadlineMs);
  } finally {
    controller.abort();
  }
}

async function readPortalRest(phone, { projectId, fetchImpl, signal }) {
  const response = await fetchImpl(firestorePortalDocumentUrl(projectId, phone), {
    method: "GET",
    credentials: "omit",
    cache: "no-store",
    signal
  });
  if (response.status === 404) return { exists: false, data: null };
  if (!response.ok) throw coded("portal rest failed", "unavailable");
  const body = await response.json();
  return { exists: true, data: decodeFirestoreFields(body && body.fields) };
}

function firstResult(starters, deadlineMs) {
  return new Promise((resolve, reject) => {
    let pending = starters.length;
    let finished = false;
    const timer = setTimeout(() => {
      settle(reject, coded("lookup timed out", "deadline-exceeded"));
    }, deadlineMs);

    function settle(fn, value) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      fn(value);
    }

    function failOne() {
      pending -= 1;
      if (pending === 0) settle(reject, coded("lookup failed", "unavailable"));
    }

    for (const start of starters) {
      const pendingPromise = Promise.resolve().then(start);
      pendingPromise.then(
        (result) => {
          if (!result || typeof result.exists !== "boolean") {
            failOne();
            return;
          }
          settle(resolve, {
            exists: result.exists,
            data: result.exists ? (result.data || {}) : null
          });
        },
        () => failOne()
      );
    }
  });
}
