// Helpers for turning the flat Folder list (each row holds a parentFolderId)
// into the tree shapes the UI needs.

const ROOT_LABEL = "My files";

/**
 * Every folder as a flat "My files / Reports / 2026" path, root first.
 * Used to populate the move-to-folder control on a file.
 */
export function folderOptions(folders) {
  const options = [{ id: null, path: ROOT_LABEL }];

  function walk(parentId, prefix) {
    folders
      .filter((folder) => (folder.parentFolderId ?? null) === parentId)
      .forEach((folder) => {
        const path = `${prefix} / ${folder.name}`;
        options.push({ id: folder.id, path });
        walk(folder.id, path);
      });
  }

  walk(null, ROOT_LABEL);
  return options;
}

/** A folder plus everything nested under it, for a recursive delete. */
export function folderAndDescendantIds(folders, folderId) {
  const ids = [folderId];
  // The list is not guaranteed to be parent-before-child, so keep sweeping
  // until a pass adds nothing new.
  let previousCount = 0;
  while (ids.length !== previousCount) {
    previousCount = ids.length;
    for (const folder of folders) {
      if (
        folder.parentFolderId &&
        ids.includes(folder.parentFolderId) &&
        !ids.includes(folder.id)
      ) {
        ids.push(folder.id);
      }
    }
  }
  return ids;
}
