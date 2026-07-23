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
- [ ] Create/verify AWS account (free tier)
- [ ] Install tools: `node`, `npm`, AWS CLI, Amplify CLI (`npm i -g @aws-amplify/cli`)
- [ ] `amplify configure` → create IAM user, set credentials
- [ ] Init repo: React app + `.gitignore` (must exclude `node_modules/`)
- [ ] Set up folder structure:

```
src/
  components/      # one component per file
  App.js
  App.css
amplify/           # created by amplify init
README.md          # live URL + description
```

## Phase 1 — Frontend Skeleton
- [ ] Create React app (`create-react-app` or Vite)
- [ ] Build placeholder components (each in own file + matching `.css`):
  - [ ] `NavBar.js` / `.css`
  - [ ] `FileList.js` / `.css`
  - [ ] `UploadForm.js` / `.css`
  - [ ] `FileItem.js` / `.css`
- [ ] Run locally (`npm start`)

## Phase 2 — Authentication (Cognito) — *Spec #1*
- [ ] `amplify add auth` → Cognito user pool (email login)
- [ ] `amplify push`
- [ ] Wrap app with `withAuthenticator`
- [ ] Verify: sign up → confirm email → log in

## Phase 3 — File Upload & Storage (S3) — *Spec #2*
- [ ] `amplify add storage` → S3 bucket (auth users read/write own files)
- [ ] `amplify push`
- [ ] Wire `UploadForm` to `Storage.put()`
- [ ] Wire `FileList` to `Storage.list()` + `Storage.get()`
- [ ] Verify files land in S3 and appear in UI

## Phase 4 — Metadata DB (DynamoDB)
- [ ] `amplify add api` (GraphQL) or add DynamoDB table directly
- [ ] Schema: `{ id, fileName, s3Key, owner, version, updatedAt }`
- [ ] On upload → write DynamoDB record
- [ ] `FileList` reads from DynamoDB
- [ ] Add delete + rename actions in UI (update DynamoDB)

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
