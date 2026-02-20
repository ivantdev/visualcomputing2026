import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import { Suspense, useState, useRef, useCallback } from 'react'
import ModelViewer from './components/ModelViewer'

const MODES = [
  { key: 'solid',     label: '🧱 Solid (Faces)' },
  { key: 'wireframe', label: '📐 Wireframe (Edges)' },
  { key: 'points',    label: '🔵 Points (Vertices)' },
  { key: 'combined',  label: '✨ Combined' },
]

const SUPPORTED = '.glb,.gltf,.stl,.obj'

export default function App() {
  const [mode, setMode]   = useState('solid')
  const [stats, setStats] = useState(null)
  // model: { url: string (blob), extension: string, name: string } | null
  const [model, setModel] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef()

  const loadFile = useCallback(file => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    // Revoke previous blob URL to free memory
    if (model?.url) URL.revokeObjectURL(model.url)
    setModel({ url: URL.createObjectURL(file), extension: ext, name: file.name })
    setStats(null)
    setMode('solid')
  }, [model])

  const onFileInput = e => loadFile(e.target.files?.[0])

  const onDrop = e => {
    e.preventDefault()
    setDragging(false)
    loadFile(e.dataTransfer.files?.[0])
  }

  return (
    <>
      {/* ── Drop-zone overlay (shown when no model is loaded) ── */}
      {!model && (
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''}`}
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-zone-inner">
            <span className="drop-icon">📦</span>
            <p>Drop a 3D model here</p>
            <p className="drop-hint">or click to browse</p>
            <p className="drop-hint">Supported: GLB · GLTF · STL · OBJ</p>
          </div>
        </div>
      )}

      {/* ── UI panel ── */}
      <div className="ui-panel">
        <h2>Visualization Mode</h2>
        <div className="btn-group">
          {MODES.map(m => (
            <button
              key={m.key}
              className={`btn ${mode === m.key ? 'active' : ''}`}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* File picker */}
        <button
          className="btn load-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          📂 Load Model
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED}
          style={{ display: 'none' }}
          onChange={onFileInput}
        />

        {model && (
          <div className="model-name" title={model.name}>
            {model.name}
          </div>
        )}

        {stats && (
          <div className="stats">
            <h3>Model Stats</h3>
            <div className="stats-item">
              <span>Vertices</span>
              <span>{stats.vertices.toLocaleString()}</span>
            </div>
            <div className="stats-item">
              <span>Triangles</span>
              <span>{stats.triangles.toLocaleString()}</span>
            </div>
            <div className="stats-item">
              <span>Edges</span>
              <span>{stats.edges.toLocaleString()}</span>
            </div>
            <div className="stats-item">
              <span>Sub-meshes</span>
              <span>{stats.meshes}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 3D Canvas ── */}
      <Canvas
        camera={{ position: [4, 3, 6], fov: 45 }}
        shadows
        gl={{ antialias: true }}
        style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)' }}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />

        <Suspense fallback={null}>
          {model && (
            <ModelViewer
              key={model.url}   /* remount on new file → clean state */
              url={model.url}
              extension={model.extension}
              mode={mode}
              onStats={setStats}
            />
          )}
          <Environment preset="city" />
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.5}
            scale={20}
            blur={2}
          />
        </Suspense>

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={0.5}
          maxDistance={50}
        />
        <gridHelper args={[20, 20, '#333', '#222']} position={[0, -0.01, 0]} />
      </Canvas>
    </>
  )
}
