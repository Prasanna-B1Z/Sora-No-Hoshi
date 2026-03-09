// ============================================================
//  SORA NO HOSHI — Members Module
//  Sidebar members list with online status
// ============================================================
import { db } from './config.js';
import { makeAvatarEl, escHtml } from './ui.js';
import {
    collection, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function initMembers(user, userData) {
    const q = query(collection(db, 'users'), orderBy('role', 'asc')); // admins come first alphabetically
    const list = document.getElementById('members-list');

    const unsubscribe = onSnapshot(q, snap => {
        if (!list) return;
        list.innerHTML = '';

        const members = [];
        snap.forEach(d => {
            const m = { uid: d.id, ...d.data() };
            if (!m.removed) members.push(m);
        });

        // Sort: admins first, then by name
        members.sort((a, b) => {
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (b.role === 'admin' && a.role !== 'admin') return 1;
            return (a.displayName || '').localeCompare(b.displayName || '');
        });

        members.forEach(m => {
            const row = document.createElement('div');
            row.className = 'member-row';
            row.onclick = () => window.viewUserProfile(m.uid);

            const avEl = makeAvatarEl(m, 'xs');

            const infoDiv = document.createElement('div');
            infoDiv.className = 'member-info';
            infoDiv.innerHTML = `
                <span class="member-name">${escHtml(m.displayName || m.email)}${m.role === 'admin' ? ' 👑' : ''}</span>
                <span class="member-status ${m.online ? 'online' : 'offline'}">${m.online ? '● Online' : '○ Offline'}</span>`;

            row.appendChild(avEl);
            row.appendChild(infoDiv);
            list.appendChild(row);
        });

        // Update header count
        if (window.updateMembersCount) window.updateMembersCount(members.length);
    });

    return unsubscribe;
}
