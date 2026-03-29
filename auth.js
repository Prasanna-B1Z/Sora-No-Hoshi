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

// Flag set by signUp so initAuth knows the doc was just created
let _justSignedUp = false;
let _pendingUserData = null; // the doc data we wrote during signUp

export function getCurrentUser() { return currentUser; }
export function getCurrentUserData() { return currentUserData; }

// ── Helper: fetch user doc with retry (handles race condition) ──
async function fetchUserDoc(uid, retries = 4, delayMs = 400) {
    for (let i = 0; i < retries; i++) {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) return snap;
        if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs));
    }
    return null;
}

// ── Auth State Observer ──────────────────────────────────
export function initAuth(onLogin, onLogout) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;

            // ── New signup fast-path: we already have the user data ──
            if (_justSignedUp && _pendingUserData) {
                _justSignedUp = false;
                currentUserData = _pendingUserData;
                _pendingUserData = null;
                try {
                    await updateDoc(doc(db, 'users', user.uid), { online: true });
                } catch (_) { /* ignore — doc was just created */ }
                onLogin(user, currentUserData);
                return;
            }

            // ── Normal sign-in path ──────────────────────────────────
            let snap = null;
            try {
                snap = await fetchUserDoc(user.uid);
            } catch (err) {
                console.error('[auth] Firestore unreachable:', err);
                showToast('Cannot reach database. Check your internet connection and try again.', 'error', 7000);
                await signOut(auth);
                onLogout();
                return;
            }

            if (snap && snap.exists()) {
                currentUserData = snap.data();

                // Check if removed
                if (currentUserData.removed) {
                    await signOut(auth);
                    showRemovedScreen();
                    return;
                }

                // Update online status
                try {
                    await updateDoc(doc(db, 'users', user.uid), { online: true });
                } catch (_) { /* may fail for new users before rules propagate */ }

                onLogin(user, currentUserData);
            } else {
                // User doc missing — they need to Sign Up first
                console.warn('[auth] No user doc found for uid:', user.uid, '— signing out.');
                showToast('No account data found. Please Sign Up to create your account.', 'error', 6000);
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
        uid,
        email: email.toLowerCase(),
        displayName,
        avatarURL: '',
        bio: '',
        location: '',
        interests: [],
        role: 'member',
        joined: serverTimestamp(),
        online: true,
        removed: false,
        settings: { readReceipts: true, typingIndicator: true }
    };

    // Write the doc first, THEN set the flag so initAuth knows to use it
    await setDoc(doc(db, 'users', uid), userData);
    _justSignedUp = true;
    _pendingUserData = userData;
    currentUserData = userData;

    return cred.user;
}

// ── Sign In ──────────────────────────────────────────────
export async function signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    currentUser = cred.user;
    const snap = await fetchUserDoc(cred.user.uid);
    if (snap && snap.exists()) {
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
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), { online: false });
        } catch (_) { /* ignore */ }
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

// ── Change password (admin use) ───────────────────────────
export { updatePassword };
