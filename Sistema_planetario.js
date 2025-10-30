import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let scene, renderer;
let cameraOverview, cameraShip, activeCamera;
let camcontrols;
let info;
let estrella,
  Planetas = [],
  Lunas = [];
let t0 = 0;
let accglobal = 0.001;
let timestamp;

let ship;
let shipCamRig;
let activeIsShip = false;

// --- TEXTURAS ---
const loader = new THREE.TextureLoader();

// Sol y Tierra
const txSun = loader.load("src/8k_sun.jpg");
const txEarth = loader.load("src/earthmap1k.jpg");
const txEarthBump = loader.load("src/earthbump1k.jpg");
const txEarthSpec = loader.load("src/earthspec1k.jpg");
const txCloud = loader.load("src/earthcloudmap.jpg");
const txCloudAlpha = loader.load("src/earthcloudmaptrans_invert.jpg");

// Luna, Mercurio, Marte, Jupiter y Saturno
const txLuna = loader.load("src/8k_moon.jpg");
const txMercurio = loader.load("src/8k_mercury.jpg");
const txMarte = loader.load("src/8k_mars.jpg");
const txJupiter = loader.load("src/8k_jupiter.jpg");
const txSaturno = loader.load("src/8k_saturn.jpg");
const txNeptuno = loader.load("src/2k_neptune.jpg");
txNeptuno.colorSpace = THREE.SRGBColorSpace;

let tierraMesh = null;
let nubesMesh = null;

const SHIP_DIST = 8.75; // radio medio entre Tierra y Marte
const SHIP_F1 = 1.0;
const SHIP_F2 = 0.98;
const SHIP_SPEED = 0.5;
init();
animationLoop();

function init() {
  info = document.createElement("div");
  info.style.position = "absolute";
  info.style.top = "30px";
  info.style.width = "100%";
  info.style.textAlign = "center";
  info.style.color = "#fff";
  info.style.fontWeight = "bold";
  info.style.backgroundColor = "transparent";
  info.style.zIndex = "1";
  info.style.fontFamily = "Monospace";
  info.innerHTML = "SISTEMA SOLAR — Vista general";
  document.body.appendChild(info);

  scene = new THREE.Scene();
  scene.background = new THREE.TextureLoader().load("src/8k_stars.jpg");

  const aspect = window.innerWidth / window.innerHeight;

  cameraOverview = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
  cameraOverview.position.set(0, 0, 22);

  cameraShip = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);

  activeCamera = cameraOverview;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  camcontrols = new OrbitControls(cameraOverview, renderer.domElement);

  // LUCES
  const Lamb = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(Lamb);
  const Ldir = new THREE.DirectionalLight(0xffffff, 1.0);
  Ldir.position.set(5, 5, 5);
  scene.add(Ldir);

  // PLANETAS
  Estrella(1.8, 0xffff00);

  Planeta(0.28, 4.0, 2.0, 0xaaaaaa, 1.0, 1.0); // Mercurio
  Planetas[0].material = new THREE.MeshPhongMaterial({ map: txMercurio });

  Planeta(0.5, 7.0, 1.5, 0x3399ff, 1.0, 1.0); // Tierra
  tierraMesh = Planetas[1];
  tierraMesh.material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    map: txEarth,
    bumpMap: txEarthBump,
    bumpScale: 1.0,
    specularMap: txEarthSpec,
    specular: new THREE.Color(0x333333),
    shininess: 15,
  });
  const geoNubes = new THREE.SphereGeometry(
    tierraMesh.geometry.parameters.radius * 1.03,
    32,
    32
  );
  const matNubes = new THREE.MeshPhongMaterial({
    map: txCloud,
    alphaMap: txCloudAlpha,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    opacity: 1.0,
  });
  nubesMesh = new THREE.Mesh(geoNubes, matNubes);
  tierraMesh.add(nubesMesh);

  Planeta(0.53, 10.5, 1.15, 0xff3300, 1.0, 1.0); // Marte
  Planetas[2].material = new THREE.MeshPhongMaterial({ map: txMarte });

  Planeta(1.1, 15.0, 0.9, 0xffaa00, 1.0, 1.0); // Júpiter
  Planetas[3].material = new THREE.MeshPhongMaterial({ map: txJupiter });

  Planeta(0.95, 20.0, 0.75, 0xffddaa, 1.0, 1.0); // Saturno
  Planetas[4].material = new THREE.MeshPhongMaterial({ map: txSaturno });

  Planeta(0.45, 28.0, 0.55, 0x3366ff, 1.0, 1.0); // Neptuno
  Planetas[5].material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    map: txNeptuno,
  });
  Planetas[5].material.emissive = new THREE.Color(0x2244ff);
  Planetas[5].material.emissiveIntensity = 0.5;

  // LUNAS
  Luna(Planetas[1], 0.12, 0.9, -2.0, 0xffffff, Math.PI / 6); // Luna
  Lunas[0].material = new THREE.MeshPhongMaterial({ map: txLuna });
  Luna(Planetas[3], 0.2, 1.8, 1.6, 0xffffaa, Math.PI / 4);
  Luna(Planetas[3], 0.18, 2.4, -1.4, 0xffee99, Math.PI / 1.5);
  Luna(Planetas[4], 0.15, 1.7, 1.1, 0xffffff, 0);

  // NAVE
  createShip();

  window.addEventListener("keydown", (e) => {
    if (e.key === "1") setView("overview");
    if (e.key === "2") setView("ship");
  });

  // Botones UI
  const ui = document.createElement("div");
  ui.style.position = "absolute";
  ui.style.top = "10px";
  ui.style.left = "10px";
  ui.style.zIndex = "2";
  ui.innerHTML = `
    <button id="btnOverview">Vista general (1)</button>
    <button id="btnShip">Vista nave (2)</button>
  `;
  document.body.appendChild(ui);
  document.getElementById("btnOverview").onclick = () => setView("overview");
  document.getElementById("btnShip").onclick = () => setView("ship");

  t0 = Date.now();
  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  cameraOverview.aspect = aspect;
  cameraOverview.updateProjectionMatrix();
  cameraShip.aspect = aspect;
  cameraShip.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function Estrella(rad, col) {
  const geometry = new THREE.SphereGeometry(rad, 32, 32);
  const material = new THREE.MeshPhongMaterial({
    map: txSun,
    emissive: 0xffff33,
    emissiveIntensity: 0.1,
    shininess: 1,
  });
  estrella = new THREE.Mesh(geometry, material);
  scene.add(estrella);

  const luzSol = new THREE.PointLight(0xffffff, 2.2, 0);
  estrella.add(luzSol);
}

