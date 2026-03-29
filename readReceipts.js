// ============================================================
//  SORA NO HOSHI — Read Receipts Module
// ============================================================
import { db } from './config.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Called when a message is scrolled into view
export async function markRead(msgId, uid, userData) {
    if (!uid || !msgId) return;
    // Only write if user has read receipts enabled (or always write, but hide from display)
    // We always write to allow admins to see it — display is filtered in chat.js
    try {
        await updateDoc(doc(db, 'messages', msgId), {
            [`readBy.${uid}`]: Date.now()
        });
    } catch (e) {
        // Silently fail if message was deleted
    }
}
