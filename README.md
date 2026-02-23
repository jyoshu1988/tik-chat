# TikChat (Vanilla JS + Firebase)

TikChat is a WhatsApp-inspired real-time messaging app built with plain HTML, CSS, and JavaScript.
It includes Firebase Authentication, Firestore real-time chat, user profiles, online/offline indicators,
and a fixed FAQ Guide panel.

## Project Structure

```text
/public
  index.html           # Login page
  signup.html          # Signup page
  dashboard.html       # User catalog + logout + guide panel
  profile.html         # User profile page
  chat.html            # Real-time 1:1 chat UI
  /css
    style.css          # Shared app styles
  /js
    firebase-config.js # Firebase SDK initialization placeholder
    auth.js            # Login/signup logic
    dashboard.js       # User catalog + logout + guide interactions
    profile.js         # Profile rendering and navigation
    chat.js            # Real-time chat logic
firebase.json          # Firebase Hosting configuration
firestore.rules        # Firestore security rules
README.md              # Setup and deployment guide
```

## Features

- Email/password signup + login
- Unique username validation during signup
- Firestore `users` profile document with emoji, username, status metadata
- Dashboard showing all users except current user
- Profile page with quick start chat button
- Real-time private chat with:
  - `onSnapshot` live updates
  - automatic scroll-to-bottom
  - sender/receiver message bubbles
  - timestamps
- Guide tab with accordion FAQ on each protected page
- Online/offline best-effort status updates
- Session persistence via Firebase Auth local persistence

## Firebase Setup (Step-by-step)

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Firestore Database**, create a database in production mode.
4. In **Project Settings → General → Your apps**, add a web app.
5. Copy the Firebase config object.
6. Open `public/js/firebase-config.js` and replace the placeholder values.
7. Install Firebase CLI (if not installed):
   ```bash
   npm install -g firebase-tools
   ```
8. Login to Firebase:
   ```bash
   firebase login
   ```
9. Initialize Firebase in this repo (if needed):
   ```bash
   firebase init hosting firestore
   ```
   Choose:
   - Hosting public directory: `public`
   - Single-page app rewrite: `No` (multi-page app)
   - Use existing `firebase.json`/`firestore.rules`

## Firestore Data Model

### `users` collection
Each user document ID = auth UID.

```json
{
  "uid": "string",
  "email": "string",
  "username": "string (unique)",
  "displayName": "string",
  "emoji": "string",
  "createdAt": "timestamp",
  "onlineStatus": true,
  "lastSeenAt": "timestamp"
}
```

### `chats` collection
`chatId` uses deterministic format: `sortedUidA_sortedUidB`.

```json
{
  "participants": ["uid1", "uid2"],
  "createdAt": "timestamp"
}
```

### `chats/{chatId}/messages` subcollection

```json
{
  "senderId": "uid",
  "text": "message text",
  "timestamp": "timestamp"
}
```

## Security Rules

Use the following rules in `firestore.rules`:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    function isChatParticipant(chatId) {
      return isSignedIn() &&
        request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
    }

    match /users/{uid} {
      allow read, create, update, delete: if isOwner(uid);
    }

    match /chats/{chatId} {
      allow create: if isSignedIn() && request.resource.data.participants is list &&
        request.auth.uid in request.resource.data.participants;
      allow read, update, delete: if isChatParticipant(chatId);

      match /messages/{messageId} {
        allow read: if isChatParticipant(chatId);
        allow create: if isSignedIn() && isChatParticipant(chatId) &&
          request.resource.data.senderId == request.auth.uid;
        allow update, delete: if false;
      }
    }
  }
}
```

## Run Locally

Because Firebase SDK modules are ES modules, serve files with a local web server (do not open via `file://`).

### Option 1: Python
```bash
python3 -m http.server 8080 --directory public
```
Then open <http://localhost:8080>.

### Option 2: Firebase Hosting emulator
```bash
firebase emulators:start --only hosting,firestore,auth
```

## Deploy to Firebase Hosting

```bash
firebase deploy --only hosting,firestore:rules
```

## Notes for Production Hardening

- Add dedicated settings page for editing display name/emoji.
- Add Cloud Functions for account deletion cleanup and robust presence tracking.
- Add rate-limiting and moderation checks.
- Add pagination for large message history.
