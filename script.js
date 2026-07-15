// Experiencia WebGL 3D Optimizada para Google Sites
// Desarrollado con Three.js y GSAP

let scene, camera, renderer;
let imageMesh;
let particleSystem, sparkSystem;
let ambientLight, pointLight, directionLight;
let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

const container = document.getElementById('canvas-container');

// Configuración de visualización y balanceo continuo (Física de respiración)
let clock = new THREE.Clock();

function init() {
  // 1. Creación de la Escena 3D
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030205, 0.015); // Niebla suave de fondo

  // 2. Cámara con profundidad de campo y perspectiva dinámica
  const fov = window.innerWidth < 768 ? 60 : 45;
  camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 6;

  // 3. Renderer optimizado (WebGL 2 con Antialias activo)
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limitar a 2 para evitar lag en pantallas 4K
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);

  // 4. Iluminación Dinámica (Efecto NVIDIA RTX / Neon Glow)
  ambientLight = new THREE.AmbientLight(0x0a0515, 1.5);
  scene.add(ambientLight);

  // Luz puntual móvil (Cian) reactiva al mouse
  pointLight = new THREE.PointLight(0x00f2fe, 5, 15);
  pointLight.position.set(0, 0, 2);
  scene.add(pointLight);

  // Luz de contra-silueta (Magenta) para realzar bordes
  const backLight = new THREE.DirectionalLight(0xff007f, 3);
  backLight.position.set(2, 4, -3);
  scene.add(backLight);

  // 5. Cargar textura y aplicar Mesh con Shader de Ondas y Pop-Out
  const textureLoader = new THREE.TextureLoader();
  
  // Ruta relativa exacta según estructura especificada
  textureLoader.load('jinnn.avif', (texture) => {
    // Configuración para evitar pixelado en renderizados de cerca
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    // Obtener dimensiones reales para escalado fluido responsivo
    const imgAspect = texture.image.width / texture.image.height;
    let width = 2.4;
    let height = width / imgAspect;

    if(window.innerWidth < 768) {
       width = 1.6;
       height = width / imgAspect;
    }

    const geometry = new THREE.PlaneGeometry(width, height, 32, 32);

    // Material personalizado interactivo (Efecto brillo y distorsión de poder)
    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      transparent: true,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false // Evita fallos de transparencia con el sistema de partículas
    });

    imageMesh = new THREE.Mesh(geometry, material);
    imageMesh.position.set(0, -0.2, 0.5); // Posicionado hacia adelante en Z (Pop-Out)
    imageMesh.castShadow = true;
    imageMesh.receiveShadow = true;
    scene.add(imageMesh);

    // Animación de entrada fluida con GSAP
    gsap.from(imageMesh.position, {
      z: -2,
      duration: 1.8,
      ease: "power3.out"
    });

    gsap.from(".main-title, .sub-title", {
      opacity: 0,
      y: 30,
      duration: 1.5,
      stagger: 0.2,
      ease: "power3.out"
    });
  }, undefined, (err) => {
     console.error("Error cargando la imagen. Asegúrate de colocar tu imagen PNG en la ruta: images/mi-imagen.png");
  });

  // 6. Generador de Partículas de Poder Oscuro / Chispas
  createParticles();
  createSparks();

  // 7. Oyentes de Eventos (Responsividad e Interacción)
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('click', launchShockwave);

  animate();
}

// Generador de Neblina de partículas en el fondo
function createParticles() {
  const particleCount = window.innerWidth < 768 ? 60 : 150;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const color1 = new THREE.Color(0x00f2fe); // Cian
  const color2 = new THREE.Color(0xff007f); // Magenta

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 10;
    positions[i + 1] = (Math.random() - 0.5) * 6;
    positions[i + 2] = (Math.random() - 0.5) * 4;

    const mixedColor = color1.clone().lerp(color2, Math.random());
    colors[i] = mixedColor.r;
    colors[i + 1] = mixedColor.g;
    colors[i + 2] = mixedColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Textura circular difuminada vía código para evitar descargas extras
  const pTexture = createCircleTexture();

  const material = new THREE.PointsMaterial({
    size: 0.08,
    map: pTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);
}

// Generador de Chispas reactivas al mouse
function createSparks() {
  const sparkCount = 40;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(sparkCount * 3);
  
  for (let i = 0; i < sparkCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 3;
    positions[i + 1] = (Math.random() - 0.5) * 3;
    positions[i + 2] = (Math.random() - 0.5) * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: 0.04,
    color: 0xffaa00, // Chispas ámbar estilo cortocircuito
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  sparkSystem = new THREE.Points(geometry, material);
  scene.add(sparkSystem);
}

// Genera una textura redonda difuminada dinámicamente en canvas 2D
function createCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 16);
  return new THREE.CanvasTexture(canvas);
}

// Captura de coordenadas del mouse
function onMouseMove(event) {
  mouse.targetX = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.targetY = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onTouchMove(event) {
  if (event.touches.length > 0) {
    mouse.targetX = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
}

// Onda de choque/energía al dar Click
function launchShockwave() {
  if (imageMesh) {
    // Escalar e iluminar al dar click
    gsap.to(imageMesh.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.1, yoyo: true, repeat: 1 });
    gsap.to(pointLight, { intensity: 15, distance: 20, duration: 0.15, yoyo: true, repeat: 1 });
    
    // Crear un micro estallido de chispas en la zona central
    const positions = sparkSystem.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 0.5;
      positions[i + 1] = (Math.random() - 0.5) * 0.5;
    }
    sparkSystem.geometry.attributes.position.needsUpdate = true;
  }
}

// Ajuste responsivo al redimensionar pantalla o iframe
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = window.innerWidth < 768 ? 60 : 45;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Bucle de renderizado (60 FPS estables con inercia)
function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  // Suavizado del movimiento del cursor (Interpolación lineal / Lerp)
  mouse.x += (mouse.targetX - mouse.x) * 0.08;
  mouse.y += (mouse.targetY - mouse.y) * 0.08;

  // Rotación suave del escenario (Parallax)
  scene.rotation.y = mouse.x * 0.25;
  scene.rotation.x = -mouse.y * 0.15;

  // Luz dinámica persigue al puntero
  pointLight.position.x = mouse.x * 3;
  pointLight.position.y = mouse.y * 2;

  // Animación del personaje (Respiración continua + seguimiento 3D)
  if (imageMesh) {
    // Oscilación y flotación sutil senoidal
    imageMesh.position.y = -0.2 + Math.sin(elapsedTime * 1.5) * 0.06;
    imageMesh.position.x = Math.cos(elapsedTime * 0.8) * 0.03;
    
    // El personaje gira levemente hacia el puntero
    imageMesh.rotation.y = mouse.x * 0.15;
    imageMesh.rotation.z = mouse.x * 0.05;
  }

  // Animación lenta de las partículas de fondo
  if (particleSystem) {
    particleSystem.rotation.y = elapsedTime * 0.02;
    particleSystem.rotation.x = elapsedTime * 0.01;
  }

  // Chispas flotan de manera caótica hacia arriba
  if (sparkSystem) {
    const positions = sparkSystem.geometry.attributes.position.array;
    for (let i = 1; i < positions.length; i += 3) {
      positions[i] += 0.005 + Math.sin(elapsedTime + i) * 0.002; // Sube
      if (positions[i] > 2) {
        positions[i] = -2; // Reiniciar abajo
        positions[i - 1] = (Math.random() - 0.5) * 3; // Posición X aleatoria
      }
    }
    sparkSystem.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

// Ejecutar inicialización de la experiencia
init();
