import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
import { data } from './data/resource';

/**
 * Backend definition for My Backend Dropbox.
 * Lambda sync functions are added in a later phase.
 */
defineBackend({
  auth,
  storage,
  data,
});
