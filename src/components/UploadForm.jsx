import { useState } from "react";
import { uploadData } from "aws-amplify/storage";
import { client } from "../dataClient";
import "./UploadForm.css";

function UploadForm({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      return;
    }
    setUploading(true);
    setError("");
    try {
      const { path } = await uploadData({
        path: ({ identityId }) => `files/${identityId}/${file.name}`,
        data: file,
      }).result;

      // Upsert the metadata record so re-uploading the same name bumps its
      // version instead of creating a duplicate row.
      const { data: existing } = await client.models.FileRecord.list({
        filter: { s3Key: { eq: path } },
      });
      if (existing.length > 0) {
        await client.models.FileRecord.update({
          id: existing[0].id,
          version: (existing[0].version ?? 1) + 1,
        });
      } else {
        await client.models.FileRecord.create({
          fileName: file.name,
          s3Key: path,
          version: 1,
        });
      }

      setFile(null);
      event.target.reset();
      onUploaded?.();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <input
        className="upload-form-input"
        type="file"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        disabled={uploading}
      />
      <button
        className="upload-form-button"
        type="submit"
        disabled={!file || uploading}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {error && <span className="upload-form-error">{error}</span>}
    </form>
  );
}

export default UploadForm;
