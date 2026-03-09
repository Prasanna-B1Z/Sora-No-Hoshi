// ============================================================
//  SORA NO HOSHI — UI Helpers
// ============================================================

// ── Toast Notification ────────────────────────────────────
export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ── Avatar initial generator ──────────────────────────────
export function makeAvatarEl(userData, size = '') {
    const div = document.createElement('div');
    div.className = `avatar${size ? ' ' + size : ''}`;
    if (userData.avatarURL) {
        const img = document.createElement('img');
        img.src = userData.avatarURL;
        img.alt = userData.displayName;
        div.appendChild(img);
    } else {
        div.textContent = (userData.displayName || '?')[0].toUpperCase();
        div.style.background = stringToGradient(userData.uid || userData.email || '?');
    }
    return div;
}

// ── Deterministic gradient from string ───────────────────
function stringToGradient(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const h1 = Math.abs(hash) % 360;
    const h2 = (h1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${h1},65%,45%), hsl(${h2},70%,55%))`;
}

// ── Format timestamp ──────────────────────────────────────
export function formatTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateLabel(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Modal helpers ─────────────────────────────────────────
export function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}
export function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

// ── Escape HTML ───────────────────────────────────────────
export function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
