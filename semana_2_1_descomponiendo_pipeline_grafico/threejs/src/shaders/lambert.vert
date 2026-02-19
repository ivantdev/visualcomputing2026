// ─────────────────────────────────────────────────────────────
// Lambert Vertex Shader
// Calcula la normal en espacio de vista y la pasa al fragmento.
// También propaga la posición del vértice (en vista) para calcular
// la dirección de luz por fragmento.
// ─────────────────────────────────────────────────────────────

varying vec3 vNormal;      // Normal en espacio de vista
varying vec3 vPosition;    // Posición en espacio de vista

void main() {
  // normalMatrix = transpose(inverse(modelViewMatrix))
  // Necesario para transformar normales correctamente cuando hay escala no uniforme
  vNormal   = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