function Planeta(radio, dist, vel, col, f1, f2) {
  const geom = new THREE.SphereGeometry(radio, 32, 32);
  const mat = new THREE.MeshPhongMaterial({ color: col });
  const planeta = new THREE.Mesh(geom, mat);
  planeta.userData.dist = dist;
  planeta.userData.speed = vel;
  planeta.userData.f1 = f1;
  planeta.userData.f2 = f2;

  Planetas.push(planeta);
  scene.add(planeta);

  const curve = new THREE.EllipseCurve(0, 0, dist * f1, dist * f2);
  const points = curve.getPoints(90);
  const geome = new THREE.BufferGeometry().setFromPoints(points);
  const mate = new THREE.LineBasicMaterial({ color: 0xffffff });
  const orbita = new THREE.Line(geome, mate);
  scene.add(orbita);

  return planeta;
}

function Luna(planeta, radio, dist, vel, col, angle) {
  const pivote = new THREE.Object3D();
  pivote.rotation.x = angle;
  planeta.add(pivote);

  const geom = new THREE.SphereGeometry(radio, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: col });
  const luna = new THREE.Mesh(geom, mat);
  luna.userData.dist = dist;
  luna.userData.speed = vel;

  Lunas.push(luna);
  pivote.add(luna);
}

// --- ASTRO-NAVE ---
function createShip() {
  const geom = new THREE.IcosahedronGeometry(0.06, 0); // muy pequeña
  const mat = new THREE.MeshPhongMaterial({ color: 0x888888 }); // gris
  ship = new THREE.Mesh(geom, mat);
  ship.userData = {
    dist: SHIP_DIST,
    speed: SHIP_SPEED,
    f1: SHIP_F1,
    f2: SHIP_F2,
  };
  scene.add(ship);

  shipCamRig = new THREE.Object3D();
  scene.add(shipCamRig);
  shipCamRig.add(cameraShip);
  cameraShip.position.set(0.05, 0.05, 0.05);
}

// Cambiar vista
function setView(mode) {
  if (mode === "ship") {
    activeCamera = cameraShip;
    camcontrols.enabled = false;
    activeIsShip = true;
    info.innerHTML = "SISTEMA SOLAR — Vista nave";
  } else {
    activeCamera = cameraOverview;
    camcontrols.enabled = true;
    activeIsShip = false;
    info.innerHTML = "SISTEMA SOLAR — Vista general";
  }
}

// Bucle de animación
function animationLoop() {
  timestamp = (Date.now() - t0) * accglobal;
  requestAnimationFrame(animationLoop);

  // Orbita planetas
  for (let object of Planetas) {
    object.position.x =
      Math.cos(timestamp * object.userData.speed) *
      object.userData.f1 *
      object.userData.dist;
    object.position.y =
      Math.sin(timestamp * object.userData.speed) *
      object.userData.f2 *
      object.userData.dist;
  }

  // Orbita lunas
  for (let object of Lunas) {
    object.position.x =
      Math.cos(timestamp * object.userData.speed) * object.userData.dist;
    object.position.y =
      Math.sin(timestamp * object.userData.speed) * object.userData.dist;
  }

  // Rotación propia Tierra y nubes
  if (tierraMesh) tierraMesh.rotation.y += 0.003;
  if (nubesMesh) nubesMesh.rotation.y += 0.0045;

  // Movimiento de la astro-nave
  if (ship) {
    ship.position.x =
      Math.cos(timestamp * ship.userData.speed) *
      ship.userData.f1 *
      ship.userData.dist;
    ship.position.y =
      Math.sin(timestamp * ship.userData.speed) *
      ship.userData.f2 *
      ship.userData.dist;

    // Cámara siguiendo a la nave
    if (activeIsShip && shipCamRig) {
      shipCamRig.position.copy(ship.position);
      cameraShip.lookAt(ship.position);
    }
  }

  renderer.render(scene, activeCamera);
}
