import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const params = new URLSearchParams(window.location.search);
const targetUid = params.get('uid');

const profileEmoji = document.getElementById('profile-emoji');
const profileDisplayName = document.getElementById('profile-display-name');
const profileUsername = document.getElementById('profile-username');
const chatBtn = document.getElementById('chat-btn');
const profileError = document.getElementById('profile-error');
const backBtn = document.getElementById('back-btn');

function setupGuidePanel() {
  const guideTab = document.getElementById('guide-tab');
  const panel = document.getElementById('guide-panel');
  const triggers = panel.querySelectorAll('.accordion-trigger');

  guideTab.addEventListener('click', () => panel.classList.toggle('hidden'));
  triggers.forEach((button) => {
    button.addEventListener('click', () => button.parentElement.classList.toggle('active'));
  });
}

backBtn.addEventListener('click', () => {
  window.location.href = 'dashboard.html';
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  setupGuidePanel();

  if (!targetUid) {
    profileError.textContent = 'Missing user id in URL.';
    return;
  }

  if (targetUid === user.uid) {
    profileError.textContent = 'This is your own profile. Pick another user from dashboard.';
    return;
  }

  try {
    const userSnapshot = await getDoc(doc(db, 'users', targetUid));

    if (!userSnapshot.exists()) {
      profileError.textContent = 'User not found.';
      return;
    }

    const profile = userSnapshot.data();
    profileEmoji.textContent = profile.emoji || '🙂';
    profileDisplayName.textContent = profile.displayName;
    profileUsername.textContent = `@${profile.username}`;

    chatBtn.disabled = false;
    chatBtn.addEventListener('click', () => {
      window.location.href = `chat.html?uid=${encodeURIComponent(profile.uid)}`;
    });
  } catch (error) {
    profileError.textContent = error.message;
  }
});
