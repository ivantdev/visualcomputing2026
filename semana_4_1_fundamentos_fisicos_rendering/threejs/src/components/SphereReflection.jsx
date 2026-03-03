/**
 * SphereReflection.jsx
 *
 * Escena interactiva: un rayo de luz impacta una esfera y se refleja.
 * El usuario puede:
 *   - Arrastrar la fuente de luz (esfera amarilla) con el mouse
 *   - Mover el punto de impacto sobre la esfera (azul)
 *   - Ver en tiempo real los vectores:
 *       • Rayo incidente  (I) — amarillo
 *       • Normal           (N) — verde
 *       • Rayo reflejado   (R) — cian
 *
 * Fórmula de reflexión:  R = I − 2(I · N̂) N̂
 *
 * También muestra los ángulos θᵢ y θᵣ y la descomposición matemática.
 */

import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'

/* ───── Helpers ───── */

/** Flecha 3D: cilindro + cono */
function Arrow({ from, to, color, label, labelOffset = [0, 0.3, 0], lineWidth = 0.025, headLen = 0.18 }) {
  const dir = useMemo(() => new THREE.Vector3().subVectors(to, from), [from, to])
  const len = useMemo(() => dir.length(), [dir])
  const midPoint = useMemo(() => new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5), [from, to])

  // Quaternion que alinea el eje Y local con `dir`
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return q
  }, [dir])

  if (len < 0.01) return null

  return (
    <group>
      {/* Tallo */}
      <mesh position={midPoint} quaternion={quaternion}>
        <cylinderGeometry args={[lineWidth, lineWidth, len - headLen, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Cabeza (cono) */}
      <mesh
        position={new THREE.Vector3().lerpVectors(from, to, 1 - headLen / (2 * len))}
        quaternion={quaternion}
      >
        <coneGeometry args={[lineWidth * 2.8, headLen, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Etiqueta */}
      {label && (
        <Text
          position={[midPoint.x + labelOffset[0], midPoint.y + labelOffset[1], midPoint.z + labelOffset[2]]}
          fontSize={0.22}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  )
}

/** Arco para visualizar ángulo entre dos vectores respecto a la normal */
function AngleArc({ origin, v1, v2, radius = 0.6, color = '#ffcc80', segments = 32 }) {
  const points = useMemo(() => {
    const a = v1.clone().normalize()
    const b = v2.clone().normalize()
    const angle = a.angleTo(b)
    if (angle < 0.01) return []

    const pts = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      // Slerp between a and b
      const q1 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a)
      const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b)
      const q = new THREE.Quaternion().slerpQuaternions(q1, q2, t)
      const p = new THREE.Vector3(0, 1, 0).applyQuaternion(q).multiplyScalar(radius).add(origin)
      pts.push(p)
    }
    return pts
  }, [origin, v1, v2, radius, segments])

  if (points.length < 2) return null

  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(points.length * 3)
    points.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    })
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [points])

  return (
    <line geometry={lineGeo}>
      <lineBasicMaterial color={color} linewidth={1} />
    </line>
  )
}

