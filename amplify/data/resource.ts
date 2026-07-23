import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * DynamoDB-backed metadata for My Backend Dropbox.
 *
 * Each uploaded file gets one FileRecord. The actual bytes live in S3
 * (see amplify/storage/resource.ts); this table only tracks metadata so the
 * UI can list, rename, and delete files, and so the Phase 6 Lambda functions
 * can react to record changes (delete -> remove S3 object, rename -> copy).
 *
 * Auth is owner-based: `owner`, `id`, `createdAt`, and `updatedAt` are managed
 * automatically by Amplify, and each user can only see their own records.
 */
const schema = a.schema({
  FileRecord: a
    .model({
      fileName: a.string().required(),
      s3Key: a.string().required(),
      version: a.integer().default(1),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
