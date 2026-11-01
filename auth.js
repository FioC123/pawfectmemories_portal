import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ADMIN_EMAIL, auth } from "./firebase.js";

export function isAdminUser(user) {
  return !!user && String(user.email || "").toLowerCase() === ADMIN_EMAIL;
}

// Resolves the restored session before any admin page reads Firestore.
export async function requireAdmin() {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!isAdminUser(user)) {
    window.location.replace("login.html");
    return null;
  }
  return user;
}

export async function loginWithPassword(password) {
  const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
  if (!isAdminUser(cred.user)) {
    await signOut(auth);
    const error = new Error("not-admin");
    error.code = "auth/not-admin";
    throw error;
  }
  return cred.user;
}

export async function logoutAdmin() {
  await signOut(auth);
  window.location.replace("login.html");
}
