import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * DynamoDB-backed metadata for My Backend Dropbox.
 *
 * Each uploaded file gets one FileRecord. The actual bytes live in S3
 * (see amplify/storage/resource.ts); this table only tracks metadata so the
 * UI can list, rename, and delete files, and so the Phase 6 Lambda functions
 * can react to record changes (delete -> remove S3 object, rename -> copy).
 *
 * Every upload is stored under its own versioned S3 key rather than
 * overwriting the previous object, so each version stays independently
 * downloadable and revertible. FileVersion holds one row per version;
 * FileRecord.s3Key/version always point at the current one.
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
      versions: a.hasMany('FileVersion', 'fileRecordId'),
    })
    .authorization((allow) => [allow.owner()]),

  FileVersion: a
    .model({
      fileRecordId: a.id().required(),
      fileRecord: a.belongsTo('FileRecord', 'fileRecordId'),
      version: a.integer().required(),
      s3Key: a.string().required(),
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
