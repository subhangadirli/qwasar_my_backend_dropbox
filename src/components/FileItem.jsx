import { getUrl } from "aws-amplify/storage";
import "./FileItem.css";

function FileItem({ file }) {
  const name = file.path.split("/").pop();

  async function handleDownload() {
    const { url } = await getUrl({ path: file.path });
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="file-item">
      <span className="file-item-name">{name}</span>
      <button
        type="button"
        className="file-item-download"
        onClick={handleDownload}
      >
        Download
      </button>
    </div>
  );
}

export default FileItem;
