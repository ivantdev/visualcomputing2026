import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Leva } from 'leva'
import HierarchyScene from './components/HierarchyScene'
import './index.css'

export default function App() {
  return (
    <div className="app-wrapper">
      {/* Leva control panel */}
      <Leva collapsed={false} theme={{ sizes: { rootWidth: '280px' } }} />

      {/* Title overlay */}
      <div className="title-overlay">
        <h1>Jerarquías y Transformaciones — Three Level Hierarchy</h1>
      </div>

      {/* Canvas */}
      <Canvas
        shadows
        camera={{ position: [4, 3, 6], fov: 55 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0f0f14']} />
        <HierarchyScene />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </Canvas>

      {/* Legend */}
      <div className="legend">
        <span>
          <span className="dot" style={{ background: '#74b9ff' }} />
          Parent (cube) – controlled by Leva sliders
        </span>
        <span>
          <span className="dot" style={{ background: '#fd79a8' }} />
          Children (spheres) – inherit parent transform
        </span>
        <span>
          <span className="dot" style={{ background: '#ff9f43' }} />
          Grandchildren (tori) – third level of hierarchy
        </span>
      </div>
    </div>
  )
}
