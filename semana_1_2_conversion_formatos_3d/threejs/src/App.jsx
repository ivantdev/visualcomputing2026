import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import {
  gatherStats,
  loadModelFromUrl,
  LoadedModel,
  DEFAULT_MODEL_NAME,
} from './components/FormatScene'

/* ─── Format metadata ──────────────────────────────────── */
const FORMATS = [
  {
    key: 'obj',
    label: '.OBJ',
    accept: '.obj',
    defaultExt: 'obj',
    desc: 'Wavefront — ASCII, no PBR, MTL for materials',
    color: '#f5a623',
    bg: 'linear-gradient(160deg, #0d0d12 0%, #1a1200 100%)',
  },
  {
    key: 'stl',
    label: '.STL',
    accept: '.stl',
    defaultExt: 'stl',
    desc: 'Stereolithography — triangle soups, flat shading',
    color: '#4fc3f7',
    bg: 'linear-gradient(160deg, #0d0d12 0%, #001a20 100%)',
  },
  {
    key: 'gltf',
    label: '.GLTF / .GLB',
    accept: '.gltf,.glb',
    defaultExt: 'glb',
    desc: 'GL Transmission Format — PBR materials, animations',
    color: '#a5d6a7',
    bg: 'linear-gradient(160deg, #0d0d12 0%, #001a05 100%)',
  },
]

const MODES = [
  { key: 'solid',     label: 'Solid' },
  { key: 'wireframe', label: 'Wireframe' },
  { key: 'points',    label: 'Points' },
  { key: 'combined',  label: 'Combined' },
]

/* ─── Single format panel ──────────────────────────────── */
function FormatPanel({ fmt, mode }) {
  const [model, setModel]     = useState(null)  // { object3D, name, isDefault }
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const fileRef = useRef()

  // Auto-load the default model (from /models/) on first mount
  useEffect(() => {
    const ext = fmt.defaultExt
    const url = `/models/${DEFAULT_MODEL_NAME}.${ext}`
    // For OBJ, also load the companion MTL that trimesh generated
    const mtlOptions = ext === 'obj'
      ? { mtlUrl: 'material.mtl', mtlBasePath: '/models/' }
      : {}
    setLoading(true)
    loadModelFromUrl(url, ext, mtlOptions)
      .then(object3D => {
        setStats(gatherStats(object3D))
        setModel({ object3D, name: `${DEFAULT_MODEL_NAME}.${fmt.defaultExt}`, isDefault: true })
      })
      .catch(e => {
        console.error('Default model load failed:', e)
        setError(`Could not load default model: ${e.message}`)
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadFile = useCallback(async file => {
    if (!file) return
    setLoading(true)
    setError(null)
    setModel(null)
    const ext = file.name.split('.').pop().toLowerCase()
    const url = URL.createObjectURL(file)
    try {
      const object3D = await loadModelFromUrl(url, ext)
      setStats(gatherStats(object3D))
      setModel({ object3D, name: file.name, isDefault: false })
    } catch (e) {
      console.error(e)
      setError(`Failed to load: ${e.message}`)
    } finally {
      setLoading(false)
      URL.revokeObjectURL(url)
    }
  }, [])

  const onFile = e => loadFile(e.target.files?.[0])

  return (
    <div className="panel" data-format={fmt.key}>
      {/* header */}
      <div className="panel-header">
        <span className="format-badge">{fmt.label}</span>
        <span className="format-desc">{fmt.desc}</span>
        <button className="load-btn" onClick={() => fileRef.current?.click()}>
          Load {fmt.label}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={fmt.accept}
          style={{ display: 'none' }}
          onChange={onFile}
        />
      </div>

      {/* 3D canvas */}
      <div className="canvas-wrap">
        {model && (
          <div className="filename-label" title={model.name}>
            {model.name}{model.isDefault ? ' (default)' : ''}
          </div>
        )}
        {loading && <div className="loading-overlay">Loading…</div>}
        {error   && <div className="error-overlay">{error}</div>}

        <Canvas
          camera={{ position: [4, 3, 6], fov: 45 }}
          shadows
          gl={{ antialias: true }}
          style={{ background: fmt.bg, width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.45} />
          <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-4, 4, -4]} intensity={0.35} />

          <Suspense fallback={null}>
            {model && <LoadedModel object3D={model.object3D} mode={mode} accentColor={fmt.color} />}
            <Environment preset="city" />
          </Suspense>

          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={0.5}
            maxDistance={50}
          />
          <gridHelper args={[20, 20, '#1a1a1a', '#111']} position={[0, -1.7, 0]} />
        </Canvas>
      </div>

      {/* stats bar */}
      {stats && (
        <div className="stats-bar">
          <div className="stat">
            <strong>{stats.vertices.toLocaleString()}</strong>
            <span>vertices</span>
          </div>
          <div className="stat">
            <strong>{stats.triangles.toLocaleString()}</strong>
            <span>triangles</span>
          </div>
          <div className="stat">
            <strong>{stats.edges.toLocaleString()}</strong>
            <span>edges</span>
          </div>
          <div className="stat">
            <strong>{stats.meshCount}</strong>
            <span>meshes</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── App root ─────────────────────────────────────────── */
export default function App() {
  const [mode, setMode] = useState('solid')

  return (
    <div className="app">
      {/* global header */}
      <header className="app-header">
        <h1>3D Format Comparison — OBJ · STL · GLTF/GLB</h1>
        <span className="header-hint">
          Drop any model into its format panel → compare geometry &amp; rendering
        </span>
        <div className="mode-group">
          {MODES.map(m => (
            <button
              key={m.key}
              className={`mode-btn ${mode === m.key ? 'active' : ''}`}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {/* three panels */}
      <div className="panels">
        {FORMATS.map(fmt => (
          <FormatPanel key={fmt.key} fmt={fmt} mode={mode} />
        ))}
      </div>
    </div>
  )
}
