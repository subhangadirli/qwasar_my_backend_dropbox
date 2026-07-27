import { useEffect, useState } from "react";
import { getUrl } from "aws-amplify/storage";
import { previewKind } from "../preview";
import "./FilePreview.css";

const TEXT_LIMIT = 200000;

/**
 * Modal preview of a file, rendered from a short-lived presigned S3 URL.
 * Images, video, audio, and PDFs are handed straight to the browser; text is
 * fetched and shown inline. Anything else falls back to a download prompt.
 */
function FilePreview({ file, onClose }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const kind = previewKind(file.fileName, file.contentType);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getUrl({ path: file.s3Key });
        if (!active) {
          return;
        }
        const href = result.url.toString();
        setUrl(href);
        if (kind === "text") {
          const response = await fetch(href);
          const body = await response.text();
          if (active) {
            setText(body.slice(0, TEXT_LIMIT));
          }
        }
      } catch {
        if (active) {
          setError("Could not load a preview for this file.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [file.s3Key, kind]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="file-preview-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="file-preview"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${file.fileName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="file-preview-header">
          <span className="file-preview-title">{file.fileName}</span>
          <button
            type="button"
            className="file-preview-close"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="file-preview-body">
          {loading && <p className="file-preview-note">Loading preview...</p>}
          {!loading && error && <p className="file-preview-note">{error}</p>}

          {!loading && !error && kind === "image" && (
            <img className="file-preview-image" src={url} alt={file.fileName} />
          )}
          {!loading && !error && kind === "pdf" && (
            <iframe
              className="file-preview-frame"
              src={url}
              title={file.fileName}
            />
          )}
          {!loading && !error && kind === "video" && (
            <video className="file-preview-media" src={url} controls />
          )}
          {!loading && !error && kind === "audio" && (
            <audio className="file-preview-media" src={url} controls />
          )}
          {!loading && !error && kind === "text" && (
            <pre className="file-preview-text">{text}</pre>
          )}
          {!loading && !error && kind === "none" && (
            <p className="file-preview-note">
              No inline preview for this file type. Download it to open it
              locally.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FilePreview;
