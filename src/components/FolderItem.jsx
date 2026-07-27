import "./FolderItem.css";

/**
 * One folder row. Deleting is recursive, so the confirmation and the actual
 * cascade live in App where the full folder and file lists are available.
 */
function FolderItem({ folder, onOpen, onRename, onDelete }) {
  return (
    <div className="folder-item">
      <button
        type="button"
        className="folder-item-open"
        onClick={() => onOpen(folder.id)}
      >
        <span className="folder-item-icon" aria-hidden="true" />
        <span className="folder-item-name">{folder.name}</span>
      </button>
      <div className="folder-item-actions">
        <button
          type="button"
          className="folder-item-rename"
          onClick={() => onRename(folder)}
        >
          Rename
        </button>
        <button
          type="button"
          className="folder-item-delete"
          onClick={() => onDelete(folder)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default FolderItem;
