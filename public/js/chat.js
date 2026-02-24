import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const params = new URLSearchParams(window.location.search);
const otherUid = params.get('uid');

const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatTitle = document.getElementById('chat-title');
const chatStatus = document.getElementById('chat-status');
const chatBackBtn = document.getElementById('chat-back-btn');

let chatId = '';
let currentUser = null;
let otherUser = null;

function setupGuidePanel() {
  const guideTab = document.getElementById('guide-tab');
  const panel = document.getElementById('guide-panel');
  const triggers = panel.querySelectorAll('.accordion-trigger');

  guideTab.addEventListener('click', () => panel.classList.toggle('hidden'));
  triggers.forEach((button) => {
    button.addEventListener('click', () => button.parentElement.classList.toggle('active'));
  });
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'sending...';
  const date = timestamp.toDate();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function computeChatId(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

function renderMessage(message) {
  const bubble = document.createElement('article');
  const direction = message.senderId === currentUser.uid ? 'sent' : 'received';
  bubble.className = `message ${direction}`;
  bubble.innerHTML = `
    <div>${message.text}</div>
    <span class="message-meta">${formatTimestamp(message.timestamp)}</span>
  `;
  messagesEl.appendChild(bubble);
}

async function ensureChatDoc() {
  chatId = computeChatId(currentUser.uid, otherUid);
  const chatRef = doc(db, 'chats', chatId);
  const chatSnapshot = await getDoc(chatRef);

  if (!chatSnapshot.exists()) {
    await setDoc(chatRef, {
      participants: [currentUser.uid, otherUid],
      createdAt: serverTimestamp()
    });
  }
}

function subscribeToMessages() {
  const messagesQuery = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc')
  );

  onSnapshot(messagesQuery, (snapshot) => {
    messagesEl.innerHTML = '';
    snapshot.forEach((docSnapshot) => renderMessage(docSnapshot.data()));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function subscribeToOtherUserStatus() {
  onSnapshot(doc(db, 'users', otherUid), (snapshot) => {
    if (!snapshot.exists()) {
      chatStatus.textContent = 'User unavailable';
      return;
    }

    otherUser = snapshot.data();
    chatTitle.textContent = `${otherUser.emoji || '🙂'} ${otherUser.displayName}`;
    chatStatus.textContent = otherUser.onlineStatus ? 'Online' : 'Offline';
  });
}

async function setOnlineStatus(uid, onlineStatus) {
  await updateDoc(doc(db, 'users', uid), {
    onlineStatus,
    lastSeenAt: serverTimestamp()
  });
}

chatBackBtn.addEventListener('click', () => {
  window.location.href = 'dashboard.html';
});

messageForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();
  if (!text || !chatId) return;

  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: currentUser.uid,
      text,
      timestamp: serverTimestamp()
    });
    messageInput.value = '';
  } catch (error) {
    alert(error.message);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  setupGuidePanel();

  if (!otherUid || otherUid === user.uid) {
    chatTitle.textContent = 'Invalid chat target';
    messageInput.disabled = true;
    return;
  }

  currentUser = user;

  try {
    await setOnlineStatus(user.uid, true);
    await ensureChatDoc();
    subscribeToOtherUserStatus();
    subscribeToMessages();
  } catch (error) {
    chatStatus.textContent = error.message;
  }

  window.addEventListener('beforeunload', () => {
    setOnlineStatus(user.uid, false);
  });
});
