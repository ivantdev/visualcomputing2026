import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import TransformScene from './components/TransformScene'

/**
 * App – root component.
 * Sets up the Canvas with lighting, background, controls, and the main scene.
 */
export default function App() {
  return (
    <>
      {/* HUD overlay */}
      <div className="hud">
        <h2>Taller – Transformaciones Básicas</h2>
        <span>🔵 Cubo   – traslación senoidal (X/Y)</span><br />
        <span>🔴 Esfera – rotación continua</span><br />
        <span>🟢 Torus  – escala oscilante</span><br />
        <span style={{ color: '#636e72', fontSize: '0.75rem' }}>
          Arrastra para orbitar · scroll para zoom
        </span>
      </div>

      <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
        {/* Background stars */}
        <Stars radius={60} depth={30} count={3000} factor={3} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <pointLight position={[-4, 3, -4]} intensity={0.6} color="#a29bfe" />

        {/* Scene content */}
        <TransformScene />

        {/* Orbit controls – lets the user explore the scene */}
        <OrbitControls enablePan={false} />

        {/* Reference grid */}
        <gridHelper args={[12, 12, '#444466', '#222233']} />
      </Canvas>
    </>
  )
}
