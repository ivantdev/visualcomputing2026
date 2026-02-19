// ─────────────────────────────────────────────────────────────
// Phong Fragment Shader
//
// Modelo de Phong (1975):
//   L = L_a + L_d + L_s
//
//   L_a = k_a * I_a
//   L_d = k_d * I * max(dot(N, L), 0)
//   L_s = k_s * I * max(dot(R, V), 0)^n
//
//   R = reflect(-L, N)   ← vector de reflexión perfecta
//   V = normalize(-vPosition)  ← dirección al ojo (cámara en origin en view space)
//   n = shininess (exponente especular)
//
// NOTA: El lóbulo especular decae como cos^n(α) donde α es el ángulo R-V.
// El problema es que dot(R,V) puede ser negativo (ángulos > 90°) → se clampea.
// ─────────────────────────────────────────────────────────────

precision highp float;

varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3  uLightPos;
uniform vec3  uLightColor;
uniform vec3  uAmbientColor;
uniform vec3  uDiffuseColor;
uniform vec3  uSpecularColor;
uniform float uShininess;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightPos - vPosition);
  // En espacio de vista, la cámara está en el origen → V apunta hacia el origen
  vec3 V = normalize(-vPosition);
  // Vector de reflexión de Phong: R = 2*(N·L)*N - L
  vec3 R = reflect(-L, N);

  // Ambiental
  vec3 ambient = uAmbientColor * uDiffuseColor;

  // Difusa (Lambert)
  float NdotL  = max(dot(N, L), 0.0);
  vec3  diffuse = uLightColor * uDiffuseColor * NdotL;

  // Especular de Phong
  float RdotV    = max(dot(R, V), 0.0);
  vec3  specular = uLightColor * uSpecularColor * pow(RdotV, uShininess);

  // Solo hay especular si la luz ilumina la cara
  specular *= step(0.0, NdotL);

  vec3 color = ambient + diffuse + specular;
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(color, 1.0);
}
