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

// Returns null for anything that is not a recognisable file key, so callers
// can leave such a key alone rather than rewriting it into nonsense.
function parseKey(key) {
  const parts = key.split('/');
  if (parts.length < 4 || parts[0] !== 'files') {
    return null;
  }
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
  const parsed = parseKey(key);
  return parsed ? buildKey({ ...parsed, fileName }) : key;
}

// Same file, new folder: used by move.
export function withFolder(key, folderId) {
  const parsed = parseKey(key);
  return parsed
    ? buildKey({ ...parsed, segment: folderSegment(folderId) })
    : key;
}

// Same file, next version: used by revert.
export function withVersion(key, version) {
  const parsed = parseKey(key);
  return parsed ? buildKey({ ...parsed, versionTail: `v${version}` }) : key;
}
