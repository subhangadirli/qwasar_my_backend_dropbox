import { useCallback, useEffect, useRef, useState } from "react";
import { getUrl, remove, uploadData } from "aws-amplify/storage";
import { client } from "../dataClient";
import { formatBytes } from "../format";
import "./ProfilePage.css";

/**
 * Account page: editable profile details plus a summary of what the user is
 * storing. The profile row is created lazily on first visit, so no sign-up
 * trigger is needed on the Cognito side.
 */
function ProfilePage({ user, files, folders }) {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [versionCount, setVersionCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [status, setStatus] = useState("Loading profile...");
  const [saving, setSaving] = useState(false);
  // The profile row is created lazily, so the load has to be guarded: React
  // runs effects twice in development, and two concurrent loads would both see
  // an empty list and each create a row.
  const loadingRef = useRef(null);

  const loadProfile = useCallback(async () => {
    if (!loadingRef.current) {
      loadingRef.current = (async () => {
        const { data } = await client.models.UserProfile.list();
        return data[0] ?? (await client.models.UserProfile.create({})).data;
      })();
    }
    const existing = await loadingRef.current;
    setProfile(existing);
    setDisplayName(existing.displayName ?? "");
    setBio(existing.bio ?? "");
    if (existing.avatarKey) {
      try {
        const { url } = await getUrl({ path: existing.avatarKey });
        setAvatarUrl(url.toString());
      } catch {
        setAvatarUrl("");
      }
    }
    setStatus("");
  }, []);

  const loadCounts = useCallback(async () => {
    const [versions, shares] = await Promise.all([
      client.models.FileVersion.list(),
      client.models.ShareLink.list(),
    ]);
    setVersionCount(versions.data.length);
    setShareCount(
      shares.data.filter(
        (share) => new Date(share.expiresAt).getTime() > Date.now()
      ).length
    );
  }, []);

  useEffect(() => {
    loadProfile();
    loadCounts();
  }, [loadProfile, loadCounts]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const { data } = await client.models.UserProfile.update({
        id: profile.id,
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
      });
      setProfile(data);
      setStatus("Profile saved.");
    } catch {
      setStatus("Could not save the profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(event) {
    const avatar = event.target.files?.[0];
    if (!avatar) {
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      // One fixed key per user, so a new upload replaces the previous avatar
      // instead of leaving orphaned objects behind.
      const { path } = await uploadData({
        path: ({ identityId }) => `profile/${identityId}/avatar`,
        data: avatar,
      }).result;
      const { data } = await client.models.UserProfile.update({
        id: profile.id,
        avatarKey: path,
      });
      setProfile(data);
      const { url } = await getUrl({ path });
      setAvatarUrl(url.toString());
      setStatus("Avatar updated.");
    } catch {
      setStatus("Could not upload the avatar. Please try again.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  }

  async function handleAvatarRemove() {
    setSaving(true);
    setStatus("");
    try {
      await remove({ path: profile.avatarKey });
      const { data } = await client.models.UserProfile.update({
        id: profile.id,
        avatarKey: null,
      });
      setProfile(data);
      setAvatarUrl("");
      setStatus("Avatar removed.");
    } catch {
      setStatus("Could not remove the avatar. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const email = user?.signInDetails?.loginId ?? "";
  const storageUsed = files.reduce((total, file) => total + (file.size ?? 0), 0);
  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  if (!profile) {
    return (
      <section className="profile-page">
        <p className="profile-page-status">{status}</p>
      </section>
    );
  }

  return (
    <section className="profile-page">
      <div className="profile-page-identity">
        {avatarUrl ? (
          <img className="profile-page-avatar" src={avatarUrl} alt="Avatar" />
        ) : (
          <span className="profile-page-avatar profile-page-avatar-fallback">
            {initial}
          </span>
        )}
        <div className="profile-page-identity-text">
          <span className="profile-page-name">{displayName || "Unnamed"}</span>
          <span className="profile-page-email">{email}</span>
        </div>
      </div>

      <div className="profile-page-avatar-actions">
        <label className="profile-page-avatar-upload">
          Change avatar
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            disabled={saving}
          />
        </label>
        {profile.avatarKey && (
          <button
            type="button"
            className="profile-page-avatar-remove"
            onClick={handleAvatarRemove}
            disabled={saving}
          >
            Remove avatar
          </button>
        )}
      </div>

      <form className="profile-page-form" onSubmit={handleSave}>
        <label className="profile-page-label" htmlFor="profile-display-name">
          Display name
        </label>
        <input
          id="profile-display-name"
          className="profile-page-input"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          disabled={saving}
        />

        <label className="profile-page-label" htmlFor="profile-bio">
          Bio
        </label>
        <textarea
          id="profile-bio"
          className="profile-page-textarea"
          rows="3"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          disabled={saving}
        />

        <button
          type="submit"
          className="profile-page-save"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
        {status && <p className="profile-page-status">{status}</p>}
      </form>

      <div className="profile-page-stats">
        <div className="profile-page-stat">
          <span className="profile-page-stat-value">{files.length}</span>
          <span className="profile-page-stat-label">Files</span>
        </div>
        <div className="profile-page-stat">
          <span className="profile-page-stat-value">{folders.length}</span>
          <span className="profile-page-stat-label">Folders</span>
        </div>
        <div className="profile-page-stat">
          <span className="profile-page-stat-value">{versionCount}</span>
          <span className="profile-page-stat-label">Versions</span>
        </div>
        <div className="profile-page-stat">
          <span className="profile-page-stat-value">
            {formatBytes(storageUsed) || "0 B"}
          </span>
          <span className="profile-page-stat-label">Current versions</span>
        </div>
        <div className="profile-page-stat">
          <span className="profile-page-stat-value">{shareCount}</span>
          <span className="profile-page-stat-label">Active shares</span>
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;
