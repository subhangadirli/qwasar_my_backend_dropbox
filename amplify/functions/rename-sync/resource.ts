import { defineFunction } from '@aws-amplify/backend';

/**
 * Lambda #2 - Rename sync.
 * Triggered by the FileRecord DynamoDB stream (MODIFY events). When a file's
 * name changes, this copies every version object from the old S3 prefix to the
 * new one and deletes the old prefix, keeping S3 in step with the metadata.
 */
export const renameSync = defineFunction({
  name: 'rename-sync',
});
