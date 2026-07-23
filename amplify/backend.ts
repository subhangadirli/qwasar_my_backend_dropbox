import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';

/**
 * Backend definition for My Backend Dropbox.
 * DynamoDB data and Lambda functions are added in later phases.
 */
defineBackend({
  auth,
  storage,
});
