import { useCallback, useEffect, useState } from 'react'
import { Authenticator } from '@aws-amplify/ui-react'
import { list } from 'aws-amplify/storage'
import NavBar from './components/NavBar'
import UploadForm from './components/UploadForm'
import FileList from './components/FileList'
import './App.css'

function App() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const { items } = await list({
        path: ({ identityId }) => `files/${identityId}/`,
      })
      // Drop the folder placeholder that S3 can return for the prefix itself.
      setFiles(items.filter((item) => !item.path.endsWith('/')))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="app">
          <NavBar user={user} signOut={signOut} />
          <UploadForm onUploaded={loadFiles} />
          <FileList files={files} loading={loading} />
        </div>
      )}
    </Authenticator>
  )
}

export default App
