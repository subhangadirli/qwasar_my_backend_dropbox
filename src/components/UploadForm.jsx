import { useState } from "react";
import { uploadData } from "aws-amplify/storage";
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
      await uploadData({
        path: ({ identityId }) => `files/${identityId}/${file.name}`,
        data: file,
      }).result;
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
