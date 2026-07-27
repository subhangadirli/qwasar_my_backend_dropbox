# Roadmap — My Backend Dropbox (Serverless)

A file-synchronization service (Dropbox-style) built entirely serverless on AWS.
React frontend + AWS Amplify + Cognito + S3 + DynamoDB + Lambda. Free-tier friendly (~$0).

## Architecture

```
Users → Route 53 (DNS) → Amplify (hosts React app + coordinates services)
                            ├── Cognito     → authentication
                            ├── S3          → file storage (files + versions)
                            └── DynamoDB     → file metadata
                                 ├── Lambda #1 (on record delete)      → delete file from S3
                                 └── Lambda #2 (on file-name change)   → replicate under new name, delete old
```

### Data flows
- **Upload:** file (or new version) → S3, metadata → DynamoDB
- **Delete:** delete DynamoDB record → Lambda #1 → remove file from S3
- **Rename:** change file name in DynamoDB → Lambda #2 → copy S3 object under new name, delete old

---

## Phase 0 — Setup & Prerequisites
- [x] Create/verify AWS account (free tier)
- [x] Install tools: `node`, `npm`, Amplify Gen 2 CLI (`ampx` via `npx`, no global AWS CLI needed)
- [x] Create IAM user (`amplify-dev`) and set credentials in `~/.aws/credentials`
- [x] Init repo: Vite React app + `.gitignore` (excludes `node_modules/`)
- [x] Set up folder structure:

```
src/
  components/      # one component per file
  App.js
  App.css
amplify/           # created by amplify init
README.md          # live URL + description
```

## Phase 1 — Frontend Skeleton
- [x] Create React app (`create-react-app` or Vite)
- [x] Build placeholder components (each in own file + matching `.css`):
  - [x] `NavBar.jsx` / `.css`
  - [x] `FileList.jsx` / `.css`
  - [x] `UploadForm.jsx` / `.css`
  - [x] `FileItem.jsx` / `.css`
- [x] Run locally (`npm run dev`)

## Phase 2 — Authentication (Cognito) — *Spec #1*
Using Amplify Gen 2 (code-first) instead of the Gen 1 CLI commands below.
- [x] Define Cognito auth backend (`amplify/auth/resource.ts`, email login)
- [x] Wrap app with `<Authenticator>` and add sign-out
- [x] Deploy Cognito user pool (`eu-north-1`) and generate `amplify_outputs.json`
- [x] Sign-in screen renders against live Cognito (build passes)

## Phase 3 — File Upload & Storage (S3) — *Spec #2*
Using Amplify Gen 2 storage (per-identity access) instead of the Gen 1 commands below.
- [x] Define S3 storage backend (`amplify/storage/resource.ts`, per-user access)
- [x] Deploy S3 bucket (`npx ampx sandbox`)
- [x] Wire `UploadForm` to `uploadData()`
- [x] Wire `FileList` + `FileItem` to `list()` + `getUrl()` (download)

## Phase 4 — Metadata DB (DynamoDB)
Using Amplify Gen 2 data (`defineData`, owner-based auth) instead of the Gen 1 commands below.
- [x] Define DynamoDB/AppSync data backend (`amplify/data/resource.ts`)
- [x] Schema: `FileRecord { id, fileName, s3Key, owner, version, createdAt, updatedAt }` (id/owner/timestamps auto-managed)
- [x] On upload → upsert DynamoDB record (bumps `version` on re-upload of same name)
- [x] `FileList` reads from DynamoDB
- [x] Add delete + rename actions in UI (update DynamoDB; S3 side synced by Phase 6 Lambdas)

## Phase 5 — Versioning — *Spec #3*
Using versioned S3 keys (`files/{identityId}/{fileName}/v{n}`) instead of
bucket-level versioning, so every version stays independently downloadable.
- [x] Enable S3 bucket versioning (or versioned keys like `file_v2.pdf`)
- [x] On re-upload of same filename → new version, bump `version` in DynamoDB
- [x] UI: show version history / allow reverting

