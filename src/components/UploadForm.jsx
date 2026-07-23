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
      const { data: existing } = await client.models.FileRecord.list({
        filter: { fileName: { eq: file.name } },
      });
      const record = existing[0];
      const nextVersion = (record?.version ?? 0) + 1;

      // Each version gets its own S3 key so earlier versions stay downloadable
      // and revertible instead of being overwritten by the next upload.
      const { path } = await uploadData({
        path: ({ identityId }) =>
          `files/${identityId}/${file.name}/v${nextVersion}`,
        data: file,
      }).result;

      const fileRecordId = record
        ? record.id
        : (
            await client.models.FileRecord.create({
              fileName: file.name,
              s3Key: path,
              version: nextVersion,
            })
          ).data.id;

      if (record) {
        await client.models.FileRecord.update({
          id: record.id,
          s3Key: path,
          version: nextVersion,
        });
      }

      await client.models.FileVersion.create({
        fileRecordId,
        version: nextVersion,
        s3Key: path,
      });

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
