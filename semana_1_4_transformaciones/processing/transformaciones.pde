/**
 * Taller – Transformaciones Básicas (Processing 3D)
 * ──────────────────────────────────────────────────
 * Demuestra translate(), rotate() y scale() sobre una figura 3D,
 * usando pushMatrix() / popMatrix() para aislar cada transformación.
 *
 * Parámetros de animación:
 *   - t  = millis() / 1000.0   (tiempo en segundos)
 *   - Traslación: trayectoria senoidal en X e Y
 *   - Rotación   : giro continuo acumulado por frameCount
 *   - Escala     : función sin() para efecto "respiración"
 */

float t;          // tiempo en segundos
float angle;      // ángulo acumulado de rotación

void setup() {
  size(800, 600, P3D);
  colorMode(HSB, 360, 100, 100, 100);
  frameRate(60);
  smooth(8);
}

void draw() {
  // ── Tiempo ─────────────────────────────────────────────────────────────────
  t     = millis() / 1000.0;
  angle = frameCount * 0.02;   // incremento constante por frame

  // ── Fondo degradado ────────────────────────────────────────────────────────
  background(240, 40, 12);

  // ── Iluminación básica ─────────────────────────────────────────────────────
  lights();
  directionalLight(0, 0, 100, -1, -0.5, -1);
  ambientLight(200, 20, 30);

  // Colocar cámara en el centro de la pantalla
  translate(width / 2.0, height / 2.0, 0);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. TRASLACIÓN – cubo azul con trayectoria senoidal
  // ══════════════════════════════════════════════════════════════════════════
  pushMatrix();
    float tx = 220 * sin(t * 0.8);           // amplitud 220 px en X
    float ty = 100 * sin(t * 1.6);           // amplitud 100 px en Y (armonico)
    translate(tx, ty, 0);

    // Pequeña rotación extra para que no se vea plano
    rotateY(angle * 0.5);
    rotateX(angle * 0.3);

    fill(210, 80, 95, 90);
    noStroke();
    box(70);

    // Etiqueta (2D overlay)
    fill(0, 0, 100);
    textSize(11);
    textAlign(CENTER);
    text("TRASLACIÓN", 0, 55);
  popMatrix();

  // ══════════════════════════════════════════════════════════════════════════
  // 2. ROTACIÓN – esfera roja centrada
  // ══════════════════════════════════════════════════════════════════════════
  pushMatrix();
    // La esfera no se traslada; solo gira en los tres ejes
    rotateX(angle * 0.7);
    rotateY(angle * 1.1);
    rotateZ(angle * 0.4);

    fill(0, 85, 95, 90);
    noStroke();
    sphere(55);

    // Eje de rotación visual
    stroke(60, 50, 100, 60);
    strokeWeight(1.5);
    line(0, -90, 0, 0, 90, 0);   // eje Y
    noStroke();

    fill(0, 0, 100);
    textSize(11);
    textAlign(CENTER);
    text("ROTACIÓN", 0, 75);
  popMatrix();

  // ══════════════════════════════════════════════════════════════════════════
  // 3. ESCALA – toro verde a la derecha
  // ══════════════════════════════════════════════════════════════════════════
  pushMatrix();
    translate(0, 150, 0);          // separar verticalmente hacia abajo

    float s = 0.6 + 0.4 * sin(t * 2.0);   // oscila entre 0.2 y 1.0
    scale(s, s, s);

    // Lenta rotación para mostrar la forma 3D
    rotateX(angle * 0.6);
    rotateY(angle * 0.9);

    // Dibujar toro manualmente como anillo de esferas pequeñas
    int numSpheres = 24;
    float R = 80;   // radio mayor
    float r = 18;   // radio del tubo
    for (int i = 0; i < numSpheres; i++) {
      float theta = TWO_PI * i / numSpheres;
      pushMatrix();
        translate(R * cos(theta), R * sin(theta), 0);
        fill(map(i, 0, numSpheres, 120, 160), 75, 90, 88);
        noStroke();
        sphere(r);
      popMatrix();
    }

    fill(0, 0, 100);
    textSize(11);
    textAlign(CENTER);
    text("ESCALA  s=" + nf(s, 1, 2), 0, 115);
  popMatrix();

  // ══════════════════════════════════════════════════════════════════════════
  // HUD – información general
  // ══════════════════════════════════════════════════════════════════════════
  camera();   // volver a cámara ortogonal para el HUD 2D
  hint(DISABLE_DEPTH_TEST);

  fill(0, 0, 100, 80);
  textAlign(LEFT);
  textSize(13);
  text("Taller – Transformaciones Básicas", 14, 22);
  textSize(10);
  fill(0, 0, 75, 70);
  text("t = " + nf(t, 2, 2) + " s    frame = " + frameCount, 14, 40);
  text("FPS: " + nf(frameRate, 2, 1), 14, 54);

  hint(ENABLE_DEPTH_TEST);
}
