import { useState } from "react";
import { client } from "../dataClient";
import "./NewFolderForm.css";

/** Creates a folder inside the folder currently being viewed. */
function NewFolderForm({ parentFolderId, onCreated }) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const folderName = name.trim();
    if (!folderName) {
      return;
    }
    setCreating(true);
    setError("");
    try {
      await client.models.Folder.create({
        name: folderName,
        parentFolderId,
      });
      setName("");
      onCreated?.();
    } catch {
      setError("Could not create the folder. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <form className="new-folder-form" onSubmit={handleSubmit}>
      <input
        className="new-folder-form-input"
        type="text"
        value={name}
        placeholder="New folder name"
        onChange={(event) => setName(event.target.value)}
        disabled={creating}
      />
      <button
        className="new-folder-form-button"
        type="submit"
        disabled={!name.trim() || creating}
      >
        {creating ? "Creating..." : "New folder"}
      </button>
      {error && <span className="new-folder-form-error">{error}</span>}
    </form>
  );
}

export default NewFolderForm;
