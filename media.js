// ============================================================
//  SORA NO HOSHI — Media Module
//  Handles photo/video upload and view-limited playback
// ============================================================
import { db, storage } from './config.js';
import { getCurrentUser } from './auth.js';
import {
    doc, setDoc, getDoc, updateDoc, serverTimestamp, collection
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { showToast } from './ui.js';

// ── Upload media and return { url, mediaId, type, mode } ──
export async function uploadMedia(file, viewMode, onProgress) {
    const user = getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const mediaId = doc(collection(db, 'mediaViews')).id;
    const ext = file.name.split('.').pop();
    const storePath = `media/${mediaId}.${ext}`;
    const storageRef = ref(storage, storePath);
    return new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file);
        task.on('state_changed',
            snap => onProgress && onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            async () => {
                const url = await getDownloadURL(task.snapshot.ref);
                // Create Firestore document to track views
                await setDoc(doc(db, 'mediaViews', mediaId), {
                    uploadedBy: user.uid, viewMode,
                    storagePath: storePath,
                    createdAt: serverTimestamp(),
                    viewers: {}  // { uid: viewCount }
                });
                resolve({ url, mediaId, type: file.type.startsWith('video') ? 'video' : 'image', mode: viewMode });
            }
        );
    });
}

// ── Can this user view the media? ─────────────────────────
export async function canView(mediaId) {
    const snap = await getDoc(doc(db, 'mediaViews', mediaId));
    if (!snap.exists()) return false;
    const data = snap.data();
    const uid = getCurrentUser()?.uid;
    if (data.viewMode === 'direct') return true;
    const limit = data.viewMode === 'once' ? 1 : 2;
    const viewed = data.viewers?.[uid] || 0;
    return viewed < limit;
}

// ── Register a media view ─────────────────────────────────
export async function registerView(mediaId) {
    const uid = getCurrentUser()?.uid;
    if (!uid) return;
    const snap = await getDoc(doc(db, 'mediaViews', mediaId));
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.viewMode === 'direct') return;
    const current = data.viewers?.[uid] || 0;
    await updateDoc(doc(db, 'mediaViews', mediaId), {
        [`viewers.${uid}`]: current + 1
    });
}

// ── Remaining views for current user ─────────────────────
export async function remainingViews(mediaId) {
    const uid = getCurrentUser()?.uid;
    const snap = await getDoc(doc(db, 'mediaViews', mediaId));
    if (!snap.exists()) return 0;
    const data = snap.data();
    if (data.viewMode === 'direct') return Infinity;
    const limit = data.viewMode === 'once' ? 1 : 2;
    const current = data.viewers?.[uid] || 0;
    return Math.max(0, limit - current);
}

// ── Show media in the full-screen viewer ──────────────────
export async function showMediaViewer(mediaUrl, mediaId, mediaType, viewMode) {
    const viewer = document.getElementById('media-viewer');
    const inner = document.getElementById('media-viewer-inner');
    const label = document.getElementById('media-viewer-label');
    if (!viewer || !inner) return;

    const ok = await canView(mediaId);
    if (!ok) { showToast('This media has expired', 'error'); return; }

    // Prevent saving
    viewer.oncontextmenu = (e) => e.preventDefault();
    document.addEventListener('keydown', blockSaveKeys, { capture: true });

    inner.innerHTML = '';
    if (mediaType === 'video') {
        const v = document.createElement('video');
        v.src = mediaUrl; v.controls = true; v.autoplay = true;
        v.oncontextmenu = (e) => e.preventDefault();
        v.setAttribute('controlslist', 'nodownload');
        inner.appendChild(v);
    } else {
        const img = document.createElement('img');
        img.src = mediaUrl; img.draggable = false;
        img.oncontextmenu = (e) => e.preventDefault();
        inner.appendChild(img);
    }

    // Register view
    await registerView(mediaId);
    const rem = await remainingViews(mediaId);

    if (viewMode === 'direct') {
        label.textContent = '📎 Direct media';
    } else if (viewMode === 'once') {
        label.textContent = rem > 0 ? '👁 1-time view — already used' : '👁 1-time view — expired';
    } else if (viewMode === 'twice') {
        label.textContent = rem > 0 ? `👁 2-time view — ${rem} view${rem !== 1 ? 's' : ''} remaining` : '👁 2-time view — expired';
    }

    viewer.classList.remove('hidden');
}

function blockSaveKeys(e) {
    if ((e.ctrlKey || e.metaKey) && ['s', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
}

export function closeMediaViewer() {
    document.getElementById('media-viewer').classList.add('hidden');
    document.getElementById('media-viewer-inner').innerHTML = '';
    document.removeEventListener('keydown', blockSaveKeys, { capture: true });
}
