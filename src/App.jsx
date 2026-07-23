import NavBar from './components/NavBar'
import UploadForm from './components/UploadForm'
import FileList from './components/FileList'
import './App.css'

function App() {
  return (
    <div className="app">
      <NavBar />
      <UploadForm />
      <FileList />
    </div>
  )
}

export default App
