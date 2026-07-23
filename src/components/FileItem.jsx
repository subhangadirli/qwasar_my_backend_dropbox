import "./FileItem.css";

function FileItem({ name = "example.txt" }) {
  return (
    <div className="file-item">
      <span className="file-item-name">{name}</span>
    </div>
  );
}

export default FileItem;
