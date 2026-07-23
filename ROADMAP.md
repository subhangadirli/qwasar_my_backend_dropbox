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
- [ ] Enable S3 bucket versioning (or versioned keys like `file_v2.pdf`)
- [ ] On re-upload of same filename → new version, bump `version` in DynamoDB
- [ ] UI: show version history / allow reverting

## Phase 6 — Lambda Sync Functions
Two functions triggered by DynamoDB Streams:
- [ ] **Lambda #1 — Delete sync**: on record delete → delete matching S3 object
- [ ] **Lambda #2 — Rename sync**: on `fileName` change → copy old S3 object under new name, delete old
- [ ] `amplify add function` for each; enable DynamoDB stream trigger
- [ ] Test each trigger end-to-end

## Phase 7 — Deploy & DNS/Routing — *Spec #4*
- [ ] `amplify add hosting` → deploy React app (`amplify publish`)
- [ ] Configure Route 53 for domain/routing
- [ ] Confirm live URL works end-to-end (login → upload → version → rename → delete)

## Phase 8 — Polish & Submit
- [ ] Creative CSS / design pass
- [ ] README: description + live URL + architecture diagram + setup steps
- [ ] Verify `.gitignore` excludes `node_modules/`
- [ ] Confirm "one component per file" + matching CSS rules honored
- [ ] Final end-to-end test on deployed site
- [ ] Submit + prep for Peer Review

---

## Spec coverage
| Spec | Phase |
|------|-------|
| User authentication | 2 |
| Upload a file | 3 |
| Versioning | 5 |
| DNS/Routing | 7 |

## Team split (Subhan & Narmin)
- **Frontend owner:** Phases 1–5 UI
- **Backend/Deploy owner:** Phases 6–7 (Lambda + hosting)
- Meet at the **DynamoDB metadata contract** in Phase 4.
