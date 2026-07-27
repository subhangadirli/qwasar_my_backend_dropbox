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

On top of that core, files can be organised into nested folders, previewed inline
(images, PDFs, video, audio, and text), and handed out as expiring public share
links, and each account has an editable profile with an avatar and a summary of
what it is storing.

### Features
- Email sign-up and sign-in with Amazon Cognito, with every user scoped to their own files
- Upload files to private per-user S3 storage, with download of any file
- Version history: re-uploading a name adds a version, and any past version can be
  downloaded or reverted to
- Nested folders with breadcrumb navigation, rename, recursive delete, and moving
  files between folders
- Inline preview for images, PDFs, video, audio, and text files
- Expiring public share links that can be copied and revoked
- Profile page with display name, bio, avatar, and storage statistics
- Rename and delete backed by event-driven Lambda functions that keep S3 in step
- Live on a CloudFront-backed URL with Amplify-managed DNS and CI/CD on every push

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
 (sign in)   (file storage:              (metadata: Folder,
             files, versions,             FileRecord, FileVersion,
             avatars)                     ShareLink, UserProfile)
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
- **Rename / move:** change the file name or folder in DynamoDB -> table stream ->
  Lambda #2 -> copy the S3 objects under the new prefix, delete the old ones.
- **Share:** presign the file's S3 key for a chosen lifetime -> record the URL as a
  ShareLink row so it can be listed and revoked.

S3 keys are `files/{identityId}/{folderId}/{fileName}/v{n}`. Folders are metadata
(a `Folder` row with a `parentFolderId`), but the folder id is part of the key, so
two files with the same name in different folders never collide, and a move is just
a prefix rewrite that Lambda #2 mirrors in the bucket.

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
read from there. Every file has Preview, Download, Share, Versions, Rename, and Delete
actions, and every user only ever sees and accesses their own files.

Use "New folder" to create a folder in the place you are currently viewing, click a
folder to open it, and use the breadcrumbs at the top to walk back up. Folders nest as
deeply as you like. The dropdown on a file moves it to any folder in the drive.
Deleting a folder deletes everything inside it, after a confirmation that tells you
how many files that is.

Preview opens a file in place: images, PDFs, video, audio, and text files render
inline, and anything else offers a download instead.

Share creates a public link to a file that expires after 15 minutes or an hour. The
link is copied to your clipboard, and it works for anyone, signed in or not. The
dialog lists the links you have already made for that file, with their expiry, so you
can copy one again or revoke it early. Links are signed with your temporary session
credentials, which is why an hour is the longest lifetime offered.

The Profile link in the top bar opens your account page: set a display name, a bio,
and an avatar, and see how many files, folders, and versions you are storing, how much
space the current versions take, and how many share links are still active.

Re-uploading a file with the same name does not overwrite it: each upload is stored
under its own versioned S3 key and gets its own DynamoDB history entry, while the
metadata record keeps pointing at the current version. Use the Versions button on a
file to see its full history, download any past version, or revert to one, which
copies that version's object forward as a new current version.

Delete, rename, and move only touch the DynamoDB metadata. Two Lambda functions
subscribed to the metadata table's stream keep S3 in step: deleting a record removes
all of that file's version objects, and renaming or moving a record copies its objects
under the new prefix and removes the old ones.

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
