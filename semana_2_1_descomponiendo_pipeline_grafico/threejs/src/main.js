// ═══════════════════════════════════════════════════════════════
// Tema 7 – Iluminación Clásica en Tiempo Real
// Comparación visual: Lambert · Phong · Blinn-Phong
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';

// Importar shaders como texto plano (Vite maneja ?raw)
import lambertVert  from './shaders/lambert.vert?raw';
import lambertFrag  from './shaders/lambert.frag?raw';
import phongVert    from './shaders/phong.vert?raw';
import phongFrag    from './shaders/phong.frag?raw';
import blinnVert    from './shaders/blinnphong.vert?raw';
import blinnFrag    from './shaders/blinnphong.frag?raw';

// ─── Renderer ────────────────────────────────────────────────
const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// ─── Scene & Camera ──────────────────────────────────────────
const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 7);

// ─── Orbit Controls ──────────────────────────────────────────
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

// ─── Parámetros globales (compartidos entre los tres modelos) ─
const params = {
  // Colores
  ambientColor:  '#111122',
  diffuseColor:  '#3366cc',
  specularColor: '#ffffff',
  lightColor:    '#ffffff',

  // Posición de la luz (esférica)
  lightRadius:   3.5,
  lightTheta:    0.6,   // ángulo azimutal (radianes)
  lightPhi:      0.9,   // ángulo polar (radianes)

  // Parámetros de material
  shininess:     32.0,

  // Animación
  animateLight:  true,
  lightSpeed:    0.4,

  // Visualizaciones extra
  showNormals:   false,
  showLightHelper: true,
};

// ─── Helper: convertir color hex → THREE.Color → array ───────
function hexToVec3(hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

// ─── Uniforms compartidos ─────────────────────────────────────
//     Se actualizan cada frame; los tres materiales los referencian.
const sharedUniforms = {
  uLightPos:      { value: new THREE.Vector3() },
  uLightColor:    { value: new THREE.Color(params.lightColor) },
  uAmbientColor:  { value: new THREE.Color(params.ambientColor) },
  uDiffuseColor:  { value: new THREE.Color(params.diffuseColor) },
  uSpecularColor: { value: new THREE.Color(params.specularColor) },
  uShininess:     { value: params.shininess },
};

// ─── Materiales con shaders personalizados ────────────────────
function makeShaderMaterial(vertSrc, fragSrc) {
  return new THREE.ShaderMaterial({
    vertexShader:   vertSrc,
    fragmentShader: fragSrc,
    uniforms: {
      // Cada material tiene sus propias instancias de uniform,
      // pero comparten los mismos valores (se sincronizan en el loop).
      uLightPos:      { value: new THREE.Vector3() },
      uLightColor:    { value: new THREE.Color() },
      uAmbientColor:  { value: new THREE.Color() },
      uDiffuseColor:  { value: new THREE.Color() },
      uSpecularColor: { value: new THREE.Color() },
      uShininess:     { value: 32 },
    },
  });
}

const matLambert  = makeShaderMaterial(lambertVert, lambertFrag);
const matPhong    = makeShaderMaterial(phongVert,   phongFrag);
const matBlinn    = makeShaderMaterial(blinnVert,   blinnFrag);

const materials = [matLambert, matPhong, matBlinn];

// ─── Geometría ────────────────────────────────────────────────
const sphereGeo = new THREE.SphereGeometry(1, 128, 64);

const SPACING = 2.8;

const meshLambert = new THREE.Mesh(sphereGeo, matLambert);
const meshPhong   = new THREE.Mesh(sphereGeo, matPhong);
const meshBlinn   = new THREE.Mesh(sphereGeo, matBlinn);

meshLambert.position.x = -SPACING;
meshPhong.position.x   =  0;
meshBlinn.position.x   =  SPACING;

scene.add(meshLambert, meshPhong, meshBlinn);

// ─── Piso de referencia ───────────────────────────────────────
const floorGeo = new THREE.PlaneGeometry(12, 8);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x111122,
  roughness: 0.9,
  metalness: 0.1,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.2;
scene.add(floor);

// Three.js light (solo para el piso con MeshStandard)
const threeLight = new THREE.PointLight(0xffffff, 15, 20);
scene.add(threeLight);
const threeAmbient = new THREE.AmbientLight(0x111122, 1);
scene.add(threeAmbient);

// ─── Visualizador de luz ──────────────────────────────────────
const lightSphereGeo = new THREE.SphereGeometry(0.12, 16, 8);
const lightSphereMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
const lightSphere    = new THREE.Mesh(lightSphereGeo, lightSphereMat);
scene.add(lightSphere);

// Línea de referencia desde la luz hasta el centro
const lineGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
]);
const lineMat = new THREE.LineBasicMaterial({ color: 0x666644, transparent: true, opacity: 0.5 });
const lightLine = new THREE.Line(lineGeo, lineMat);
scene.add(lightLine);

// ─── Normal helpers (instancia por esfera) ────────────────────
function makeNormalHelper(mesh, length = 0.25) {
  const helper = new THREE.VertexNormalsHelper(mesh, length, 0x44aaff);
  return helper;
}

let normalHelpers = [];

// ─── Posición de la luz en world space (esférica → cartesiana) ─
const lightWorldPos = new THREE.Vector3();

