// Customer pages may get one portalByPhone/{phone} document and may not list
// Orders or Clients. Staff writes this mirror whenever a booking changes.
// The document holds only what the customer tracker already shows.

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { isPortalPhoneKey, normalizePhone } from "./phone.js";

function text(value) {
  return value == null ? "" : String(value);
}

export function publicOrderView(orderId, order = {}) {
  const pets = Array.isArray(order.pets)
    ? order.pets.map((pet) => ({
        name: text(pet && pet.name),
        breed: text(pet && pet.breed),
        type: text(pet && pet.type),
        photoUrl: text(pet && pet.photoUrl)
      }))
    : [];
  const depositMissing = order.depositAmount == null || order.depositAmount === "";
  return {
    id: String(orderId),
    status: text(order.status) || "col-new",
    pets,
    petName: text(order.petName),
    petBreed: text(order.petBreed),
    photoUrl: text(order.photoUrl),
    shootDate: text(order.shootDate),
    shootTime: text(order.shootTime),
    shootLocation: text(order.shootLocation),
    studio: text(order.studio),
    package: text(order.package),
    submissionDate: text(order.submissionDate),
    product: text(order.product),
    notes: text(order.notes),
    extraPaxCount: Number(order.extraPaxCount || 0),
    kidsCount: Number(order.kidsCount || 0),
    price: Number(order.price || 0),
    depositAmount: depositMissing ? null : Number(order.depositAmount),
    paymentStatus: text(order.paymentStatus),
    depositPaid: !!order.depositPaid,
    galleryUrl: text(order.galleryUrl)
  };
}

function portalRef(db, phone) {
  const key = normalizePhone(phone);
  if (!isPortalPhoneKey(key)) return null;
  return { key, ref: doc(db, "portalByPhone", key) };
}

function portalDocument(clientName, orders) {
  return {
    clientName,
    orders,
    updatedAt: new Date().toISOString()
  };
}

// The guest page reads this one document. Status and the album URL are
// separate saves, and each used to read-then-replace the whole document, so
// the slower save dropped the other field. A transaction retries on that race.
export async function upsertPortalOrder(db, { phone, clientName, orderId, order }) {
  const target = portalRef(db, phone);
  if (!target || !orderId) return;
  const view = publicOrderView(orderId, order);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(target.ref);
    const prev = snap.exists() ? (snap.data().orders || {}) : {};
    const orders = { ...prev, [orderId]: view };
    const name = text(clientName) || (snap.exists() ? text(snap.data().clientName) : "");
    tx.set(target.ref, portalDocument(name, orders));
  });
}

export async function removePortalOrder(db, phone, orderId) {
  const target = portalRef(db, phone);
  if (!target || !orderId) return;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(target.ref);
    if (!snap.exists()) return;
    const orders = { ...(snap.data().orders || {}) };
    delete orders[orderId];
    if (Object.keys(orders).length === 0) {
      tx.delete(target.ref);
      return;
    }
    tx.set(target.ref, portalDocument(text(snap.data().clientName), orders));
  });
}

export async function movePortalOrder(db, { fromPhone, toPhone, clientName, orderId, order }) {
  const fromKey = normalizePhone(fromPhone);
  const toKey = normalizePhone(toPhone);
  if (fromKey && fromKey !== toKey) await removePortalOrder(db, fromKey, orderId);
  await upsertPortalOrder(db, { phone: toPhone, clientName, orderId, order });
}

export async function patchPortalOrder(db, phone, orderId, partial) {
  const target = portalRef(db, phone);
  if (!target || !orderId || !partial) return false;
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(target.ref);
    if (!snap.exists()) return false;
    const orders = { ...(snap.data().orders || {}) };
    if (!orders[orderId]) return false;
    orders[orderId] = { ...orders[orderId], ...partial };
    tx.set(target.ref, portalDocument(text(snap.data().clientName), orders));
    return true;
  });
}

// Staff-only rebuild after rules are deployed, or after a phone correction.
export async function rebuildPortalIndex(db) {
  const [ordersSnap, clientsSnap, portalSnap] = await Promise.all([
    getDocs(collection(db, "Orders")),
    getDocs(collection(db, "Clients")),
    getDocs(collection(db, "portalByPhone"))
  ]);
  const clients = {};
  for (const item of clientsSnap.docs) {
    const data = item.data();
    const phone = normalizePhone(data.phone || "");
    if (isPortalPhoneKey(phone) && phone !== (data.phone || "")) {
      await updateDoc(item.ref, { phone });
      data.phone = phone;
    }
    clients[item.id] = data;
  }

  const buckets = new Map();
  ordersSnap.forEach((item) => {
    const order = item.data();
    const client = clients[order.clientId] || {};
    const phone = normalizePhone(client.phone || "");
    if (!isPortalPhoneKey(phone)) return;
    if (!buckets.has(phone)) buckets.set(phone, { clientName: text(client.name), orders: {} });
    const bucket = buckets.get(phone);
    if (client.name) bucket.clientName = text(client.name);
    bucket.orders[item.id] = publicOrderView(item.id, order);
  });

  for (const [phone, bucket] of buckets) {
    await setDoc(doc(db, "portalByPhone", phone), {
      clientName: bucket.clientName,
      orders: bucket.orders,
      updatedAt: new Date().toISOString()
    });
  }
  for (const item of portalSnap.docs) {
    if (!buckets.has(item.id)) await deleteDoc(item.ref);
  }
  return buckets.size;
}
