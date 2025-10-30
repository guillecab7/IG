# IG
Repositorio para la práctica 6 de Informática Gráfica.

El enunciado de la práctica a realizar es el siguiente:

La tarea propuesta pide crear un sistema planetario con al menos cinco planetas y alguna luna, integrando iluminación y texturas. La vista del sistema solar permitirá alternar o mostrar al menos dos vistas: vista general y vista subjetiva desde una nave.

Antes de nada comentar que el código de esta tarea fue desarrollado y probado totalmente en el codesandbox. Por consiguiente os dejo por aquí la práctica en el siguiente enlace:  https://codesandbox.io/p/sandbox/sistema-solar-8dlqmx

Ahora empezaremos a explicar el código implementado en Sistema_planetario.js.
```js
let scene, renderer;
let cameraOverview, cameraShip, activeCamera;
let camcontrols;
let info;
let estrella, Planetas = [], Lunas = [];
let t0 = 0, accglobal = 0.001, timestamp;

let ship, shipCamRig;
let activeIsShip = false;
```
`scene`: contenedor de todos los objetos 3D.

`renderer`: dibuja la escena en un canvas WebGL.

`cameraOverview`: cámara “libre” con OrbitControls para ver todo el sistema.

`cameraShip`: cámara que sigue a la nave (vista alternativa).

`activeCamera`: referencia a la cámara actualmente activa (general o nave).

`camcontrols`: instancia de OrbitControls (solo para cameraOverview).

`info`: div HTML con el título de la vista.

`estrella`: malla del Sol.

`Planetas, Lunas`: arrays con mallas planetarias/lunares.

`t0/timestamp/accglobal`: control temporal. timestamp = (ahora - t0) * accglobal acelera/escala la simulación.

`ship`: malla de la astro-nave.

`shipCamRig`: objeto “rig” para posicionar la cámara de la nave de forma cómoda.

`activeIsShip`: true si la vista activa es la de nave (se usa para lógica en el loop).

```js
const loader = new THREE.TextureLoader();

const txSun = loader.load("src/8k_sun.jpg");
const txEarth = loader.load("src/earthmap1k.jpg");
const txEarthBump = loader.load("src/earthbump1k.jpg");
const txEarthSpec = loader.load("src/earthspec1k.jpg");
const txCloud = loader.load("src/earthcloudmap.jpg");
const txCloudAlpha = loader.load("src/earthcloudmaptrans_invert.jpg");

const txLuna = loader.load("src/8k_moon.jpg");
const txMercurio = loader.load("src/8k_mercury.jpg");
const txMarte = loader.load("src/8k_mars.jpg");
const txJupiter = loader.load("src/8k_jupiter.jpg");
const txSaturno = loader.load("src/8k_saturn.jpg");
const txNeptuno = loader.load("src/2k_neptune.jpg");
txNeptuno.colorSpace = THREE.SRGBColorSpace;
```
Aquí importamos las diferentes texturas para cada planeta y para la luna. Además tenemos una textura para el fondo y varias para la tierra.
En el caso de la Tierra tenemos las siguientes:

`map`: color difuso.

`bumpMap`: relieve falso por iluminación (no cambia la malla).

`specularMap`: define dónde hay brillos (océanos).

`Nubes`: map + alphaMap (transparencia guardada en una textura aparte).

```js
let tierraMesh = null, nubesMesh = null;

const SHIP_DIST = 8.75; // radio medio entre Tierra y Marte
const SHIP_F1 = 1.0;
const SHIP_F2 = 0.98;
const SHIP_SPEED = 0.5;
```
Guardamos referencias a la Tierra y su capa de nubes para rotarlas.

La nave orbita entre 7 (Tierra) y 10.5 (Marte)

`distancia` = 8.75

`f1, f2` → deforman elipses (1 = círculo).

`speed`: factor de velocidad angular

```js
init();
animationLoop();
```
`init()`: crea escena, cámaras, materiales, objetos, UI y eventos.

`animationLoop()`: actualiza posiciones cada frame y renderiza.

```js
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
```
Título que define la Vista actual en la pantalla