## Phase 6 — Lambda Sync Functions
Two functions triggered by the `FileRecord` DynamoDB stream (defined in code with
`defineFunction` + CDK `EventSourceMapping`, one consumer per event type).
- [x] **Lambda #1 — Delete sync** (`amplify/functions/delete-sync`): on record REMOVE → delete every version object under the file's S3 prefix
- [x] **Lambda #2 — Rename sync** (`amplify/functions/rename-sync`): on record MODIFY where `fileName` changed → copy the whole prefix under the new name, delete the old prefix
- [x] Deploy both functions with stream triggers (filtered by event type) and S3 read/write/delete grants
- [x] Rename also updates FileVersion keys so version history survives a rename
- [ ] End-to-end trigger test on the deployed site (manual check on live site)

## Phase 7 — Deploy & DNS/Routing — *Spec #4*
Hosted on AWS Amplify Hosting (fullstack Gen 2 CI/CD). The Amplify Console does not
support Qwasar's Gitea as a Git source, so the repo is mirrored to GitHub and connected
from there; every push then auto-deploys the backend (`ampx pipeline-deploy`) and builds
the frontend per `amplify.yml`.
- [x] Add `amplify.yml` build spec (backend deploy + `dist` frontend build)
- [x] Mirror repo to GitHub and connect the branch in the Amplify Console
- [x] Let the first CI/CD build deploy backend + frontend (live at `https://dev.d190ggic3r9qzw.amplifyapp.com`)
- [ ] Confirm live URL works end-to-end (login → upload → version → rename → delete)

**DNS/Routing note:** the app is served on the default `*.amplifyapp.com` URL, which
runs on CloudFront with Amplify-managed DNS/routing. No custom domain / Route 53 hosted
zone is registered (kept at $0). Spec #4 is met by the managed routing layer rather than
a self-owned Route 53 zone — a deliberate cost choice to note in peer review.

## Phase 8 — Polish & Submit
- [x] Creative CSS / design pass (clean minimal, shared light/dark tokens)
- [x] README: description + live URL + architecture diagram + setup steps
- [x] Verify `.gitignore` excludes `node_modules/`
- [x] Confirm "one component per file" + matching CSS rules honored
- [ ] Final end-to-end test on deployed site
- [ ] Submit + prep for Peer Review

## Phase 9 — Extended Feature Set
Beyond the four graded specs, the assignment's question list also covers folders, a
profile, previews, and sharing. All of these are metadata-first: the existing S3
layout and the two sync Lambdas absorb them without new infrastructure.
- [x] `Folder` model (`parentFolderId` nesting) and `folderId` on `FileRecord`
- [x] Folder id is part of the S3 key, so same-named files in different folders no
      longer collide (`files/{identityId}/{folderId}/{fileName}/v{n}`)
- [x] Breadcrumb navigation, create folder, rename folder, recursive folder delete
- [x] Move a file between folders (the rename Lambda now keys off the S3 prefix, so
      one rule covers both rename and move)
- [x] Inline preview: images, PDFs, video, audio, text (`contentType` captured on
      upload, file extension used as a fallback for older records)
- [x] Public share links: presigned URL with a chosen expiry, recorded as a
      `ShareLink` row so shares stay listable and revocable
- [x] Profile page: display name, bio, avatar (`profile/{entity_id}/*`), and storage
      statistics
- [ ] End-to-end check of the new features on the deployed site

---

## Spec coverage
| Spec | Phase |
|------|-------|
| User authentication | 2 |
| Upload a file | 3 |
| Versioning | 5 |
| DNS/Routing | 7 (Amplify Hosting + CloudFront managed routing) |

## Team split (Subhan & Narmin)
- **Frontend owner:** Phases 1–5 UI
- **Backend/Deploy owner:** Phases 6–7 (Lambda + hosting)
- Meet at the **DynamoDB metadata contract** in Phase 4.
