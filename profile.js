// ============================================================
//  SORA NO HOSHI — Profile Module
//  Own profile editing & viewing other members' profiles
// ============================================================
import { db, storage } from './config.js';
import { getCurrentUser, getCurrentUserData, refreshUserData } from './auth.js';
import { showToast, makeAvatarEl, escHtml } from './ui.js';
import {
    doc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

let _user = null;
let _userData = null;

export function initProfile(user, userData) {
    _user = user;
    _userData = userData;
}

// ── Render My Profile (edit form) ─────────────────────────
export function renderMyProfile() {
    const body = document.getElementById('profile-modal-body');
    const ud = getCurrentUserData() || _userData;
    if (!body || !ud) return;

    body.innerHTML = `
        <div class="profile-edit-wrap">
            <div class="profile-avatar-center" id="profile-av-wrap"></div>
            <label class="btn-ghost profile-avatar-btn" for="profile-photo-input">📷 Change Photo</label>
            <input id="profile-photo-input" type="file" accept="image/*" style="display:none" />
            <div class="field-group">
                <label>Display Name</label>
                <input id="prof-name" type="text" value="${escHtml(ud.displayName || '')}" placeholder="Your name" />
            </div>
            <div class="field-group">
                <label>Bio</label>
                <textarea id="prof-bio" placeholder="About you…" rows="3">${escHtml(ud.bio || '')}</textarea>
            </div>
            <div class="field-group">
                <label>Location</label>
                <input id="prof-location" type="text" value="${escHtml(ud.location || '')}" placeholder="City, Country" />
            </div>
            <div class="field-group">
                <label>Interests <span style="opacity:.5;font-size:.8em">(comma separated)</span></label>
                <input id="prof-interests" type="text" value="${escHtml((ud.interests || []).join(', '))}" placeholder="music, anime, coding" />
            </div>
            <div id="prof-upload-progress" class="upload-progress hidden"></div>
            <button class="btn btn-primary btn-full mt-12" id="btn-save-profile">Save Profile</button>
        </div>`;

    // Render avatar
    const avWrap = document.getElementById('profile-av-wrap');
    avWrap.appendChild(makeAvatarEl(ud, 'lg'));

    // Photo upload
    document.getElementById('profile-photo-input').addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        const progressEl = document.getElementById('prof-upload-progress');
        progressEl.classList.remove('hidden');
        progressEl.textContent = 'Uploading photo…';
        try {
            const storageRef = ref(storage, `avatars/${_user.uid}`);
            const task = uploadBytesResumable(storageRef, file);
            task.on('state_changed',
                snap => {
                    progressEl.textContent = `Uploading… ${Math.round((snap.bytesTransferred / snap.totalBytes) * 100)}%`;
                },
                err => { showToast('Upload failed: ' + err.message, 'error'); progressEl.classList.add('hidden'); },
                async () => {
                    const url = await getDownloadURL(task.snapshot.ref);
                    await updateDoc(doc(db, 'users', _user.uid), { avatarURL: url });
                    progressEl.textContent = 'Photo saved ✓';
                    setTimeout(() => progressEl.classList.add('hidden'), 2000);
                    // Re-render avatar
                    const avWrap = document.getElementById('profile-av-wrap');
                    avWrap.innerHTML = '';
                    avWrap.appendChild(makeAvatarEl({ ...ud, avatarURL: url }, 'lg'));
                }
            );
        } catch (err) { showToast(err.message, 'error'); progressEl.classList.add('hidden'); }
    });

    // Save profile
    document.getElementById('btn-save-profile').addEventListener('click', async () => {
        const displayName = document.getElementById('prof-name').value.trim();
        const bio = document.getElementById('prof-bio').value.trim();
        const location = document.getElementById('prof-location').value.trim();
        const interests = document.getElementById('prof-interests').value.split(',').map(s => s.trim()).filter(Boolean);

        if (!displayName) { showToast('Name is required', 'error'); return; }
        try {
            await updateDoc(doc(db, 'users', _user.uid), { displayName, bio, location, interests });
            await refreshUserData();
            showToast('Profile saved ✓', 'success');
            // Update sidebar name
            const nameEl = document.getElementById('my-name-sidebar');
            if (nameEl) nameEl.textContent = displayName;
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
    });
}

// ── Render another user's profile (read-only) ─────────────
export async function renderViewProfile(uid) {
    const body = document.getElementById('view-profile-body');
    if (!body) return;
    body.innerHTML = '<div class="loading-dots">Loading…</div>';

    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) { body.innerHTML = '<p>User not found.</p>'; return; }
    const ud = snap.data();

    const interestsHtml = (ud.interests || []).length
        ? `<div class="interests-wrap">${ud.interests.map(i => `<span class="interest-chip">${escHtml(i)}</span>`).join('')}</div>`
        : '';

    body.innerHTML = `
        <div class="view-profile-wrap">
            <div class="profile-avatar-center"></div>
            <h3 class="view-profile-name">${escHtml(ud.displayName || ud.email)}</h3>
            <span class="role-badge ${ud.role}">${ud.role}</span>
            ${ud.bio ? `<p class="view-profile-bio">${escHtml(ud.bio)}</p>` : ''}
            ${ud.location ? `<p class="view-profile-location">📍 ${escHtml(ud.location)}</p>` : ''}
            ${interestsHtml}
            <p class="view-profile-joined">Joined: ${ud.joined?.toDate ? ud.joined.toDate().toLocaleDateString() : '—'}</p>
        </div>`;

    const avWrap = body.querySelector('.profile-avatar-center');
    avWrap.appendChild(makeAvatarEl(ud, 'lg'));
}
