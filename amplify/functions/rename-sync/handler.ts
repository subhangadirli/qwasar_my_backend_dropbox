import type { DynamoDBStreamHandler } from 'aws-lambda';
import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

const s3 = new S3Client();
const BUCKET_NAME = process.env.BUCKET_NAME as string;

/**
 * On a FileRecord rename, mirror the change in S3.
 *
 * s3Key is `files/{identityId}/{fileName}/v{n}`, so the file prefix is
 * everything up to the final slash. When only the name changed, copy every
 * object under the old prefix to the new prefix (preserving the v{n} tail),
 * then delete the old prefix.
 */
export const handler: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== 'MODIFY') {
      continue;
    }

    const oldName = record.dynamodb?.OldImage?.fileName?.S;
    const newName = record.dynamodb?.NewImage?.fileName?.S;
    const oldKey = record.dynamodb?.OldImage?.s3Key?.S;
    const newKey = record.dynamodb?.NewImage?.s3Key?.S;

    if (!oldName || !newName || oldName === newName || !oldKey || !newKey) {
      continue;
    }

    const oldPrefix = oldKey.slice(0, oldKey.lastIndexOf('/') + 1);
    const newPrefix = newKey.slice(0, newKey.lastIndexOf('/') + 1);
    if (oldPrefix === newPrefix) {
      continue;
    }

    await copyPrefix(oldPrefix, newPrefix);
    await deletePrefix(oldPrefix);
  }
};

async function copyPrefix(oldPrefix: string, newPrefix: string): Promise<void> {
  for await (const key of listKeys(oldPrefix)) {
    const destination = newPrefix + key.slice(oldPrefix.length);
    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${key}`,
        Key: destination,
      })
    );
  }
}

async function deletePrefix(prefix: string): Promise<void> {
  const keys: string[] = [];
  for await (const key of listKeys(prefix)) {
    keys.push(key);
  }
  if (keys.length === 0) {
    return;
  }
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    })
  );
}

async function* listKeys(prefix: string): AsyncGenerator<string> {
  let continuationToken: string | undefined;
  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const item of listed.Contents ?? []) {
      if (item.Key) {
        yield item.Key;
      }
    }
    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);
}
