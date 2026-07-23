import { getUrl } from "aws-amplify/storage";
import { client } from "../dataClient";
import "./FileItem.css";

function FileItem({ file, onChanged }) {
  async function handleDownload() {
    const { url } = await getUrl({ path: file.s3Key });
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  async function handleRename() {
    const newName = window.prompt("New file name:", file.fileName);
    if (!newName || newName === file.fileName) {
      return;
    }
    // Change the name in DynamoDB. The Phase 6 Lambda mirrors this in S3 by
    // copying the object under the new key and deleting the old one.
    const parts = file.s3Key.split("/");
    parts[parts.length - 1] = newName;
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
    // Deleting the record triggers the Phase 6 Lambda that removes the S3 object.
    await client.models.FileRecord.delete({ id: file.id });
    onChanged?.();
  }

  return (
    <div className="file-item">
      <span className="file-item-name">{file.fileName}</span>
      <div className="file-item-actions">
        <button
          type="button"
          className="file-item-download"
          onClick={handleDownload}
        >
          Download
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
  );
}

export default FileItem;