function updateLightPosition() {
  const { lightRadius: r, lightTheta: θ, lightPhi: φ } = params;
  lightWorldPos.set(
    r * Math.sin(φ) * Math.cos(θ),
    r * Math.cos(φ),
    r * Math.sin(φ) * Math.sin(θ),
  );
}

// ─── GUI ──────────────────────────────────────────────────────
const gui = new GUI({ title: 'Parámetros de Iluminación', width: 280 });

const folderLuz = gui.addFolder('Luz');
folderLuz.addColor(params, 'lightColor').name('Color luz').onChange(v => {
  sharedUniforms.uLightColor.value.set(v);
  threeLight.color.set(v);
});
folderLuz.add(params, 'lightRadius', 1, 7, 0.01).name('Radio');
folderLuz.add(params, 'lightTheta',  0, Math.PI * 2, 0.01).name('Ángulo θ (azimutal)');
folderLuz.add(params, 'lightPhi',    0.05, Math.PI * 0.95, 0.01).name('Ángulo φ (polar)');
folderLuz.add(params, 'animateLight').name('Animar luz');
folderLuz.add(params, 'lightSpeed',  0.05, 2, 0.05).name('Velocidad');
folderLuz.open();

const folderMat = gui.addFolder('Material');
folderMat.addColor(params, 'ambientColor').name('Ambiental k_a').onChange(v => {
  sharedUniforms.uAmbientColor.value.set(v);
});
folderMat.addColor(params, 'diffuseColor').name('Difuso k_d').onChange(v => {
  sharedUniforms.uDiffuseColor.value.set(v);
});
folderMat.addColor(params, 'specularColor').name('Especular k_s').onChange(v => {
  sharedUniforms.uSpecularColor.value.set(v);
});
folderMat.add(params, 'shininess', 1, 256, 1).name('Shininess n').onChange(v => {
  sharedUniforms.uShininess.value = v;
});
folderMat.open();

const folderVis = gui.addFolder('Visualización');
folderVis.add(params, 'showLightHelper').name('Mostrar luz').onChange(v => {
  lightSphere.visible = v;
  lightLine.visible   = v;
});
folderVis.add(params, 'showNormals').name('Mostrar normales').onChange(toggleNormals);

function toggleNormals(show) {
  // Limpiar helpers anteriores
  normalHelpers.forEach(h => { h.parent?.remove(h); h.dispose?.(); });
  normalHelpers = [];

  if (show) {
    [meshLambert, meshPhong, meshBlinn].forEach(m => {
      const h = makeNormalHelper(m, 0.18);
      scene.add(h);
      normalHelpers.push(h);
    });
  }
}

// ─── Sincronizar uniforms de los tres materiales ──────────────
//     uLightPos debe estar en VIEW SPACE (espacio de cámara).
const lightViewPos = new THREE.Vector3();

function syncUniforms() {
  // Convertir posición mundial de la luz a espacio de vista
  lightViewPos.copy(lightWorldPos).applyMatrix4(camera.matrixWorldInverse);

  for (const mat of materials) {
    const u = mat.uniforms;
    u.uLightPos.value.copy(lightViewPos);
    u.uLightColor.value.copy(sharedUniforms.uLightColor.value);
    u.uAmbientColor.value.copy(sharedUniforms.uAmbientColor.value);
    u.uDiffuseColor.value.copy(sharedUniforms.uDiffuseColor.value);
    u.uSpecularColor.value.copy(sharedUniforms.uSpecularColor.value);
    u.uShininess.value = sharedUniforms.uShininess.value;
  }
}

// ─── Línea de referencia (actualizar puntos cada frame) ───────
const linePositions = lineGeo.attributes.position;

function updateLightLine(target) {
  linePositions.setXYZ(0, lightWorldPos.x, lightWorldPos.y, lightWorldPos.z);
  linePositions.setXYZ(1, target.x, target.y, target.z);
  linePositions.needsUpdate = true;
  lineGeo.computeBoundingSphere();
}

// ─── Resize ───────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Loop de animación ────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  // Animar posición de la luz
  if (params.animateLight) {
    params.lightTheta = (params.lightTheta + params.lightSpeed * 0.008) % (Math.PI * 2);
    // Actualizar slider en GUI (lil-gui lo refleja automáticamente)
  }

  updateLightPosition();

  // Actualizar helper visual de la luz
  lightSphere.position.copy(lightWorldPos);
  threeLight.position.copy(lightWorldPos);
  updateLightLine(new THREE.Vector3(0, 0, 0)); // apunta al centro

  // Actualizar normales si están visibles
  normalHelpers.forEach(h => h.update?.());

  controls.update();
  camera.updateMatrixWorld();

  syncUniforms();

  renderer.render(scene, camera);
}

// ─── Inicialización ───────────────────────────────────────────

// Valores iniciales para uniforms compartidos
sharedUniforms.uLightColor.value.set(params.lightColor);
sharedUniforms.uAmbientColor.value.set(params.ambientColor);
sharedUniforms.uDiffuseColor.value.set(params.diffuseColor);
sharedUniforms.uSpecularColor.value.set(params.specularColor);
sharedUniforms.uShininess.value = params.shininess;

updateLightPosition();
animate();
