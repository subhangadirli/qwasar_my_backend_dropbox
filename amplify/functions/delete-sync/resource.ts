import { defineFunction } from '@aws-amplify/backend';

/**
 * Lambda #1 - Delete sync.
 * Triggered by the FileRecord DynamoDB stream (REMOVE events). When a file's
 * metadata record is deleted, this removes every version object for that file
 * from S3 so no orphaned bytes are left behind.
 */
export const deleteSync = defineFunction({
  name: 'delete-sync',
});
