import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const usersGrid = document.getElementById('users-grid');
const usersEmpty = document.getElementById('users-empty');
const welcomeText = document.getElementById('welcome-text');
const logoutBtn = document.getElementById('logout-btn');

function setupGuidePanel() {
  const guideTab = document.getElementById('guide-tab');
  const panel = document.getElementById('guide-panel');
  const triggers = panel.querySelectorAll('.accordion-trigger');

  guideTab.addEventListener('click', () => panel.classList.toggle('hidden'));
  triggers.forEach((button) => {
    button.addEventListener('click', () => {
      button.parentElement.classList.toggle('active');
    });
  });
}

async function setOnlineStatus(uid, onlineStatus) {
  await updateDoc(doc(db, 'users', uid), {
    onlineStatus,
    lastSeenAt: serverTimestamp()
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  setupGuidePanel();
  await setOnlineStatus(user.uid, true);

  const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
  if (currentUserDoc.exists()) {
    const me = currentUserDoc.data();
    welcomeText.textContent = `Logged in as @${me.username}`;
  }

  const usersQuery = query(collection(db, 'users'), orderBy('username'));
  onSnapshot(usersQuery, (snapshot) => {
    usersGrid.innerHTML = '';

    const others = snapshot.docs
      .map((item) => item.data())
      .filter((person) => person.uid !== user.uid);

    usersEmpty.classList.toggle('hidden', others.length > 0);

    for (const person of others) {
      const card = document.createElement('article');
      card.className = 'user-card';
      card.innerHTML = `
        <div class="user-emoji">${person.emoji || '🙂'}</div>
        <h3>${person.displayName}</h3>
        <p class="subtitle">@${person.username}</p>
        <p class="subtitle">${person.onlineStatus ? 'Online' : 'Offline'}</p>
      `;
      card.addEventListener('click', () => {
        window.location.href = `profile.html?uid=${encodeURIComponent(person.uid)}`;
      });
      usersGrid.appendChild(card);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await setOnlineStatus(user.uid, false);
      await signOut(auth);
      window.location.href = 'index.html';
    } catch (error) {
      alert(error.message);
    }
  });

  window.addEventListener('beforeunload', () => {
    setOnlineStatus(user.uid, false);
  });
});
