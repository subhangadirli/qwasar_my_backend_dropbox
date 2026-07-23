import { useCallback, useEffect, useState } from 'react'
import { Authenticator } from '@aws-amplify/ui-react'
import { client } from './dataClient'
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
      // File listing now comes from DynamoDB metadata, not a raw S3 listing.
      const { data } = await client.models.FileRecord.list()
      data.sort((a, b) => a.fileName.localeCompare(b.fileName))
      setFiles(data)
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
          <FileList files={files} loading={loading} onChanged={loadFiles} />
        </div>
      )}
    </Authenticator>
  )
}

export default App
