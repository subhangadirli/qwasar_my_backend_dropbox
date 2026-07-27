// Helpers for the versioned S3 keys used throughout the app.
//
// Current shape: files/{identityId}/{folderSegment}/{fileName}/v{n}
// where folderSegment is a Folder id, or ROOT_SEGMENT for the drive root.
//
// Records created before folders existed use the shorter
// files/{identityId}/{fileName}/v{n}. Parsing tolerates that older shape and
// building always emits the current one, so any renamed or moved file quietly
// migrates to the new layout (the sync Lambda copies whatever prefix it sees).

export const ROOT_SEGMENT = 'root';

export function folderSegment(folderId) {
  return folderId ?? ROOT_SEGMENT;
}

function parseKey(key) {
  const parts = key.split('/');
  return {
    identityId: parts[1],
    segment: parts.length >= 5 ? parts[2] : ROOT_SEGMENT,
    fileName: parts[parts.length - 2],
    versionTail: parts[parts.length - 1],
  };
}

function buildKey({ identityId, segment, fileName, versionTail }) {
  return `files/${identityId}/${segment}/${fileName}/${versionTail}`;
}

// Same file, new name: used by rename.
export function withFileName(key, fileName) {
  return buildKey({ ...parseKey(key), fileName });
}

// Same file, new folder: used by move.
export function withFolder(key, folderId) {
  return buildKey({ ...parseKey(key), segment: folderSegment(folderId) });
}

// Same file, next version: used by revert.
export function withVersion(key, version) {
  return buildKey({ ...parseKey(key), versionTail: `v${version}` });
}
