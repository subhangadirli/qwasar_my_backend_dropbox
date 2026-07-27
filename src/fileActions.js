import { client } from "./dataClient";

/**
 * Remove a file's metadata: its version rows first, then the record itself.
 * The S3 objects are cleaned up by the delete-sync Lambda, which fires on the
 * FileRecord stream once the record is gone.
 *
 * Shared by the per-file Delete action and by the recursive folder delete.
 */
export async function deleteFileRecord(fileRecordId) {
  const { data: versions } = await client.models.FileVersion.list({
    filter: { fileRecordId: { eq: fileRecordId } },
  });
  await Promise.all(
    versions.map((version) =>
      client.models.FileVersion.delete({ id: version.id })
    )
  );

  const { data: shares } = await client.models.ShareLink.list({
    filter: { fileRecordId: { eq: fileRecordId } },
  });
  await Promise.all(
    shares.map((share) => client.models.ShareLink.delete({ id: share.id }))
  );

  await client.models.FileRecord.delete({ id: fileRecordId });
}