```js
scene = new THREE.Scene();
scene.background = new THREE.TextureLoader().load("src/8k_stars.jpg");
```
Fondo estrellado que aplicamos al background.

```js
const aspect = window.innerWidth / window.innerHeight;
cameraOverview = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
cameraOverview.position.set(0, 0, 22);

cameraShip = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
activeCamera = cameraOverview;
```
2 cámaras independientes con el mismo FOV y frustums.

`cameraOverview` arranca mirando al sistema desde z=22.

`activeCamera` apunta a la que se usa para renderizar.

```js
renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
```
Crea el canvas WebGL y lo ajusta a la ventana además tenemos sRGB para colores correctos con texturas.

```js
camcontrols = new OrbitControls(cameraOverview, renderer.domElement);
```
Se asocian al canvas del renderer y no afectan a cameraShip.

```js
const Lamb = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(Lamb);

const Ldir = new THREE.DirectionalLight(0xffffff, 1.0);
Ldir.position.set(5, 5, 5);
scene.add(Ldir);
```
`Ambient`: relleno global (suaviza sombras duras).

`Directional`: luz direccional para aportar volumen adicional (además del Sol).

Además, el Sol tendrá su propia PointLight para simular iluminación radial.

```js
Estrella(1.8, 0xffff00);
```
Crea una esfera con textura del Sol y PointLight. Concretamente llamamos la siguiente función `Estrella(rad, col)`.

```js
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
```
Malla del Sol con algo de emisión (autoiluminado leve).

PointLight “pegada” al Sol: ilumina radialmente al resto.

```js
Planeta(0.28, 4.0, 2.0, 0xaaaaaa, 1.0, 1.0);             // Mercurio
Planetas[0].material = new THREE.MeshPhongMaterial({ map: txMercurio });

Planeta(0.5, 7.0, 1.5, 0x3399ff, 1.0, 1.0);               // Tierra
// ... material avanzado con bump/specular ...

Planeta(0.53, 10.5, 1.15, 0xff3300, 1.0, 1.0);            // Marte
Planetas[2].material = new THREE.MeshPhongMaterial({ map: txMarte });

Planeta(1.1, 15.0, 0.9, 0xffaa00, 1.0, 1.0);              // Júpiter
Planetas[3].material = new THREE.MeshPhongMaterial({ map: txJupiter });

Planeta(0.95, 20.0, 0.75, 0xffddaa, 1.0, 1.0);            // Saturno
Planetas[4].material = new THREE.MeshPhongMaterial({ map: txSaturno });

Planeta(0.45, 28.0, 0.55, 0x3366ff, 1.0, 1.0);            // Neptuno
Planetas[5].material = new THREE.MeshPhongMaterial({ color: 0xffffff, map: txNeptuno });
Planetas[5].material.emissive = new THREE.Color(0x2244ff);
Planetas[5].material.emissiveIntensity = 0.5;
```
`Planeta(radio, dist, vel, color, f1, f2)`:

Crea esfera y guarda en `userData`: `dist`, `speed`, `f1`, `f2` (parámetros orbitales).

Usamos la siguiente función `Planeta(radio, dist, vel, col, f1, f2)` para crear los planetas:
```js
const planeta = new THREE.Mesh(
  new THREE.SphereGeometry(radio, 32, 32),
  new THREE.MeshPhongMaterial({ color: col })
);
planeta.userData = { dist, speed: vel, f1, f2 };
Planetas.push(planeta);
scene.add(planeta);

// Dibujo de la órbita (línea)
const curve = new THREE.EllipseCurve(0, 0, dist * f1, dist * f2);
const points = curve.getPoints(90);
const geome = new THREE.BufferGeometry().setFromPoints(points);
const mate = new THREE.LineBasicMaterial({ color: 0xffffff });
const orbita = new THREE.Line(geome, mate);
scene.add(orbita);
```
Donde se almacenan parámetros orbitales en userData y se pinta una línea elíptica de referencia con `EllipseCurve` (línea visual).

La Tierra usa Phong con:

`map` (color), `bumpMap` (relieve), `specularMap` (brillos de océanos) y para sus nubes usamos las texturas correspondientes.

