import { Authenticator } from '@aws-amplify/ui-react'
import NavBar from './components/NavBar'
import UploadForm from './components/UploadForm'
import FileList from './components/FileList'
import './App.css'

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="app">
          <NavBar user={user} signOut={signOut} />
          <UploadForm />
          <FileList />
        </div>
      )}
    </Authenticator>
  )
}

export default App
