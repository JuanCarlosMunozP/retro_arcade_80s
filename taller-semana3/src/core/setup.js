import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG } from './config.js';
import { $, reduceMotion, esVertical } from './utils.js';

/** FASE 1: Escena, cámara, renderizador, post-procesado y controles */
export function crearEscena() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07020f);
  scene.fog = new THREE.FogExp2(0x07020f, 0.05);

  const camera = new THREE.PerspectiveCamera(esVertical() ? 70 : 60, innerWidth / innerHeight, 0.05, 100);
  camera.position.set(4.8, 2.7, 8.2);

  const MAX_PR = Math.min(window.devicePixelRatio || 1, 2);
  let pixelRatio = Math.min(MAX_PR, 1.5);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  $('stage').appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    CONFIG.bloom.fuerza,
    CONFIG.bloom.radio,
    CONFIG.bloom.umbral
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.35, 0.2);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.1;
  controls.maxDistance = 10;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI * 0.53;
  controls.screenSpacePanning = false;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.5;
  controls.update();

  const envMats = [];

  function ponerPR(pr) {
    pixelRatio = pr;
    renderer.setPixelRatio(pr);
    composer.setPixelRatio(pr);
    $('res').textContent = String(Math.round(pr * 100) / 100) + '×';
  }

  return {
    scene,
    camera,
    renderer,
    composer,
    controls,
    envMats,
    MAX_PR,
    get pixelRatio() { return pixelRatio; },
    ponerPR
  };
}
