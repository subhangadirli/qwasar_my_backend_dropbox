# Welcome to My Backend Dropbox
***

**Live app:** https://dev.d190ggic3r9qzw.amplifyapp.com

## Task
Build a Dropbox-style file-synchronization service that is fully serverless on AWS,
with a ReactJS frontend. It must let a user sign in, upload files to private storage,
keep a version history of each file, and be reachable at a live URL with managed
DNS/routing. The challenge is coordinating several managed services (auth, object
storage, a metadata database, and event-driven functions) so that a change made in
one place is reflected everywhere, without running or managing any servers.

## Description
The app is hosted on AWS Amplify (CloudFront + managed DNS) and wires together:
Amazon Cognito for authentication, Amazon S3 for private per-user file storage,
Amazon DynamoDB for file metadata, and two AWS Lambda functions that react to the
metadata table's stream. Uploads go to S3 under a versioned key and record a metadata
row; re-uploading the same name creates a new version instead of overwriting. Delete
and rename only touch DynamoDB, and the Lambda functions keep S3 in step: one removes
a file's objects when its record is deleted, the other copies objects under the new
name when a record is renamed. Everything is defined in code (Amplify Gen 2) and
deployed by the Amplify CI/CD pipeline on every push.

## Architecture

```
                Users
                  |
                  v
        AWS Amplify Hosting            (CloudFront CDN + managed DNS/routing)
        serves the React app
                  |
   +--------------+-----------------------------+
   |              |                             |
   v              v                             v
 Cognito         S3                          DynamoDB
 (sign in)   (file storage:              (file metadata:
             files + versions)            FileRecord + FileVersion)
                  ^                             |
                  |                             | table stream
                  |          +------------------+------------------+
                  |          |                                     |
                  |    REMOVE event                          MODIFY event
                  |          |                                     |
                  |          v                                     v
                  |   Lambda #1 (delete-sync)            Lambda #2 (rename-sync)
                  +-- delete all version objects   copy objects to new name,
                      under the file's prefix       delete the old prefix ------+
                                                                                |
                  ^-------------------------------------------------------------+
```

### Data flows
- **Upload:** file (or new version) -> S3 versioned key, metadata -> DynamoDB.
- **Delete:** delete DynamoDB record -> table stream -> Lambda #1 -> remove the
  file's objects from S3.
- **Rename:** change file name in DynamoDB -> table stream -> Lambda #2 -> copy the
  S3 objects under the new name, delete the old ones.

Everything is defined in code under `amplify/` with Amplify Gen 2 (`defineAuth`,
`defineStorage`, `defineData`, `defineFunction`) and the stream wiring lives in
`amplify/backend.ts`.

## Installation

Prerequisites: an AWS account (free tier is enough) and AWS credentials configured
locally (`aws configure` or `amplify configure`).

```
npm install
```

## Usage

The backend is defined with AWS Amplify Gen 2 in the `amplify/` folder. It must be
deployed once so the app receives its `amplify_outputs.json` (Cognito, and later S3
and DynamoDB details). This file is generated on deploy and is git-ignored.

Deploy a personal cloud sandbox and keep it running:

```
npx ampx sandbox
```

In a second terminal, start the frontend:

```
npm run dev
```

Open the local URL. You will be greeted by the Cognito sign-in screen: create an
account, confirm it with the code emailed to you, then log in. The top bar shows your
email and a Sign out button.

Once signed in you can upload files, which are stored privately in S3 under your own
identity. Each upload also writes a metadata record to DynamoDB, and the file list is
read from there. Every file has Download, Rename, and Delete actions, and every user
only ever sees and accesses their own files.

Re-uploading a file with the same name does not overwrite it: each upload is stored
under its own versioned S3 key and gets its own DynamoDB history entry, while the
metadata record keeps pointing at the current version. Use the Versions button on a
file to see its full history, download any past version, or revert to one, which
copies that version's object forward as a new current version.

Delete and rename only touch the DynamoDB metadata. Two Lambda functions subscribed
to the metadata table's stream keep S3 in step: deleting a record removes all of that
file's version objects, and renaming a record copies its objects under the new name
and removes the old ones.

## Deployment

The live app is hosted on AWS Amplify Hosting. The repository is connected to the
Amplify Console, and every push to the `dev` branch runs the pipeline in `amplify.yml`:
it deploys the backend (`npx ampx pipeline-deploy`) and builds the React frontend
(`npm run build` into `dist/`), then serves it on CloudFront at the live URL above.
No custom domain / Route 53 hosted zone is registered; the app uses the default
`*.amplifyapp.com` URL with Amplify-managed DNS and routing.

### The Core Team
gadirli_s
hajibala_n

<span><i>Made at <a href='https://qwasar.io'>Qwasar SV -- Software Engineering School</a></i></span>
<span><img alt='Qwasar SV -- Software Engineering School's Logo' src='https://storage.googleapis.com/qwasar-public/qwasar-logo_50x50.png' width='20px' /></span>
