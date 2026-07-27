import { defineStorage } from '@aws-amplify/backend';

/**
 * S3 bucket for My Backend Dropbox.
 * Each signed-in user can read, write, and delete only their own objects,
 * stored under per-identity prefixes: uploaded files under files/{entity_id}/
 * and the profile avatar under profile/{entity_id}/.
 */
export const storage = defineStorage({
  name: 'myBackendDropboxFiles',
  access: (allow) => ({
    'files/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'profile/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
