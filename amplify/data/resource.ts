import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * DynamoDB-backed metadata for My Backend Dropbox.
 *
 * Each uploaded file gets one FileRecord. The actual bytes live in S3
 * (see amplify/storage/resource.ts); this table only tracks metadata so the
 * UI can list, rename, move, and delete files, and so the Phase 6 Lambda
 * functions can react to record changes (delete -> remove S3 objects,
 * rename/move -> copy the objects to the new prefix).
 *
 * Every upload is stored under its own versioned S3 key rather than
 * overwriting the previous object, so each version stays independently
 * downloadable and revertible. FileVersion holds one row per version;
 * FileRecord.s3Key/version always point at the current one.
 *
 * Folder gives files a nested tree. A folder is metadata only: nesting is
 * expressed by parentFolderId, and a file's folder is part of its S3 key
 * (files/{identityId}/{folderId}/{fileName}/v{n}) so two files with the same
 * name can live in different folders without colliding in the bucket.
 *
 * Auth is owner-based: `owner`, `id`, `createdAt`, and `updatedAt` are managed
 * automatically by Amplify, and each user can only see their own records.
 */
const schema = a.schema({
  Folder: a
    .model({
      name: a.string().required(),
      // Null for a top-level folder; otherwise the folder this one sits in.
      parentFolderId: a.id(),
    })
    .authorization((allow) => [allow.owner()]),

  FileRecord: a
    .model({
      fileName: a.string().required(),
      s3Key: a.string().required(),
      version: a.integer().default(1),
      // Null means the file sits at the root of the drive.
      folderId: a.id(),
      size: a.integer(),
      contentType: a.string(),
      versions: a.hasMany('FileVersion', 'fileRecordId'),
      shareLinks: a.hasMany('ShareLink', 'fileRecordId'),
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

  // One row per share the user has handed out, so shares stay listable and
  // revocable from the UI instead of being fire-and-forget URLs.
  ShareLink: a
    .model({
      fileRecordId: a.id().required(),
      fileRecord: a.belongsTo('FileRecord', 'fileRecordId'),
      fileName: a.string().required(),
      s3Key: a.string().required(),
      url: a.string().required(),
      expiresAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.owner()]),

  // One row per user, created on first visit to the profile page.
  UserProfile: a
    .model({
      displayName: a.string(),
      bio: a.string(),
      // S3 key of the avatar under profile/{identityId}/, if one was uploaded.
      avatarKey: a.string(),
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
