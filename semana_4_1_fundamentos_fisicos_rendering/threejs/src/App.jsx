/**
 * App.jsx
 *
 * Aplicación principal: Naturaleza Física de la Luz
 * Tema 1 — Fundamentos Físicos del Rendering
 *
 * Cuatro pestañas interactivas:
 * 1. Espectro Electromagnético — barra espectral con indicador
 * 2. Simulación de Onda EM — campos E y B perpendiculares animados
 * 3. Energía del Fotón — diagrama E = hν con barras por λ
 * 4. Dispersión (Prisma) — luz blanca → espectro a través de un prisma
 * 5. Modelo de Rayos — óptica geométrica aplicada a gráficos
 */

import { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls, Leva } from 'leva'

import ElectromagneticSpectrum from './components/ElectromagneticSpectrum'
import WaveSimulation from './components/WaveSimulation'
import EnergyDiagram from './components/EnergyDiagram'
import PrismDispersion from './components/PrismDispersion'
import RayModelScene from './components/RayModelScene'
import SphereReflection from './components/SphereReflection'

import './index.css'

const TABS = [
  { id: 'spectrum', label: 'Espectro EM' },
  { id: 'wave', label: 'Onda EM' },
  { id: 'energy', label: 'Energía (E=hν)' },
  { id: 'prism', label: 'Prisma' },
  { id: 'rays', label: 'Modelo de Rayos' },
  { id: 'sphere', label: 'Reflexión Esfera' },
]

const INFO = {
  spectrum: {
    title: 'Espectro Electromagnético',
    content: `La luz visible es una pequeña porción del espectro electromagnético, comprendida entre ~380 nm (violeta) y ~780 nm (rojo). 
    Más allá del violeta está la radiación ultravioleta (UV), los rayos X y los rayos gamma. Por debajo del rojo está el infrarrojo (IR), las microondas y las ondas de radio.
    En computación gráfica, nos enfocamos en el rango visible porque es lo que el ojo humano puede detectar. Los motores de rendering modelan la interacción de la luz con las superficies dentro de este rango.`,
    equation: 'c = λν   →   ν = c/λ',
  },
  wave: {
    title: 'Onda Electromagnética — Dualidad Onda-Partícula',
    content: `La luz se propaga como una onda electromagnética: un campo eléctrico (E) y un campo magnético (B) oscilan perpendicularmente entre sí y a la dirección de propagación.
    La longitud de onda (λ) determina el color. Longitudes de onda cortas (violeta, ~380 nm) tienen mayor frecuencia y energía. Longitudes de onda largas (rojo, ~780 nm) tienen menor frecuencia.
    En gráficos, usamos el modelo de rayos (óptica geométrica) porque λ << tamaño de objetos. Sin embargo, fenómenos como la difracción requieren óptica ondulatoria.`,
    equation: 'E = hν = hc/λ',
  },
  energy: {
    title: 'Energía del Fotón: E = hν',
    content: `Cada fotón transporta una cantidad discreta de energía proporcional a su frecuencia: E = hν, donde h es la constante de Planck (6.626×10⁻³⁴ J·s).
    Los fotones de luz violeta (~380 nm) tienen ~3.26 eV, mientras que los de luz roja (~780 nm) tienen ~1.59 eV.
    Esta cuantización de la energía es fundamental: explica el efecto fotoeléctrico y por qué los detectores de cámara tienen respuestas espectrales específicas.`,
    equation: 'E = hν = hc/λ   (h = 6.626×10⁻³⁴ J·s)',
  },
  prism: {
    title: 'Dispersión por un Prisma',
    content: `Cuando la luz blanca atraviesa un prisma, cada longitud de onda se refracta con un ángulo distinto según la ley de Snell: n₁ sin(θ₁) = n₂ sin(θ₂).
    El índice de refracción (n) depende de la longitud de onda (dispersión cromática): la luz violeta se refracta más que la roja.
    En gráficos, este fenómeno se simula en efectos como aberración cromática en lentes de cámara virtual y en rendering de diamantes y cristales.`,
    equation: 'n₁ sin(θ₁) = n₂ sin(θ₂)   |   n = n(λ)',
  },
  rays: {
    title: 'Modelo de Rayos en Gráficos por Computadora',
    content: `El modelo de rayos asume que la luz viaja en líneas rectas. Es válido cuando la longitud de onda es mucho menor que el tamaño de los objetos en la escena (λ << d).
    En el pipeline gráfico: ray casting, ray tracing y path tracing se basan en este modelo. Los rayos parten de la cámara (o de las fuentes de luz) y se trazan sus interacciones con las superficies.
    Limitaciones: no captura difracción, interferencia ni polarización, que requieren óptica ondulatoria o física.`,
    equation: 'Válido si λ << d (dimensión de objetos)',
  },
  sphere: {
    title: 'Reflexión de un Rayo sobre una Esfera — Vectores Interactivos',
    content: `Cuando un rayo de luz incide sobre una superficie, se refleja según la ley de reflexión: el ángulo de incidencia θᵢ es igual al ángulo de reflexión θᵣ, ambos medidos respecto a la normal N̂ de la superficie.
    La fórmula vectorial de reflexión es: R = I − 2(I · N̂) N̂, donde I es el vector incidente normalizado y N̂ es la normal unitaria.
    Para una esfera centrada en el origen, la normal en cualquier punto P es simplemente N̂ = P/|P|.
    Arrastra la fuente de luz para ver cómo cambian los vectores en tiempo real. Usa los sliders para mover el punto de impacto sobre la esfera.`,
    equation: 'R = I − 2(I · N̂) N̂   |   θᵢ = θᵣ',
  },
}

