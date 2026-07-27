import "./Breadcrumbs.css";

/**
 * Path from the drive root down to the folder currently being viewed.
 * The trail is walked up through parentFolderId, then reversed.
 */
function Breadcrumbs({ folders, currentFolderId, onNavigate }) {
  const trail = [];
  let folderId = currentFolderId;
  while (folderId) {
    const folder = folders.find((candidate) => candidate.id === folderId);
    if (!folder) {
      break;
    }
    trail.unshift(folder);
    folderId = folder.parentFolderId;
  }

  return (
    <nav className="breadcrumbs">
      <button
        type="button"
        className="breadcrumbs-crumb"
        onClick={() => onNavigate(null)}
        disabled={currentFolderId === null}
      >
        My files
      </button>
      {trail.map((folder) => (
        <span key={folder.id} className="breadcrumbs-step">
          <span className="breadcrumbs-separator">/</span>
          <button
            type="button"
            className="breadcrumbs-crumb"
            onClick={() => onNavigate(folder.id)}
            disabled={folder.id === currentFolderId}
          >
            {folder.name}
          </button>
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumbs;
