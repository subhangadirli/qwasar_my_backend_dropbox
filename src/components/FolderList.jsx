import FolderItem from "./FolderItem";
import "./FolderList.css";

/** Folders inside the folder currently being viewed. */
function FolderList({ folders, onOpen, onRename, onDelete }) {
  if (folders.length === 0) {
    return null;
  }

  return (
    <section className="folder-list">
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          onOpen={onOpen}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </section>
  );
}

export default FolderList;
