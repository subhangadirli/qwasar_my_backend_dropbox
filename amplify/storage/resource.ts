import { defineStorage } from '@aws-amplify/backend';

/**
 * S3 bucket for My Backend Dropbox.
 * Each signed-in user can read, write, and delete only their own files,
 * stored under a per-identity prefix (files/{entity_id}/*).
 */
export const storage = defineStorage({
  name: 'myBackendDropboxFiles',
  access: (allow) => ({
    'files/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
