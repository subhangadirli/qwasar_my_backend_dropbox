import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';

/**
 * Backend definition for My Backend Dropbox.
 * S3 storage, DynamoDB data, and Lambda functions are added in later phases.
 */
defineBackend({
  auth,
});
