# Welcome to My Backend Dropbox
***

## Task
TODO - What is the problem? And where is the challenge?

## Description
TODO - How have you solved the problem?

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

### The Core Team
gadirli_s
hajibala_n

<span><i>Made at <a href='https://qwasar.io'>Qwasar SV -- Software Engineering School</a></i></span>
<span><img alt='Qwasar SV -- Software Engineering School's Logo' src='https://storage.googleapis.com/qwasar-public/qwasar-logo_50x50.png' width='20px' /></span>
