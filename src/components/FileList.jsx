import FileItem from "./FileItem";
import "./FileList.css";

function FileList({ files, loading }) {
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
        <p className="file-list-empty">No files yet.</p>
      </section>
    );
  }

  return (
    <section className="file-list">
      {files.map((file) => (
        <FileItem key={file.path} file={file} />
      ))}
    </section>
  );
}

export default FileList;
