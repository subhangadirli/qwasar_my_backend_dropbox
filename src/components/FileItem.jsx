import { useState } from "react";
import { copy, getUrl } from "aws-amplify/storage";
import { client } from "../dataClient";
import { deleteFileRecord } from "../fileActions";
import { withFileName, withFolder, withVersion } from "../fileKeys";
import { formatBytes } from "../format";
import FilePreview from "./FilePreview";
import ShareDialog from "./ShareDialog";
import "./FileItem.css";

function FileItem({ file, folderOptions, onChanged }) {
  const [showPreview, setShowPreview] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  // Every action that writes rewrites S3 keys across several rows, so the row
  // locks itself while one is in flight. Without this, a double click (or a
  // second pick in the move dropdown) can interleave two key rewrites and
  // leave the version rows pointing somewhere the record does not.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function runAction(action) {
    if (busy) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await action();
    } catch {
      setError("That action did not go through. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(path) {
    const { url } = await getUrl({ path });
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  async function toggleVersions() {
    if (showVersions) {
      setShowVersions(false);
      return;
    }
    setShowVersions(true);
    setLoadingVersions(true);
    try {
      const { data } = await client.models.FileVersion.list({
        filter: { fileRecordId: { eq: file.id } },
      });
      data.sort((a, b) => b.version - a.version);
      setVersions(data);
    } finally {
      setLoadingVersions(false);
    }
  }

  // Every version object moves with the file, so the version rows have to be
  // pointed at their new keys whenever the record's own key is rewritten.
  async function remapVersionKeys(mapKey) {
    const { data: fileVersions } = await client.models.FileVersion.list({
      filter: { fileRecordId: { eq: file.id } },
    });
    await Promise.all(
      fileVersions.map((version) =>
        client.models.FileVersion.update({
          id: version.id,
          s3Key: mapKey(version.s3Key),
        })
      )
    );
  }

  async function handleRevert(oldVersion) {
    if (
      !window.confirm(
        `Revert "${file.fileName}" to version ${oldVersion.version}?`
      )
    ) {
      return;
    }
    const nextVersion = file.version + 1;
    const newPath = withVersion(oldVersion.s3Key, nextVersion);

    await copy({
      source: { path: oldVersion.s3Key },
      destination: { path: newPath },
    });
    await client.models.FileRecord.update({
      id: file.id,
      s3Key: newPath,
      version: nextVersion,
    });
    await client.models.FileVersion.create({
      fileRecordId: file.id,
      version: nextVersion,
      s3Key: newPath,
    });

    setShowVersions(false);
    onChanged?.();
  }

  async function handleRename() {
    const newName = window.prompt("New file name:", file.fileName);
    if (!newName || newName === file.fileName) {
      return;
    }
    await remapVersionKeys((key) => withFileName(key, newName));
    // Rewriting the record's key is what triggers the Phase 6 Lambda that
    // mirrors the move in S3 (copy under the new prefix, delete the old).
    await client.models.FileRecord.update({
      id: file.id,
      fileName: newName,
      s3Key: withFileName(file.s3Key, newName),
    });
    onChanged?.();
  }

  async function handleMove(targetFolderId) {
    if ((file.folderId ?? null) === targetFolderId) {
      return;
    }
    await remapVersionKeys((key) => withFolder(key, targetFolderId));
    // The folder is part of the S3 key, so the same Lambda that handles a
    // rename relocates the objects for a move.
    await client.models.FileRecord.update({
      id: file.id,
      folderId: targetFolderId,
      s3Key: withFolder(file.s3Key, targetFolderId),
    });
    onChanged?.();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${file.fileName}"?`)) {
      return;
    }
    // Deleting the record triggers the Phase 6 Lambda that removes the S3 objects.
    await deleteFileRecord(file.id);
    onChanged?.();
  }

  const size = formatBytes(file.size);

  return (
    <div className="file-item">
      <div className="file-item-row">
        <span className="file-item-name">{file.fileName}</span>
        <span className="file-item-meta">
          v{file.version}
          {size && ` - ${size}`}
        </span>
        <div className="file-item-actions">
          <select
            className="file-item-move"
            value={file.folderId ?? ""}
            onChange={(event) =>
              runAction(() => handleMove(event.target.value || null))
            }
            disabled={busy}
            aria-label={`Move ${file.fileName} to a folder`}
          >
            {folderOptions.map((option) => (
              <option key={option.id ?? "root"} value={option.id ?? ""}>
                {option.path}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="file-item-preview"
            onClick={() => setShowPreview(true)}
          >
            Preview
          </button>
          <button
            type="button"
            className="file-item-download"
            onClick={() => handleDownload(file.s3Key)}
          >
            Download
          </button>
          <button
            type="button"
            className="file-item-share"
            onClick={() => setShowShare(true)}
          >
            Share
          </button>
          <button
            type="button"
            className="file-item-versions"
            onClick={toggleVersions}
          >
            {showVersions ? "Hide versions" : "Versions"}
          </button>
          <button
            type="button"
            className="file-item-rename"
            onClick={() => runAction(handleRename)}
            disabled={busy}
          >
            Rename
          </button>
          <button
            type="button"
            className="file-item-delete"
            onClick={() => runAction(handleDelete)}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>

      {error && <p className="file-item-error">{error}</p>}

      {showVersions && (
        <div className="file-item-history">
          {loadingVersions && (
            <p className="file-item-history-empty">Loading versions...</p>
          )}
          {!loadingVersions && versions.length === 0 && (
            <p className="file-item-history-empty">No version history.</p>
          )}
          {!loadingVersions &&
            versions.map((version) => (
              <div key={version.id} className="file-item-history-row">
                <span className="file-item-history-version">
                  v{version.version}
                  {version.version === file.version ? " (current)" : ""}
                </span>
                <div className="file-item-history-actions">
                  <button
                    type="button"
                    className="file-item-download"
                    onClick={() => handleDownload(version.s3Key)}
                  >
                    Download
                  </button>
                  {version.version !== file.version && (
                    <button
                      type="button"
                      className="file-item-rename"
                      onClick={() => runAction(() => handleRevert(version))}
                      disabled={busy}
                    >
                      Revert
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {showPreview && (
        <FilePreview file={file} onClose={() => setShowPreview(false)} />
      )}

      {showShare && (
        <ShareDialog file={file} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}

export default FileItem;
