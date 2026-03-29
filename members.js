// ============================================================
//  SORA NO HOSHI — Members Module
//  Populates right-side members panel (online + offline lists)
// ============================================================
import { db } from './config.js';
import { makeAvatarEl, escHtml } from './ui.js';
import {
    collection, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function initMembers(user, userData) {
    const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));

    const unsubscribe = onSnapshot(q, snap => {
        const online = [], offline = [];
        snap.forEach(d => {
            const m = { uid: d.id, ...d.data() };
            if (m.removed) return;
            (m.online ? online : offline).push(m);
        });

        // Admins first within each group
        const sort = arr => arr.sort((a,b) => {
            if (a.role==='admin' && b.role!=='admin') return -1;
            if (b.role==='admin' && a.role!=='admin') return 1;
            return (a.displayName||'').localeCompare(b.displayName||'');
        });
        sort(online); sort(offline);
        const total = online.length + offline.length;

        // ── Stats on Home panel ──────────────────────────────────
        const sm = document.getElementById('stat-members');
        const so = document.getElementById('stat-online');
        if (sm) sm.textContent = total;
        if (so) so.textContent = online.length;

        // ── Members badge ────────────────────────────────────────
        const badge = document.getElementById('members-count-badge');
        if (badge) badge.textContent = total;

        // ── Chat header count ────────────────────────────────────
        if (window.updateMembersCount) window.updateMembersCount(total);

        // ── Build a member row ───────────────────────────────────
        function buildRow(m) {
            const row = document.createElement('div');
            row.className = 'member-right-row';
            row.onclick = () => window.viewUserProfile && window.viewUserProfile(m.uid);
            const av = makeAvatarEl(m, 'xs');
            const info = document.createElement('div');
            info.className = 'member-right-info';
            info.innerHTML = `<span class="member-right-name">${escHtml(m.displayName || m.email)}${m.role==='admin'?' 👑':''}</span>
                <span class="member-right-status ${m.online?'online':'offline'}">${m.online?'●':'○'}</span>`;
            row.appendChild(av); row.appendChild(info);
            return row;
        }

        // ── Online list ──────────────────────────────────────────
        const listOn = document.getElementById('members-list-online');
        if (listOn) { listOn.innerHTML=''; online.forEach(m=>listOn.appendChild(buildRow(m))); }

        // ── Offline list ─────────────────────────────────────────
        const listOff = document.getElementById('members-list-offline');
        if (listOff) { listOff.innerHTML=''; offline.forEach(m=>listOff.appendChild(buildRow(m))); }
    });

    return unsubscribe;
}

