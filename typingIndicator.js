// ============================================================
//  SORA NO HOSHI — Typing Indicator Module
// ============================================================
import { db } from './config.js';
import {
    doc, setDoc, deleteDoc, onSnapshot, collection
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let _typingTimeout = null;

// Init: listen to typing/{uid} collection and render indicator
export function initTypingIndicator(user, userData) {
    const typingCol = collection(db, 'typing');
    const isAdmin = userData.role === 'admin';

    const unsubscribe = onSnapshot(typingCol, async snap => {
        const bar = document.getElementById('typing-bar');
        if (!bar) return;

        const typers = [];
        for (const docSnap of snap.docs) {
            const data = docSnap.data();
            if (docSnap.id === user.uid) continue; // Don't show self
            if (!data.isTyping) continue;
            // Stale (over 5s old) — ignore
            if (data.timestamp && Date.now() - data.timestamp > 5000) continue;

            // Admins always see; members only see if typer has indicator enabled
            if (!isAdmin && data.typingIndicatorEnabled === false) continue;
            typers.push(data.name || 'Someone');
        }

        if (typers.length === 0) {
            bar.classList.add('hidden');
            bar.textContent = '';
        } else {
            const names = typers.slice(0, 3).join(', ');
            const extra = typers.length > 3 ? ` +${typers.length - 3} more` : '';
            bar.textContent = `${names}${extra} ${typers.length === 1 ? 'is' : 'are'} typing…`;
            bar.classList.remove('hidden');
        }
    });

    return unsubscribe;
}

// Called on keydown in message input
export async function setTyping(uid, isTyping) {
    if (_typingTimeout) clearTimeout(_typingTimeout);

    const userData = (await import('./auth.js')).getCurrentUserData();
    await setDoc(doc(db, 'typing', uid), {
        isTyping,
        name: userData?.displayName || userData?.email || 'User',
        typingIndicatorEnabled: userData?.settings?.typingIndicator !== false,
        timestamp: Date.now()
    });

    if (isTyping) {
        // Auto-clear after 3 seconds of inactivity
        _typingTimeout = setTimeout(() => clearTyping(uid), 3000);
    }
}

// Clear typing status
export async function clearTyping(uid) {
    try {
        await setDoc(doc(db, 'typing', uid), { isTyping: false, timestamp: Date.now() });
    } catch (e) { }
}
