import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

/**
 * Sets default session persistence for the full app.
 */
async function initializePersistence() {
  await setPersistence(auth, browserLocalPersistence);
}

/**
 * Checks if a username is already taken by another user.
 */
async function isUsernameAvailable(username) {
  const usersRef = collection(db, 'users');
  const usernameQuery = query(usersRef, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(usernameQuery);
  return snapshot.empty;
}

/**
 * Saves online status and last seen state.
 */
async function updateOnlineStatus(uid, onlineStatus) {
  await updateDoc(doc(db, 'users', uid), {
    onlineStatus,
    lastSeenAt: serverTimestamp()
  });
}

if (loginForm) {
  const errorEl = document.getElementById('login-error');

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      await initializePersistence();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await updateOnlineStatus(credential.user.uid, true);
      window.location.href = 'dashboard.html';
    } catch (error) {
      errorEl.textContent = error.message;
    }
  });
}

if (signupForm) {
  const errorEl = document.getElementById('signup-error');
  const successEl = document.getElementById('signup-success');

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    successEl.textContent = '';

    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const username = document.getElementById('signup-username').value.trim().toLowerCase();
    const displayName = document.getElementById('signup-display-name').value.trim();
    const emoji = document.getElementById('signup-emoji').value.trim();

    try {
      const available = await isUsernameAvailable(username);
      if (!available) {
        throw new Error('That username is already in use. Please choose another one.');
      }

      await initializePersistence();
      const credential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        email,
        username,
        displayName,
        emoji,
        createdAt: serverTimestamp(),
        onlineStatus: true,
        lastSeenAt: serverTimestamp()
      });

      successEl.textContent = 'Signup successful! Redirecting to dashboard...';
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 900);
    } catch (error) {
      errorEl.textContent = error.message;
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  const path = window.location.pathname;

  if (user && (path.endsWith('/index.html') || path.endsWith('/signup.html') || path === '/')) {
    window.location.href = 'dashboard.html';
  }
});

window.addEventListener('beforeunload', () => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    // Fire-and-forget best effort online status update.
    updateOnlineStatus(currentUser.uid, false);
  }
});
