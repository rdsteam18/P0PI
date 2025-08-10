// auth.js
import { auth, provider, db } from "./firebase-config.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// currentUser is module-scoped and accessible via getCurrentUser()
let currentUser = null;

export function getCurrentUser() { return currentUser; }

// Save profile (also store lowercase name for search)
async function saveUserProfile(user) {
  if (!user || !user.uid) return;
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    name: user.displayName || "No Name",
    nameLower: (user.displayName || "No Name").toLowerCase(),
    email: user.email || "",
    photo: user.photoURL || "",
    friends: [],
    friendRequests: [],
    blockedUsers: [],
    createdAt: new Date().toISOString()
  }, { merge: true });
}

// login button
const loginBtn = document.getElementById('loginBtn');
loginBtn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error('Login error', err);
    alert('Login failed: ' + (err.message || err));
  }
});

// logout will be handled via UI button created elsewhere calling signOut(auth)
export async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Logout error', err);
  }
}

// when auth state changes update currentUser and dispatch event
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    await saveUserProfile(user);
  }
  // inform other modules
  window.dispatchEvent(new CustomEvent('authChanged', { detail: user }));
});
