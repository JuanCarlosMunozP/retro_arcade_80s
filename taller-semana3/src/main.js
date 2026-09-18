/* =====================================================================
   TALLER SEMANA 3: Medios, animación y audio espacial en Three.js
   Orquestador: la lógica vive en core / ambientacion / medios / interaccion
   ===================================================================== */
import './style.css';
import { comprobarWebGL2, createToast, fontRedraws } from './core/utils.js';
import { crearEscena } from './core/setup.js';
import { crearTexturas } from './ambientacion/texturas.js';
import { crearSala } from './ambientacion/sala.js';
import { crearFabricaMaquina } from './ambientacion/maquina.js';
import { crearObjetos } from './ambientacion/objetos.js';
import { crearVideo } from './medios/video.js';
import { crearAudio } from './medios/audio.js';
import { crearAcciones } from './interaccion/acciones.js';
import { registrarInput } from './interaccion/input.js';
import { crearAnimate } from './interaccion/animate.js';

comprobarWebGL2();

const toast = createToast();
let syncUI = () => {};

const escena = crearEscena();
const { scene, camera, renderer, composer, controls, envMats, MAX_PR, ponerPR } = escena;

const texturas = crearTexturas(renderer);
const sala = crearSala(scene, texturas);
const crearMaquina = crearFabricaMaquina(scene, envMats, texturas, sala.tuboNeon);

const videoApi = crearVideo({
  crearMaterialCRT: texturas.crearMaterialCRT,
  SinSenal: texturas.SinSenal,
  toast,
  onSync: () => syncUI()
});

const materialPaletas = texturas.crearMaterialCRT(texturas.Secundarias.ptex, 120);
const materialPlasma = texturas.crearMaterialCRT(texturas.Secundarias.xtex, 60);

const maquina = crearMaquina({
  borde: 0xff2bd6,
  marquesinaTex: texturas.marquesina('NEON VISION', '#ff2bd6', '#00f0ff'),
  materialPantalla: videoApi.materialCRT
});
const pantallaMesh = maquina.pantalla;

const maquinaIzq = crearMaquina({
  borde: 0x00f0ff,
  marquesinaTex: texturas.marquesina('PADDLE DUEL', '#00f0ff', '#ffd400'),
  materialPantalla: materialPaletas
});
maquinaIzq.grupo.position.set(-5.1, 0, 1.0);
maquinaIzq.grupo.rotation.y = Math.PI / 2;

const maquinaDer = crearMaquina({
  borde: 0xffd400,
  marquesinaTex: texturas.marquesina('PLASMA ZONE', '#ffd400', '#ff2bd6'),
  materialPantalla: materialPlasma
});
maquinaDer.grupo.position.set(5.1, 0, 1.8);
maquinaDer.grupo.rotation.y = -Math.PI / 2;

const objetos = crearObjetos({
  scene,
  renderer,
  envMats,
  texturas,
  neonMat: sala.neonMat
});

const audioApi = crearAudio({
  camera,
  pantallaMesh,
  anclaZumbido: sala.anclaZumbido,
  anclaMonedero: maquina.anclaMonedero,
  toast,
  onSync: () => syncUI()
});

const acciones = crearAcciones({
  toast,
  controls,
  camera,
  videoApi,
  audioApi,
  maquina,
  fichasFlotantes: objetos.fichasFlotantes,
  polvo: objetos.polvo,
  MAX_PR,
  ponerPR,
  pantallaMesh
});
syncUI = acciones.syncUI;

const input = registrarInput({
  camera,
  controls,
  renderer,
  composer,
  acciones,
  maquina,
  pantallaMesh,
  fichasFlotantes: objetos.fichasFlotantes,
  audioApi
});

const animate = crearAnimate({
  scene,
  camera,
  renderer,
  composer,
  controls,
  acciones,
  input,
  videoApi,
  audioApi,
  maquina,
  materialCRT: videoApi.materialCRT,
  materialPaletas,
  materialPlasma,
  Secundarias: texturas.Secundarias,
  SinSenal: texturas.SinSenal,
  letreroMat: sala.letreroMat,
  luzRosa: sala.luzRosa,
  luzPantalla: sala.luzPantalla,
  L: sala.L,
  anclaZumbido: sala.anclaZumbido,
  pantallaMesh,
  meshObjeto: objetos.meshObjeto,
  VELOCIDAD_GIRO: objetos.VELOCIDAD_GIRO,
  fichasFlotantes: objetos.fichasFlotantes,
  N_POLVO: objetos.N_POLVO,
  polvoPos: objetos.polvoPos,
  polvoSemilla: objetos.polvoSemilla,
  polvoGeo: objetos.polvoGeo,
  polvo: objetos.polvo,
  MAX_PR,
  ponerPR,
  getPixelRatio: () => escena.pixelRatio
});

if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('20px "Press Start 2P"'),
    document.fonts.load('600 15px "Chakra Petch"')
  ])
    .then(() => fontRedraws.forEach(f => f()))
    .catch(() => {});
}

acciones.syncUI();
requestAnimationFrame(animate);
