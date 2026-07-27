import FileItem from "./FileItem";
import "./FileList.css";

function FileList({ files, folderOptions, loading, onChanged }) {
  if (loading) {
    return (
      <section className="file-list">
        <p className="file-list-empty">Loading files...</p>
      </section>
    );
  }

  if (files.length === 0) {
    return (
      <section className="file-list">
        <p className="file-list-empty">No files here yet.</p>
      </section>
    );
  }

  return (
    <section className="file-list">
      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          folderOptions={folderOptions}
          onChanged={onChanged}
        />
      ))}
    </section>
  );
}

export default FileList;
