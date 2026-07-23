import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import {
  EventSourceMapping,
  Function as LambdaFunction,
  StartingPosition,
} from 'aws-cdk-lib/aws-lambda';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
import { data } from './data/resource';
import { deleteSync } from './functions/delete-sync/resource';
import { renameSync } from './functions/rename-sync/resource';

/**
 * Backend definition for My Backend Dropbox.
 * The two sync functions react to the FileRecord DynamoDB stream to keep S3
 * in step with metadata changes (delete -> remove objects, rename -> copy).
 */
const backend = defineBackend({
  auth,
  storage,
  data,
  deleteSync,
  renameSync,
});

const fileRecordTable = backend.data.resources.tables['FileRecord'];
const bucket = backend.storage.resources.bucket;

// Read access to the DynamoDB stream so the functions can consume its events.
const streamPolicy = new Policy(
  Stack.of(fileRecordTable),
  'FileRecordStreamReadPolicy',
  {
    statements: [
      new PolicyStatement({
        actions: [
          'dynamodb:DescribeStream',
          'dynamodb:GetRecords',
          'dynamodb:GetShardIterator',
          'dynamodb:ListStreams',
        ],
        resources: [fileRecordTable.tableStreamArn as string],
      }),
    ],
  }
);

for (const fn of [backend.deleteSync, backend.renameSync]) {
  const lambda = fn.resources.lambda as LambdaFunction;
  lambda.addEnvironment('BUCKET_NAME', bucket.bucketName);
  bucket.grantReadWrite(lambda);
  bucket.grantDelete(lambda);
  lambda.role?.attachInlinePolicy(streamPolicy);
}

// Lambda #1: only REMOVE events (file deleted).
const deleteMapping = new EventSourceMapping(
  Stack.of(fileRecordTable),
  'DeleteSyncStreamMapping',
  {
    target: backend.deleteSync.resources.lambda,
    eventSourceArn: fileRecordTable.tableStreamArn,
    startingPosition: StartingPosition.LATEST,
    filters: [{ pattern: JSON.stringify({ eventName: ['REMOVE'] }) }],
  }
);

// Lambda #2: only MODIFY events (metadata changed, e.g. rename).
const renameMapping = new EventSourceMapping(
  Stack.of(fileRecordTable),
  'RenameSyncStreamMapping',
  {
    target: backend.renameSync.resources.lambda,
    eventSourceArn: fileRecordTable.tableStreamArn,
    startingPosition: StartingPosition.LATEST,
    filters: [{ pattern: JSON.stringify({ eventName: ['MODIFY'] }) }],
  }
);

// The mappings can only be created once each role can read the stream, so
// make them wait for the stream-read policy to be attached.
deleteMapping.node.addDependency(streamPolicy);
renameMapping.node.addDependency(streamPolicy);
