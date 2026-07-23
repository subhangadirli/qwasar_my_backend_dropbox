import { useState } from "react";
import { copy, getUrl } from "aws-amplify/storage";
import { client } from "../dataClient";
import "./FileItem.css";

function FileItem({ file, onChanged }) {
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

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

  async function handleRevert(oldVersion) {
    if (
      !window.confirm(
        `Revert "${file.fileName}" to version ${oldVersion.version}?`
      )
    ) {
      return;
    }
    const nextVersion = file.version + 1;
    const newPath = oldVersion.s3Key.replace(
      /\/v\d+$/,
      `/v${nextVersion}`
    );

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
    // Renames the metadata pointer only; the Phase 6 Lambda mirrors this in
    // S3 by copying the current object under the new name and deleting the old.
    const parts = file.s3Key.split("/");
    parts[parts.length - 2] = newName;
    await client.models.FileRecord.update({
      id: file.id,
      fileName: newName,
      s3Key: parts.join("/"),
    });
    onChanged?.();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${file.fileName}"?`)) {
      return;
    }
    const { data: fileVersions } = await client.models.FileVersion.list({
      filter: { fileRecordId: { eq: file.id } },
    });
    await Promise.all(
      fileVersions.map((version) =>
        client.models.FileVersion.delete({ id: version.id })
      )
    );
    // Deleting the record triggers the Phase 6 Lambda that removes the S3 objects.
    await client.models.FileRecord.delete({ id: file.id });
    onChanged?.();
  }

  return (
    <div className="file-item">
      <div className="file-item-row">
        <span className="file-item-name">{file.fileName}</span>
        <span className="file-item-version">v{file.version}</span>
        <div className="file-item-actions">
          <button
            type="button"
            className="file-item-download"
            onClick={() => handleDownload(file.s3Key)}
          >
            Download
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
            onClick={handleRename}
          >
            Rename
          </button>
          <button
            type="button"
            className="file-item-delete"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>

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
                      onClick={() => handleRevert(version)}
                    >
                      Revert
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default FileItem;
