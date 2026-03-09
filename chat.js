// ============================================================
//  SORA NO HOSHI — Chat Module
//  Real-time messaging: send, receive, like, reply, delete
// ============================================================
import { db } from './config.js';
import { getCurrentUser, getCurrentUserData } from './auth.js';
import { uploadMedia } from './media.js';
import { showToast, makeAvatarEl, escHtml, formatTime, formatDateLabel } from './ui.js';
import {
    collection, addDoc, doc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, serverTimestamp,
    arrayUnion, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { markRead } from './readReceipts.js';

let _replyTarget = null;
const MESSAGES_COL = collection(db, 'messages');

// ── Init Chat ─────────────────────────────────────────────
export function initChat(user, userData) {
    const q = query(MESSAGES_COL, orderBy('timestamp', 'asc'));
    let lastDateLabel = '';

    const unsubscribe = onSnapshot(q, snap => {
        const list = document.getElementById('messages-list');
        if (!list) return;
        list.innerHTML = '';
        lastDateLabel = '';

        snap.forEach(docSnap => {
            const msg = { id: docSnap.id, ...docSnap.data() };
            // Date divider
            const dateLabel = formatDateLabel(msg.timestamp);
            if (dateLabel && dateLabel !== lastDateLabel) {
                lastDateLabel = dateLabel;
                const divider = document.createElement('div');
                divider.className = 'date-divider';
                divider.textContent = dateLabel;
                list.appendChild(divider);
            }
            list.appendChild(buildMessageEl(msg, user, userData));
        });
        // Scroll to bottom
        const container = document.getElementById('messages-container');
        if (container) container.scrollTop = container.scrollHeight;

        // Mark messages read
        snap.forEach(docSnap => {
            const msg = docSnap.data();
            if (msg.senderId !== user.uid && !msg.deleted) {
                markRead(docSnap.id, user.uid, userData);
            }
        });
    });

    return unsubscribe;
}

// ── Build a single message bubble ────────────────────────
function buildMessageEl(msg, user, userData) {
    const isMine = msg.senderId === user.uid;
    const isAdmin = userData.role === 'admin';
    const canDelete = isMine || isAdmin;

    const wrapper = document.createElement('div');
    wrapper.className = `msg-wrapper ${isMine ? 'mine' : 'theirs'}`;
    wrapper.id = `msg-${msg.id}`;

    if (msg.deleted) {
        wrapper.innerHTML = `<div class="msg-bubble deleted">
            <em>🚫 ${msg.deletedByAdmin ? 'Deleted by admin' : 'Message deleted'}</em>
        </div>`;
        return wrapper;
    }

    const reactionHtml = buildReactionsHtml(msg.reactions || {}, user.uid);
    const readHtml = buildReadHtml(msg, user, userData);
    const replyHtml = msg.replyTo
        ? `<div class="reply-quote">
              <span class="reply-quote-sender">${escHtml(msg.replyTo.senderName)}</span>
              <span class="reply-quote-text">${escHtml((msg.replyTo.text || '').slice(0, 80))}</span>
           </div>`
        : '';

    let mediaHtml = '';
    if (msg.mediaURL && msg.mediaId) {
        if (msg.mediaViewMode === 'direct') {
            if (msg.mediaType === 'video') {
                mediaHtml = `<div class="msg-media">
                    <video src="${escHtml(msg.mediaURL)}" controls controlslist="nodownload" oncontextmenu="return false" style="max-width:240px;border-radius:10px"></video></div>`;
            } else {
                mediaHtml = `<div class="msg-media">
                    <img src="${escHtml(msg.mediaURL)}" draggable="false" oncontextmenu="return false"
                         style="max-width:240px;border-radius:10px;cursor:pointer"
                         onclick="openMedia('${escHtml(msg.mediaURL)}','${msg.mediaId}','${msg.mediaType}','${msg.mediaViewMode}')" /></div>`;
            }
        } else {
            mediaHtml = `<div class="msg-media">
                <button class="btn-media-view" onclick="openMedia('${escHtml(msg.mediaURL)}','${msg.mediaId}','${msg.mediaType}','${msg.mediaViewMode}')">
                    ${msg.mediaType === 'video' ? '🎬' : '🖼'} View Media
                    <span class="media-mode-badge">${msg.mediaViewMode === 'once' ? '1× view' : '2× view'}</span>
                </button></div>`;
        }
    }

    const textHtml = msg.text ? `<p class="msg-text">${escHtml(msg.text)}</p>` : '';

    wrapper.innerHTML = `
        <div class="msg-avatar-wrap">${isMine ? '' : `<div class="avatar sm clickable" onclick="viewUserProfile('${msg.senderId}')">${avInitial(msg.senderName)}</div>`}</div>
        <div class="msg-col">
            ${!isMine ? `<span class="msg-sender" onclick="viewUserProfile('${msg.senderId}')">${escHtml(msg.senderName)}</span>` : ''}
            <div class="msg-bubble">
                ${replyHtml}
                ${mediaHtml}
                ${textHtml}
                <span class="msg-time">${formatTime(msg.timestamp)}</span>
                ${readHtml}
            </div>
            ${reactionHtml}
            <div class="msg-actions">
                <button class="msg-action-btn" onclick="reactMsg('${msg.id}','❤️')">❤</button>
                <button class="msg-action-btn" onclick="replyMsg('${msg.id}','${escHtml(msg.senderName)}','${escHtml((msg.text || '').replace(/'/g, '&#39;'))}')">↩</button>
                ${canDelete ? `<button class="msg-action-btn danger" onclick="deleteMsg('${msg.id}')">🗑</button>` : ''}
            </div>
        </div>`;

    return wrapper;
}

function avInitial(name) {
    return `<span style="font-size:0.9rem;font-weight:600;">${(name || '?')[0].toUpperCase()}</span>`;
}

function buildReactionsHtml(reactions, myUid) {
    const counts = {};
    Object.values(reactions).forEach(em => { counts[em] = (counts[em] || 0) + 1; });
    if (!Object.keys(counts).length) return '';
    return `<div class="msg-reactions">${Object.entries(counts).map(([em, n]) =>
        `<span class="reaction-chip">${em} ${n}</span>`).join('')}</div>`;
}

function buildReadHtml(msg, user, userData) {
    if (!msg.readBy || Object.keys(msg.readBy).length === 0) return '';
    if (msg.senderId !== user.uid && userData.role !== 'admin') return '';
    const readCount = Object.keys(msg.readBy).filter(uid => uid !== msg.senderId).length;
    if (readCount === 0) return '';
    return `<span class="read-tick" title="${readCount} read">✓✓</span>`;
}

// ── Send text message ─────────────────────────────────────
export async function sendMessage(text) {
    const user = getCurrentUser();
    const userData = getCurrentUserData();
    if (!user || !text.trim()) return;
    const msgData = {
        senderId: user.uid,
        senderName: userData.displayName || userData.email,
        senderAvatar: userData.avatarURL || '',
        text: text.trim(),
        mediaURL: null, mediaId: null, mediaType: null, mediaViewMode: null,
        timestamp: serverTimestamp(),
        deleted: false, deletedByAdmin: false,
        readBy: {}, reactions: {},
        replyTo: _replyTarget || null
    };
    await addDoc(MESSAGES_COL, msgData);
    if (_replyTarget) {
        _replyTarget = null;
        const rp = document.getElementById('reply-preview');
        if (rp) rp.classList.add('hidden');
    }
}

// ── Send media message ────────────────────────────────────
export async function sendMediaMessage(file, viewMode, captionText) {
    const user = getCurrentUser();
    const userData = getCurrentUserData();
    if (!user) return;
    const { url, mediaId, type, mode } = await uploadMedia(file, viewMode, null);
    await addDoc(MESSAGES_COL, {
        senderId: user.uid,
        senderName: userData.displayName || userData.email,
        senderAvatar: userData.avatarURL || '',
        text: captionText || '',
        mediaURL: url, mediaId, mediaType: type, mediaViewMode: mode,
        timestamp: serverTimestamp(),
        deleted: false, deletedByAdmin: false,
        readBy: {}, reactions: {},
        replyTo: _replyTarget || null
    });
    _replyTarget = null;
}

// ── Delete message ────────────────────────────────────────
export async function deleteMessage(msgId) {
    const user = getCurrentUser();
    const userData = getCurrentUserData();
    const snap = await getDoc(doc(db, 'messages', msgId));
    if (!snap.exists()) return;
    const msg = snap.data();
    const canDelete = msg.senderId === user.uid || userData.role === 'admin';
    if (!canDelete) { showToast('You cannot delete this message.', 'error'); return; }
    await updateDoc(doc(db, 'messages', msgId), {
        deleted: true,
        deletedByAdmin: userData.role === 'admin' && msg.senderId !== user.uid
    });
}

// ── React to message ──────────────────────────────────────
export async function reactToMessage(msgId, emoji) {
    const user = getCurrentUser();
    if (!user) return;
    await updateDoc(doc(db, 'messages', msgId), {
        [`reactions.${user.uid}`]: emoji
    });
}

// ── Set reply target ──────────────────────────────────────
export function setReplyTarget(target) {
    _replyTarget = target;
}