/** Esfera draggable */
function DraggableSphere({ position, onDrag, color = '#ffee58', size = 0.15, label }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const { camera, gl, raycaster } = useThree()
  const plane = useRef(new THREE.Plane())
  const intersection = useRef(new THREE.Vector3())

  const handlePointerDown = useCallback((e) => {
    e.stopPropagation()
    setDragging(true)
    gl.domElement.style.cursor = 'grabbing'

    // Crear un plano perpendicular a la cámara que pase por la posición actual
    const camDir = new THREE.Vector3()
    camera.getWorldDirection(camDir)
    plane.current.setFromNormalAndCoplanarPoint(camDir, new THREE.Vector3(...position))
  }, [camera, gl, position])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
    gl.domElement.style.cursor = hovered ? 'grab' : 'auto'
  }, [gl, hovered])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging) return
      // Calcular ray desde el puntero
      const rect = gl.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(mouse, camera)
      if (raycaster.ray.intersectPlane(plane.current, intersection.current)) {
        onDrag([intersection.current.x, intersection.current.y, intersection.current.z])
      }
    }

    const onUp = () => {
      setDragging(false)
      gl.domElement.style.cursor = 'auto'
    }

    gl.domElement.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      gl.domElement.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, camera, gl, raycaster, onDrag])

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOver={() => { setHovered(true); gl.domElement.style.cursor = 'grab' }}
        onPointerOut={() => { setHovered(false); if (!dragging) gl.domElement.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[size * (hovered ? 1.25 : 1), 24, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {label && (
        <Text position={[position[0], position[1] + size + 0.25, position[2]]} fontSize={0.18} color={color} anchorX="center">
          {label}
        </Text>
      )}
    </group>
  )
}

/* ───── Componente principal ───── */

const SPHERE_RADIUS = 1.2
const SPHERE_CENTER = new THREE.Vector3(0, 0, 0)

export default function SphereReflection() {
  const [lightPos, setLightPos] = useState([-2.8, 2.0, 1.0])

  // Controls para ajustar el ángulo de impacto sobre la esfera
  const { hitAngle, hitPhi, showComponents } = useControls('Reflexión en Esfera', {
    hitAngle: { value: 55, min: 5, max: 85, step: 1, label: 'θ elevación (°)' },
    hitPhi: { value: 30, min: -180, max: 180, step: 1, label: 'φ azimut (°)' },
    showComponents: { value: true, label: 'Mostrar componentes' },
  })

  // Calcular punto de impacto sobre la esfera a partir de ángulos esféricos
  const hitPoint = useMemo(() => {
    const theta = THREE.MathUtils.degToRad(hitAngle)
    const phi = THREE.MathUtils.degToRad(hitPhi)
    return new THREE.Vector3(
      SPHERE_RADIUS * Math.sin(theta) * Math.cos(phi),
      SPHERE_RADIUS * Math.cos(theta),
      SPHERE_RADIUS * Math.sin(theta) * Math.sin(phi),
    )
  }, [hitAngle, hitPhi])

  // Normal en el punto de impacto (para una esfera centrada en el origen = punto normalizado)
  const normal = useMemo(() => hitPoint.clone().normalize(), [hitPoint])

  // Vector incidente I (desde luz hacia punto de impacto)
  const lightVec3 = useMemo(() => new THREE.Vector3(...lightPos), [lightPos])
  const incidentDir = useMemo(() => {
    return hitPoint.clone().sub(lightVec3).normalize()
  }, [hitPoint, lightVec3])

  // Rayo reflejado:  R = I − 2(I · N̂) N̂
  const reflectedDir = useMemo(() => {
    const dot = incidentDir.dot(normal)
    return incidentDir.clone().sub(normal.clone().multiplyScalar(2 * dot)).normalize()
  }, [incidentDir, normal])

  // Ángulo de incidencia (entre -I y N)
  const incidentAngle = useMemo(() => {
    const negI = incidentDir.clone().negate()
    return THREE.MathUtils.radToDeg(negI.angleTo(normal))
  }, [incidentDir, normal])

  // Puntos finales de los vectores para dibujar flechas
  const ARROW_LEN = 2.0
  const normalEnd = useMemo(() => hitPoint.clone().add(normal.clone().multiplyScalar(ARROW_LEN)), [hitPoint, normal])
  const reflectedEnd = useMemo(() => hitPoint.clone().add(reflectedDir.clone().multiplyScalar(ARROW_LEN)), [hitPoint, reflectedDir])

  // Componentes de I: tangencial y normal
  const iDotN = useMemo(() => incidentDir.dot(normal), [incidentDir, normal])
  const incidentNormal = useMemo(() => normal.clone().multiplyScalar(iDotN), [normal, iDotN])
  const incidentTangent = useMemo(() => incidentDir.clone().sub(incidentNormal), [incidentDir, incidentNormal])

  // Pulso animado para los rayos
  const pulseRef = useRef(0)
  useFrame((_, delta) => {
    pulseRef.current += delta
  })

  return (
    <group>
      {/* ── Esfera principal ── */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
        <meshPhysicalMaterial
          color="#37474f"
          metalness={0.3}
          roughness={0.4}
          transparent
          opacity={0.65}
          side={THREE.FrontSide}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[SPHERE_RADIUS * 1.002, 32, 32]} />
        <meshBasicMaterial color="#546e7a" wireframe transparent opacity={0.15} />
      </mesh>

      {/* ── Punto de impacto (marca) ── */}
      <mesh position={hitPoint}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      {/* ── Fuente de luz (draggable) ── */}
      <DraggableSphere
        position={lightPos}
        onDrag={setLightPos}
        color="#ffee58"
        size={0.18}
        label="Fuente de luz (arrastra)"
      />
      <pointLight position={lightPos} intensity={3} color="#ffee58" distance={10} />

      {/* ── Rayo incidente (desde luz al punto de impacto) ── */}
      <Arrow
        from={lightVec3}
        to={hitPoint}
        color="#ffee58"
        label="I (incidente)"
        labelOffset={[0, 0.35, 0]}
      />

      {/* ── Normal N̂ ── */}
      <Arrow
        from={hitPoint}
        to={normalEnd}
        color="#66bb6a"
        label="N̂ (normal)"
        labelOffset={[0.3, 0.2, 0]}
      />

      {/* ── Rayo reflejado R ── */}
      <Arrow
        from={hitPoint}
        to={reflectedEnd}
        color="#4fc3f7"
        label="R (reflejado)"
        labelOffset={[0, 0.35, 0]}
      />

      {/* ── Arcos de ángulo ── */}
      <AngleArc
        origin={hitPoint}
        v1={incidentDir.clone().negate()}
        v2={normal}
        radius={0.5}
        color="#ffcc80"
      />
      <AngleArc
        origin={hitPoint}
        v1={normal}
        v2={reflectedDir}
        radius={0.55}
        color="#80deea"
      />

      {/* ── Etiquetas de ángulo ── */}
      {(() => {
        const negI = incidentDir.clone().negate().normalize()
        const bisector1 = negI.clone().add(normal).normalize()
        const angleLabelPos1 = hitPoint.clone().add(bisector1.multiplyScalar(0.8))
        const bisector2 = normal.clone().add(reflectedDir.clone().normalize()).normalize()
        const angleLabelPos2 = hitPoint.clone().add(bisector2.multiplyScalar(0.9))
        return (
          <>
            <Text position={angleLabelPos1} fontSize={0.18} color="#ffcc80" anchorX="center">
              {`θᵢ = ${incidentAngle.toFixed(1)}°`}
            </Text>
            <Text position={angleLabelPos2} fontSize={0.18} color="#80deea" anchorX="center">
              {`θᵣ = ${incidentAngle.toFixed(1)}°`}
            </Text>
          </>
        )
      })()}

      {/* ── Componentes de descomposición del vector I ── */}
      {showComponents && (
        <group>
          {/* Componente normal de I */}
          <Arrow
            from={hitPoint}
            to={hitPoint.clone().add(incidentNormal.clone().multiplyScalar(ARROW_LEN * 0.7))}
            color="#ff8a65"
            label="I_n"
            labelOffset={[0.3, -0.15, 0]}
            lineWidth={0.015}
            headLen={0.12}
          />
          {/* Componente tangencial de I */}
          <Arrow
            from={hitPoint}
            to={hitPoint.clone().add(incidentTangent.clone().multiplyScalar(ARROW_LEN * 0.7))}
            color="#ce93d8"
            label="I_t"
            labelOffset={[-0.3, 0.15, 0]}
            lineWidth={0.015}
            headLen={0.12}
          />
        </group>
      )}

      {/* ── Ecuación principal ── */}
      <Text position={[0, -2.3, 0]} fontSize={0.24} color="#90caf9" anchorX="center">
        R = I − 2(I · N̂) N̂
      </Text>
      <Text position={[0, -2.7, 0]} fontSize={0.17} color="#888" anchorX="center">
        {`I · N̂ = ${iDotN.toFixed(3)}   |   θᵢ = θᵣ = ${incidentAngle.toFixed(1)}°`}
      </Text>

      {/* ── Plano base (grid reference) ── */}
      <gridHelper args={[8, 16, '#333', '#222']} position={[0, -SPHERE_RADIUS - 0.01, 0]} />

      {/* ── Iluminación de ambiente ── */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 3]} intensity={0.5} />
    </group>
  )
}
