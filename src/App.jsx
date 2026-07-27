import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Authenticator } from '@aws-amplify/ui-react'
import { client } from './dataClient'
import { deleteFileRecord } from './fileActions'
import { folderAndDescendantIds, folderOptions } from './folderTree'
import NavBar from './components/NavBar'
import Breadcrumbs from './components/Breadcrumbs'
import NewFolderForm from './components/NewFolderForm'
import UploadForm from './components/UploadForm'
import FolderList from './components/FolderList'
import FileList from './components/FileList'
import ProfilePage from './components/ProfilePage'
import './App.css'

function App() {
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('files')
  // A folder delete cascades over many rows, so keep two of them from
  // overlapping if the button is clicked again before the first one finishes.
  const folderActionRef = useRef(false)

  const loadDrive = useCallback(async () => {
    setLoading(true)
    try {
      // Folders and files both come from DynamoDB metadata, not a raw S3 listing.
      const [folderResult, fileResult] = await Promise.all([
        client.models.Folder.list(),
        client.models.FileRecord.list(),
      ])
      const nextFolders = folderResult.data
      const nextFiles = fileResult.data
      nextFolders.sort((a, b) => a.name.localeCompare(b.name))
      nextFiles.sort((a, b) => a.fileName.localeCompare(b.fileName))
      setFolders(nextFolders)
      setFiles(nextFiles)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDrive()
  }, [loadDrive])

  // The whole drive is held in memory and filtered here: a single-user drive is
  // small, and it keeps navigation instant with no extra round trip per folder.
  const visibleFolders = useMemo(
    () =>
      folders.filter(
        (folder) => (folder.parentFolderId ?? null) === currentFolderId
      ),
    [folders, currentFolderId]
  )

  const visibleFiles = useMemo(
    () => files.filter((file) => (file.folderId ?? null) === currentFolderId),
    [files, currentFolderId]
  )

  const moveTargets = useMemo(() => folderOptions(folders), [folders])

  async function handleRenameFolder(folder) {
    const newName = window.prompt('New folder name:', folder.name)
    if (!newName || newName === folder.name || folderActionRef.current) {
      return
    }
    folderActionRef.current = true
    try {
      // Folders are referenced by id inside S3 keys, so a folder rename touches
      // metadata only and no objects have to move.
      await client.models.Folder.update({ id: folder.id, name: newName })
      loadDrive()
    } finally {
      folderActionRef.current = false
    }
  }

  async function handleDeleteFolder(folder) {
    if (folderActionRef.current) {
      return
    }
    const doomedFolderIds = folderAndDescendantIds(folders, folder.id)
    const doomedFiles = files.filter((file) =>
      doomedFolderIds.includes(file.folderId)
    )
    if (
      !window.confirm(
        `Delete "${folder.name}" and everything inside it (${doomedFiles.length} file(s))?`
      )
    ) {
      return
    }
    folderActionRef.current = true
    try {
      for (const file of doomedFiles) {
        await deleteFileRecord(file.id)
      }
      await Promise.all(
        doomedFolderIds.map((id) => client.models.Folder.delete({ id }))
      )
      if (doomedFolderIds.includes(currentFolderId)) {
        setCurrentFolderId(folder.parentFolderId ?? null)
      }
      loadDrive()
    } finally {
      folderActionRef.current = false
    }
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="app">
          <NavBar
            user={user}
            view={view}
            onNavigate={setView}
            signOut={signOut}
          />
          <main className="app-main">
            {view === 'profile' ? (
              <ProfilePage user={user} files={files} folders={folders} />
            ) : (
              <>
                <Breadcrumbs
                  folders={folders}
                  currentFolderId={currentFolderId}
                  onNavigate={setCurrentFolderId}
                />
                <NewFolderForm
                  parentFolderId={currentFolderId}
                  onCreated={loadDrive}
                />
                <UploadForm folderId={currentFolderId} onUploaded={loadDrive} />
                <FolderList
                  folders={visibleFolders}
                  onOpen={setCurrentFolderId}
                  onRename={handleRenameFolder}
                  onDelete={handleDeleteFolder}
                />
                <FileList
                  files={visibleFiles}
                  folderOptions={moveTargets}
                  loading={loading}
                  onChanged={loadDrive}
                />
              </>
            )}
          </main>
        </div>
      )}
    </Authenticator>
  )
}

export default App
