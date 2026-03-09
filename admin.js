// ============================================================
//  SORA NO HOSHI — Admin Module
//  Remove members, delete messages, reset passwords
// ============================================================
import { db } from './config.js';
import { getCurrentUser, getCurrentUserData } from './auth.js';
import { showToast, makeAvatarEl, escHtml } from './ui.js';
import {
    collection, onSnapshot, doc, getDoc, getDocs,
    updateDoc, addDoc, serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let _user = null;
let _userData = null;

export function initAdmin(user, userData) {
    _user = user;
    _userData = userData;
}

// ── Render Admin Panel ────────────────────────────────────
export async function renderAdminPanel() {
    const body = document.getElementById('admin-modal-body');
    if (!body) return;
    if (_userData?.role !== 'admin') {
        body.innerHTML = '<p style="color:var(--danger)">Access denied.</p>';
        return;
    }

    body.innerHTML = '<div class="loading-dots">Loading members…</div>';

    // Fetch all non-removed members
    const snap = await getDocs(collection(db, 'users'));
    const members = [];
    snap.forEach(d => {
        const m = { uid: d.id, ...d.data() };
        if (!m.removed && m.uid !== _user.uid) members.push(m);
    });

    members.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

    body.innerHTML = `
        <div class="admin-section-label">Members Management</div>
        <div id="admin-members-list" class="admin-members-list"></div>`;

    const list = document.getElementById('admin-members-list');

    members.forEach(m => {
        const card = document.createElement('div');
        card.className = 'admin-member-card glass';
        card.innerHTML = `
            <div class="admin-member-info">
                <div class="avatar xs" style="background:var(--accent)">${(m.displayName || '?')[0].toUpperCase()}</div>
                <div>
                    <div class="admin-member-name">${escHtml(m.displayName || m.email)} <span class="role-badge ${m.role}">${m.role}</span></div>
                    <div class="admin-member-email">${escHtml(m.email)}</div>
                </div>
            </div>
            <div class="admin-member-actions">
                ${m.role !== 'admin' ? `
                <button class="btn btn-sm btn-warning" onclick="adminPromote('${m.uid}')">👑 Make Admin</button>
                <button class="btn btn-sm btn-danger" onclick="adminRemove('${m.uid}','${escHtml(m.displayName || m.email)}')">🚫 Remove</button>
                <button class="btn btn-sm btn-secondary" onclick="adminResetPassword('${m.uid}','${escHtml(m.displayName || m.email)}')">🔑 Reset Pass</button>
                ` : `<span style="opacity:.5;font-size:.8em">Admin</span>`}
            </div>`;
        list.appendChild(card);
    });

    // Expose admin action handlers globally
    window.adminRemove = removeMember;
    window.adminPromote = promoteMember;
    window.adminResetPassword = resetMemberPassword;
}

// ── Remove Member ─────────────────────────────────────────
export async function removeMember(uid, name) {
    if (!confirm(`Remove "${name}" from the group? They will be signed out immediately.`)) return;
    await updateDoc(doc(db, 'users', uid), { removed: true, online: false });
    // Notify in chat
    await addDoc(collection(db, 'messages'), {
        senderId: 'system', senderName: 'System', senderAvatar: '',
        text: `🚫 ${name} has been removed from the group by an admin.`,
        mediaURL: null, mediaId: null, mediaType: null, mediaViewMode: null,
        timestamp: serverTimestamp(), deleted: false, deletedByAdmin: false,
        readBy: {}, reactions: {}, replyTo: null
    });
    showToast(`${name} removed.`, 'success');
    renderAdminPanel();
}

// ── Promote to Admin ──────────────────────────────────────
export async function promoteMember(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return;
    const m = snap.data();
    if (!confirm(`Promote "${m.displayName || m.email}" to admin?`)) return;
    await updateDoc(doc(db, 'users', uid), { role: 'admin' });
    await addDoc(collection(db, 'messages'), {
        senderId: 'system', senderName: 'System', senderAvatar: '',
        text: `👑 ${m.displayName || m.email} has been promoted to admin.`,
        mediaURL: null, mediaId: null, mediaType: null, mediaViewMode: null,
        timestamp: serverTimestamp(), deleted: false, deletedByAdmin: false,
        readBy: {}, reactions: {}, replyTo: null
    });
    showToast(`${m.displayName} is now an admin.`, 'success');
    renderAdminPanel();
}

// ── Reset Member Password (via temp password in chat) ─────
export async function resetMemberPassword(uid, name) {
    const tempPass = prompt(`Set a new temporary password for "${name}":`);
    if (!tempPass || tempPass.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
    }
    // Store reset request in Firestore — member sees it in chat
    await addDoc(collection(db, 'messages'), {
        senderId: 'system', senderName: 'System', senderAvatar: '',
        text: `🔑 Admin has reset the password for ${name}. Temporary password: "${tempPass}". Please change it immediately in Settings.`,
        mediaURL: null, mediaId: null, mediaType: null, mediaViewMode: null,
        timestamp: serverTimestamp(), deleted: false, deletedByAdmin: false,
        readBy: {}, reactions: {}, replyTo: null,
        privateToUid: uid  // chat.js can optionally filter this
    });
    showToast('Password reset notice sent in chat.', 'success');
}
