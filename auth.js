// ============================================================
//  SORA NO HOSHI — Authentication Module
// ============================================================
import { auth, db } from './config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc, setDoc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './ui.js';

let currentUser = null;
let currentUserData = null;

export function getCurrentUser() { return currentUser; }
export function getCurrentUserData() { return currentUserData; }

// ── Auth State Observer ──────────────────────────────────
export function initAuth(onLogin, onLogout) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) {
                currentUserData = snap.data();
                // Check if removed
                if (currentUserData.removed) {
                    await signOut(auth);
                    showRemovedScreen();
                    return;
                }
                // Update online status
                await updateDoc(doc(db, 'users', user.uid), { online: true });
                onLogin(user, currentUserData);
            } else {
                // User doc missing — force logout
                await signOut(auth);
                onLogout();
            }
        } else {
            currentUser = null;
            currentUserData = null;
            onLogout();
        }
    });
}

// ── Sign Up ──────────────────────────────────────────────
export async function signUp(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const userData = {
        uid, email: email.toLowerCase(), displayName,
        avatarURL: '', bio: '', location: '', interests: [],
        role: 'member', joined: serverTimestamp(), online: true, removed: false,
        settings: { readReceipts: true, typingIndicator: true }
    };
    await setDoc(doc(db, 'users', uid), userData);
    currentUserData = userData;
    return cred.user;
}

// ── Sign In ──────────────────────────────────────────────
export async function signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    currentUser = cred.user;
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (snap.exists()) {
        currentUserData = snap.data();
        if (currentUserData.removed) {
            await signOut(auth);
            throw new Error('You have been removed from this group.');
        }
    }
    return cred.user;
}

// ── Logout ───────────────────────────────────────────────
export async function logout() {
    if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), { online: false });
    }
    await signOut(auth);
}

// ── Show Removed Screen ──────────────────────────────────
function showRemovedScreen() {
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('auth-view').classList.add('hidden');
    const rs = document.getElementById('removed-screen');
    if (rs) rs.classList.remove('hidden');
}

// ── Refresh current user data ─────────────────────────────
export async function refreshUserData() {
    if (!currentUser) return;
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    if (snap.exists()) currentUserData = snap.data();
    return currentUserData;
}
