// ============================================================
//  SORA NO HOSHI — Firebase Configuration
//  Replace the values below with YOUR Firebase project config.
//  How-to:
//   1. Go to https://console.firebase.google.com
//   2. Create project → "sora-no-hoshi"
//   3. Project Settings → Your apps → Web app (</>)
//   4. Copy the firebaseConfig object and paste it below
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAiIS-MEeCteeJ8bfJXoB2HZUw4qC7qnYM",
    authDomain: "sora-no-hoshi26.firebaseapp.com",
    projectId: "sora-no-hoshi26",
    storageBucket: "sora-no-hoshi26.firebasestorage.app",
    messagingSenderId: "259207499617",
    appId: "1:259207499617:web:cc73909be8ed783fbebf20",
    measurementId: "G-VXRN22WJ8W"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
