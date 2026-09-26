import {
  FileCode2,
  FileText,
  Folder,
  Image,
} from 'lucide-react'

function Files() {
  return (
    <div className="page-content">
      <div className="page-heading">
        <span>JARVIS FILE ACCESS</span>
        <h1>Files</h1>
        <p>Browse files Jarvis can access and work with.</p>
      </div>

      <div className="file-browser">
        <div className="file-browser-header">
          <span>Name</span>
          <span>Type</span>
          <span>Modified</span>
        </div>

        <div className="file-row">
          <Folder size={20} />
          <strong>Projects</strong>
          <span>Folder</span>
          <small>Today</small>
        </div>

        <div className="file-row">
          <FileCode2 size={20} />
          <strong>jarvis.py</strong>
          <span>Python</span>
          <small>Today</small>
        </div>

        <div className="file-row">
          <FileText size={20} />
          <strong>notes.txt</strong>
          <span>Text</span>
          <small>Yesterday</small>
        </div>

        <div className="file-row">
          <Image size={20} />
          <strong>interface-concept.png</strong>
          <span>Image</span>
          <small>Sep 24</small>
        </div>
      </div>
    </div>
  )
}

export default Files