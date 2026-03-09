# SORA NO HOSHI ✦ — Setup Guide

**"Star in the Sky"** — A private, real-time group chat with a premium space-dark aesthetic.

---

## Quick Start

### 1. Firebase Setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project → **sora-no-hoshi**
3. Enable **Authentication → Email/Password**
4. Enable **Firestore Database** (test mode → then apply `firestore.rules`)
5. Enable **Storage** (test mode)
6. Go to **Project Settings → Web app** → copy config into `js/config.js`

### 2. Apply Firestore Security Rules
In Firebase Console → Firestore → **Rules** tab → paste contents of `firestore.rules` → Publish

### 3. Run Locally
```bash
# Option A — Python (no install needed)
python -m http.server 5500

# Option B — VS Code Live Server
# Right-click index.html → "Open with Live Server"
```
Open **http://localhost:5500** in your browser.

### 4. Make the First Admin
1. Sign up via the app
2. Firestore Console → `users` collection → open your doc
3. Change `role: "member"` → `role: "admin"`
4. Refresh the app → 👑 Admin button appears

---

## Features

| Feature | Details |
|---|---|
| 🔐 Auth | Email/Password signup & login |
| 💬 Chat | Real-time messages, reply, react ❤, delete |
| 📸 Media | Direct / 1-time / 2-time view modes |
| 👁 Read Receipts | Per-user toggle; admin always sees |
| ⌨ Typing Indicator | Per-user toggle; admin always sees |
| 👤 Profiles | Name, bio, photo, location, interests |
| 👑 Admin Panel | Remove members, promote, reset passwords |
| 🌟 Animations | Stars, comets, button pop, glow pulse |

---

## Project Structure

```
sora-no-hoshi/
├── index.html          ← SPA shell
├── firestore.rules     ← Security rules
├── css/style.css       ← Space-dark theme
└── js/
    ├── config.js       ← Firebase config ← PUT YOUR CONFIG HERE
    ├── auth.js         ← Authentication
    ├── chat.js         ← Real-time chat
    ├── media.js        ← Media + view limits
    ├── readReceipts.js ← Read receipts
    ├── typingIndicator.js
    ├── profile.js      ← User profiles
    ├── admin.js        ← Admin panel
    ├── members.js      ← Members sidebar
    └── ui.js           ← Shared helpers
```
