import { useCallback, useEffect, useState } from "react";
import { getUrl } from "aws-amplify/storage";
import { client } from "../dataClient";
import "./ShareDialog.css";

// Presigned URLs are signed with the caller's temporary Cognito credentials,
// so they cannot outlive that session. An hour is the practical ceiling.
const DURATIONS = [
  { label: "15 minutes", seconds: 900 },
  { label: "1 hour", seconds: 3600 },
];

/**
 * Create and manage public share links for one file.
 *
 * A share is a presigned S3 URL that anyone can open without signing in. Each
 * one is recorded as a ShareLink row so the owner can see what is currently
 * shared and revoke it before it expires.
 */
function ShareDialog({ file, onClose }) {
  const [shares, setShares] = useState([]);
  const [seconds, setSeconds] = useState(DURATIONS[0].seconds);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [error, setError] = useState("");

  const loadShares = useCallback(async () => {
    const { data } = await client.models.ShareLink.list({
      filter: { fileRecordId: { eq: file.id } },
    });
    data.sort((a, b) => b.expiresAt.localeCompare(a.expiresAt));
    setShares(data);
  }, [file.id]);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleCreate() {
    setCreating(true);
    setError("");
    try {
      const { url, expiresAt } = await getUrl({
        path: file.s3Key,
        options: { expiresIn: seconds, validateObjectExistence: true },
      });
      const { data } = await client.models.ShareLink.create({
        fileRecordId: file.id,
        fileName: file.fileName,
        s3Key: file.s3Key,
        url: url.toString(),
        expiresAt: expiresAt.toISOString(),
      });
      await copyToClipboard(data);
      loadShares();
    } catch {
      setError("Could not create a share link. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function copyToClipboard(share) {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopiedId(share.id);
    } catch {
      // Clipboard access is blocked in some browsers; the link is still
      // selectable in the field below, so this is not an error worth showing.
      setCopiedId("");
    }
  }

  async function handleRevoke(share) {
    await client.models.ShareLink.delete({ id: share.id });
    loadShares();
  }

  return (
    <div className="share-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${file.fileName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="share-dialog-header">
          <span className="share-dialog-title">Share {file.fileName}</span>
          <button type="button" className="share-dialog-close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="share-dialog-body">
          <div className="share-dialog-create">
            <label className="share-dialog-label" htmlFor="share-duration">
              Link expires in
            </label>
            <select
              id="share-duration"
              className="share-dialog-select"
              value={seconds}
              onChange={(event) => setSeconds(Number(event.target.value))}
            >
              {DURATIONS.map((duration) => (
                <option key={duration.seconds} value={duration.seconds}>
                  {duration.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="share-dialog-button"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "Creating..." : "Create link"}
            </button>
          </div>

          {error && <p className="share-dialog-error">{error}</p>}

          {shares.length === 0 && (
            <p className="share-dialog-empty">No share links yet.</p>
          )}

          {shares.map((share) => (
            <div key={share.id} className="share-dialog-share">
              <input
                className="share-dialog-url"
                type="text"
                value={share.url}
                readOnly
                onFocus={(event) => event.target.select()}
              />
              <div className="share-dialog-share-meta">
                <span className="share-dialog-expiry">
                  {isExpired(share) ? "Expired" : `Expires ${formatExpiry(share)}`}
                </span>
                <button
                  type="button"
                  className="share-dialog-copy"
                  onClick={() => copyToClipboard(share)}
                >
                  {copiedId === share.id ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  className="share-dialog-revoke"
                  onClick={() => handleRevoke(share)}
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function isExpired(share) {
  return new Date(share.expiresAt).getTime() <= Date.now();
}

function formatExpiry(share) {
  return new Date(share.expiresAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default ShareDialog;