```js
const geoNubes = new THREE.SphereGeometry(tierraMesh.geometry.parameters.radius * 1.03, 32, 32);
const matNubes = new THREE.MeshPhongMaterial({
  map: txCloud,
  alphaMap: txCloudAlpha,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  opacity: 1.0,
});
nubesMesh = new THREE.Mesh(geoNubes, matNubes);
tierraMesh.add(nubesMesh); // hijo de la Tierra, gira con ella
```
Después de los planetas, construímos las lunas para cada uno de ellos.

```js
Luna(Planetas[1], 0.12, 0.9, -2.0, 0xffffff, Math.PI / 6); // Luna de la Tierra
Lunas[0].material = new THREE.MeshPhongMaterial({ map: txLuna });

Luna(Planetas[3], 0.2, 1.8, 1.6, 0xffffaa, Math.PI / 4);
Luna(Planetas[3], 0.18, 2.4, -1.4, 0xffee99, Math.PI / 1.5);
Luna(Planetas[4], 0.15, 1.7, 1.1, 0xffffff, 0);
```
`Luna(planeta, radio, dist, vel, color, angle)`:

Crea un pivote `(Object3D)` con inclinación `angle` y lo añade como hijo del planeta.

La luna orbita en el plano de ese pivote, a distancia `dist`, velocidad `vel`.

Al ser hija del planeta, si el planeta se mueve, la luna lo acompaña naturalmente.

Usamos la siguiente función `Luna(planeta, radio, dist, vel, col, angle)`

```js
const pivote = new THREE.Object3D();
pivote.rotation.x = angle;
planeta.add(pivote);

const luna = new THREE.Mesh(
  new THREE.SphereGeometry(radio, 16, 16),
  new THREE.MeshBasicMaterial({ color: col })
);
luna.userData = { dist, speed: vel };
Lunas.push(luna);
pivote.add(luna);
```
El pivote define el plano orbital de la luna (inclinación).

La luna orbita porque actualizamos su posición en el loop con `cos/sin` usando `userData`.

Para la nave utilizamos la función `createShip()` siguiente.

```js
function createShip() {
  const geom = new THREE.IcosahedronGeometry(0.06, 0); // malla pequeñísima
  const mat = new THREE.MeshPhongMaterial({ color: 0x888888 }); // gris
  ship = new THREE.Mesh(geom, mat);
  ship.userData = { dist: SHIP_DIST, speed: SHIP_SPEED, f1: SHIP_F1, f2: SHIP_F2 };
  scene.add(ship);

  shipCamRig = new THREE.Object3D();
  scene.add(shipCamRig);
  shipCamRig.add(cameraShip);
  cameraShip.position.set(0.05, 0.05, 0.05);
}
```
Crea la malla de la nave (icosaedro pequeño gris).

Define su `userData` orbital con `SHIP_DIST/F1/F2/SPEED`.

La nave usa la misma cinemática elíptica que un planeta, con parámetros propios.

shipCamRig: `Object3D` que contiene a `cameraShip` y se moverá a la posición de la nave para “seguirla” en tercera persona.

`cameraShip.position.set(0.05, 0.05, 0.05)` define una vista un poco desplazada para así parecer que estamos dentro de la nave cuando en realidad estamos tan cerca que no podemos verla y observamos desde los ojos de la nave todo el sistema solar.

Ahora que tenemos la cámara de la nave, ya tenemos dos vistas distintas. 

Para alternar entre ambas implementamos la siguiente función `setView(mode)` 

```js
function setView(mode) {
  if (mode === "ship") {
    activeCamera = cameraShip;
    camcontrols.enabled = false; // OrbitControls solo para overview
    activeIsShip = true;
    info.innerHTML = "SISTEMA SOLAR — Vista nave";
  } else {
    activeCamera = cameraOverview;
    camcontrols.enabled = true;
    activeIsShip = false;
    info.innerHTML = "SISTEMA SOLAR — Vista general";
  }
}
```
Alterna la cámara activa y habilita/deshabilita OrbitControls en consecuencia.

Cambia el título de estado.
