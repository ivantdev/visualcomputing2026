import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// ─── Animated Cube – sinusoidal translation ──────────────────────────────────
/**
 * The cube follows a Lissajous-like path driven by sin/cos of elapsed time.
 * Its position is:
 *   x = A · sin(ω · t)
 *   y = B · sin(2ω · t)           ← figure-eight vertical pattern
 *   z = 0
 * No scale change here – kept pure for translation demonstration.
 */
function AnimatedCube() {
  const ref = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const A = 2.5       // amplitude X
    const B = 1.2       // amplitude Y
    const omega = 0.7   // angular frequency

    ref.current.position.x = A * Math.sin(omega * t)
    ref.current.position.y = B * Math.sin(2 * omega * t)
    // Slow self-rotation so the cube doesn't look frozen
    ref.current.rotation.y += 0.01
  })

  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.9, 0.9, 0.9]} />
      <meshStandardMaterial
        color="#74b9ff"
        metalness={0.4}
        roughness={0.3}
        emissive="#1e3a5f"
      />
    </mesh>
  )
}

// ─── Animated Sphere – continuous rotation ───────────────────────────────────
/**
 * Placed at x = -3 so it stays clearly separated from the cube.
 * Rotates around Y and X axes at different speeds – demonstrates pure rotation.
 * Added wireframe overlay and rotation axis to visualize the transformation.
 */
function AnimatedSphere() {
  const ref = useRef()
  const axisRef = useRef()

  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 1.4
    ref.current.rotation.x += dt * 0.6
    // Rotate the axis indicator with the sphere
    axisRef.current.rotation.copy(ref.current.rotation)
  })

  return (
    // Outer group fixes the "home" position; inner mesh receives the rotation
    <group position={[-3, 0, 0]}>
      {/* Main sphere */}
      <mesh ref={ref}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial
          color="#ff7675"
          metalness={0.5}
          roughness={0.2}
          emissive="#4a0000"
        />
      </mesh>
      
      {/* Wireframe overlay to show rotation */}
      <mesh ref={axisRef}>
        <sphereGeometry args={[0.72, 12, 8]} />
        <meshBasicMaterial
          color="#ffffff"
          wireframe={true}
          opacity={0.3}
          transparent={true}
        />
      </mesh>
      
      {/* Rotation axis indicator - vertical line */}
      <mesh ref={axisRef}>
        <cylinderGeometry args={[0.02, 0.02, 1.8]} />
        <meshBasicMaterial color="#ffffff" opacity={0.6} transparent={true} />
      </mesh>
      
      {/* Small marker sphere to show rotation */}
      <group ref={axisRef}>
        <mesh position={[0.6, 0.3, 0]}>
          <sphereGeometry args={[0.08]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    </group>
  )
}

// ─── Animated Torus – oscillating scale ──────────────────────────────────────
/**
 * Scale is driven by: s(t) = baseScale + amplitude · sin(freq · t)
 * This creates a smooth "breathing" / pulsating effect.
 * Placed at x = +3.
 */
function AnimatedTorus() {
  const ref = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const baseScale = 1
    const amplitude = 0.45
    const freq = 1.8

    const s = baseScale + amplitude * Math.sin(freq * t)
    ref.current.scale.set(s, s, s)

    // Slow rotation to show 3-D shape
    ref.current.rotation.x += 0.008
    ref.current.rotation.z += 0.005
  })

  return (
    <group position={[3, 0, 0]}>
      <mesh ref={ref}>
        <torusGeometry args={[0.6, 0.22, 20, 48]} />
        <meshStandardMaterial
          color="#55efc4"
          metalness={0.35}
          roughness={0.25}
          emissive="#004d3a"
        />
      </mesh>
    </group>
  )
}

// ─── Scene root ───────────────────────────────────────────────────────────────
/**
 * TransformScene composes the three animated objects.
 * Each object demonstrates one primary transformation:
 *   1. AnimatedCube   → TRANSLATION  (sinusoidal path)
 *   2. AnimatedSphere → ROTATION     (continuous spin)
 *   3. AnimatedTorus  → SCALE        (breathing effect)
 */
export default function TransformScene() {
  return (
    <group>
      <AnimatedCube />
      <AnimatedSphere />
      <AnimatedTorus />
    </group>
  )
}
