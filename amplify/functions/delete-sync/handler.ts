import type { DynamoDBStreamHandler } from 'aws-lambda';
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

const s3 = new S3Client();
const BUCKET_NAME = process.env.BUCKET_NAME as string;

/**
 * On FileRecord delete, wipe every version object for that file.
 *
 * The stored s3Key looks like `files/{identityId}/{fileName}/v{n}`, so the
 * file's prefix is everything up to (and including) the final slash. Listing
 * and deleting that prefix removes all versions at once.
 */
export const handler: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== 'REMOVE') {
      continue;
    }

    const s3Key = record.dynamodb?.OldImage?.s3Key?.S;
    if (!s3Key) {
      continue;
    }

    const prefix = s3Key.slice(0, s3Key.lastIndexOf('/') + 1);
    await deletePrefix(prefix);
  }
};

async function deletePrefix(prefix: string): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const objects = (listed.Contents ?? [])
      .map((item) => item.Key)
      .filter((key): key is string => Boolean(key));

    if (objects.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: { Objects: objects.map((Key) => ({ Key })) },
        })
      );
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);
}
