/**
 * RayModelScene.jsx
 *
 * Demostración del modelo de rayos utilizado en gráficos por computadora.
 * Muestra cómo se simplifican los rayos de luz para rendering:
 * - Rayos desde una fuente de luz
 * - Reflexión en superficies
 * - Cámara capturando rayos (ray casting)
 *
 * Ilustra los límites entre óptica geométrica y óptica física,
 * y por qué el modelo de rayos es válido para gráficos en tiempo real.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

export default function RayModelScene() {
  const raysRef = useRef([])
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta

    // Animar los rayos (pulso viajero)
    raysRef.current.forEach((mesh, i) => {
      if (mesh && mesh.material) {
        const phase = Math.sin(timeRef.current * 3 - i * 0.4) * 0.5 + 0.5
        mesh.material.opacity = 0.3 + phase * 0.5
      }
    })
  })

  // Posiciones clave
  const lightPos = [-3, 2.5, 0]
  const surfaceY = -0.5
  const cameraPos = [3, 2, 0]

  // Generar rayos desde la fuente de luz a la superficie
  const lightRays = useMemo(() => {
    const rays = []
    for (let i = 0; i < 7; i++) {
      const t = i / 6
      const hitX = -2 + t * 4
      rays.push({
        start: lightPos,
        end: [hitX, surfaceY, 0],
        color: '#ffee58',
      })
    }
    return rays
  }, [])

  // Rayos reflejados hacia la cámara
  const reflectedRays = useMemo(() => {
    const rays = []
    for (let i = 1; i < 6; i++) {
      const t = i / 6
      const hitX = -2 + t * 4
      rays.push({
        start: [hitX, surfaceY, 0],
        end: cameraPos,
        color: '#81d4fa',
      })
    }
    return rays
  }, [])

  const makeRayMesh = (ray, idx, ref) => {
    const start = new THREE.Vector3(...ray.start)
    const end = new THREE.Vector3(...ray.end)
    const mid = start.clone().add(end).multiplyScalar(0.5)
    const dir = end.clone().sub(start)
    const len = dir.length()
    const angle = Math.atan2(dir.y, dir.x)

    return (
      <mesh
        key={idx}
        ref={(el) => { if (ref) ref.current[idx] = el }}
        position={[mid.x, mid.y, mid.z]}
        rotation={[0, 0, angle]}
      >
        <boxGeometry args={[len, 0.02, 0.02]} />
        <meshBasicMaterial
          color={ray.color}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </mesh>
    )
  }

  return (
    <group>
      {/* Superficie difusa */}
      <mesh position={[0, surfaceY - 0.05, 0]}>
        <boxGeometry args={[6, 0.1, 2]} />
        <meshStandardMaterial color="#546e7a" roughness={0.8} />
      </mesh>

      {/* Fuente de luz (point light representada como esfera) */}
      <mesh position={lightPos}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#ffee58" toneMapped={false} />
      </mesh>
      <pointLight position={lightPos} intensity={2} color="#ffee58" />
      <Text position={[lightPos[0], lightPos[1] + 0.45, 0]} fontSize={0.2} color="#ffee58" anchorX="center">
        Fuente de luz
      </Text>

      {/* Cámara (representada como pirámide) */}
      <mesh position={cameraPos} rotation={[0, 0, Math.PI / 6]}>
        <coneGeometry args={[0.2, 0.4, 4]} />
        <meshStandardMaterial color="#81d4fa" />
      </mesh>
      <Text position={[cameraPos[0], cameraPos[1] + 0.5, 0]} fontSize={0.2} color="#81d4fa" anchorX="center">
        Cámara (ojo)
      </Text>

      {/* Rayos de luz → superficie */}
      {lightRays.map((ray, i) => makeRayMesh(ray, i, raysRef))}

      {/* Rayos reflejados → cámara */}
      {reflectedRays.map((ray, i) => makeRayMesh(ray, i + lightRays.length, raysRef))}

      {/* Normal de la superficie */}
      <mesh position={[0, surfaceY + 0.5, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1, 8]} />
        <meshBasicMaterial color="#a5d6a7" />
      </mesh>
      <mesh position={[0, surfaceY + 1.05, 0]}>
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshBasicMaterial color="#a5d6a7" />
      </mesh>
      <Text position={[0.35, surfaceY + 0.8, 0]} fontSize={0.15} color="#a5d6a7" anchorX="left">
        Normal (n̂)
      </Text>

      {/* Etiquetas explicativas */}
      <Text position={[-2.5, surfaceY + 1.5, 0]} fontSize={0.15} color="#ffee58" anchorX="center">
        Rayos incidentes
      </Text>
      <Text position={[2.0, surfaceY + 1.2, 0]} fontSize={0.15} color="#81d4fa" anchorX="center">
        Rayos reflejados
      </Text>

      {/* Etiqueta principal */}
      <Text position={[0, -1.6, 0]} fontSize={0.22} color="#90caf9" anchorX="center">
        Modelo de Rayos — Óptica Geométrica
      </Text>
      <Text position={[0, -2.0, 0]} fontSize={0.16} color="#888" anchorX="center">
        Válido cuando λ &lt;&lt; tamaño de los objetos
      </Text>

      {/* Ángulos θi y θr */}
      <Text position={[-0.55, surfaceY + 0.3, 0]} fontSize={0.14} color="#ffcc80" anchorX="center">
        θᵢ
      </Text>
      <Text position={[0.55, surfaceY + 0.3, 0]} fontSize={0.14} color="#ffcc80" anchorX="center">
        θᵣ
      </Text>

      <ambientLight intensity={0.3} />
    </group>
  )
}