/**
 * Componente interno que usa Leva (debe estar dentro del Canvas context padre
 * o al mismo nivel que Leva).
 */
function Scene({ activeTab }) {
  const { wavelength } = useControls('Parámetros de Luz', {
    wavelength: { value: 550, min: 380, max: 780, step: 1, label: 'Longitud de onda (nm)' },
  })

  const cameraConfig = {
    spectrum: { position: [0, 0, 6], fov: 55 },
    wave: { position: [0, 0.5, 5], fov: 55 },
    energy: { position: [0, 0.5, 8], fov: 55 },
    prism: { position: [0, 0.5, 6], fov: 55 },
    rays: { position: [0, 1, 6], fov: 55 },
    sphere: { position: [3, 2, 4], fov: 50 },
  }

  const cam = cameraConfig[activeTab] || cameraConfig.spectrum

  return (
    <Canvas
      camera={{ position: cam.position, fov: cam.fov }}
      gl={{ antialias: true, toneMapping: 3 }}
    >
      <color attach="background" args={['#0a0a12']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />

      <Suspense fallback={null}>
        {activeTab === 'spectrum' && <ElectromagneticSpectrum wavelength={wavelength} />}
        {activeTab === 'wave' && <WaveSimulation wavelength={wavelength} />}
        {activeTab === 'energy' && <EnergyDiagram wavelength={wavelength} />}
        {activeTab === 'prism' && <PrismDispersion animate />}
        {activeTab === 'rays' && <RayModelScene />}
        {activeTab === 'sphere' && <SphereReflection />}
      </Suspense>

      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
    </Canvas>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('spectrum')
  const info = INFO[activeTab]

  return (
    <div className="app-wrapper">
      {/* Leva control panel */}
      <Leva collapsed={false} theme={{ sizes: { rootWidth: '280px' } }} />

      {/* Title */}
      <div className="title-overlay">
        <h1>Naturaleza Física de la Luz — Tema 1</h1>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3D Scene */}
      <Scene activeTab={activeTab} />

      {/* Info panel */}
      <div className="info-panel">
        <h3>{info.title}</h3>
        <p>{info.content}</p>
        {info.equation && (
          <p style={{ marginTop: 6 }}>
            <span className="equation">{info.equation}</span>
          </p>
        )}
      </div>
    </div>
  )
}
