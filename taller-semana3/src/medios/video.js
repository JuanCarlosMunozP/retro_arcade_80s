import * as THREE from 'three';
import { CONFIG } from '../core/config.js';

/** FASE 2: Video como textura 3D */
export function crearVideo({ crearMaterialCRT, SinSenal, toast, onSync }) {
  const estado = {
    videoOk: false,
    efectoCRT: true,
    modoEncuadre: 'cubrir',
    aspectoMedio: 16 / 9
  };

  const video = document.createElement('video');
  video.src = CONFIG.videoUrl;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.load();

  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.colorSpace = THREE.SRGBColorSpace;
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.generateMipmaps = false;

  const materialBasico = new THREE.MeshBasicMaterial({ map: videoTexture });
  const materialCRT = crearMaterialCRT(videoTexture, 240);

  const ASPECTO_PANTALLA = 0.46 / 0.345;

  function ajustarEncuadre() {
    const r = estado.aspectoMedio / ASPECTO_PANTALLA;
    const fit = materialCRT.uniforms.fit.value;
    if (estado.modoEncuadre === 'cubrir') {
      if (r > 1) fit.set(1 / r, 1); else fit.set(1, r);
    } else {
      if (r > 1) fit.set(1, r); else fit.set(1 / r, 1);
    }
    const cx = r > 1 ? 1 / r : 1, cy = r > 1 ? 1 : r;
    videoTexture.repeat.set(cx, cy);
    videoTexture.offset.set((1 - cx) / 2, (1 - cy) / 2);
  }
  ajustarEncuadre();

  let playingRef = () => false;

  function setPlayingRef(fn) { playingRef = fn; }

  video.addEventListener('loadeddata', () => {
    estado.videoOk = true;
    estado.aspectoMedio = video.videoWidth / video.videoHeight || 16 / 9;
    ajustarEncuadre();
    materialCRT.uniforms.map.value = videoTexture;
    materialBasico.map = videoTexture;
    videoTexture.needsUpdate = true;
    onSync();
    if (playingRef()) video.play().catch(() => {});
  });

  video.addEventListener('error', () => {
    estado.videoOk = false;
    estado.aspectoMedio = 4 / 3;
    ajustarEncuadre();
    materialCRT.uniforms.map.value = SinSenal.tex;
    materialBasico.map = SinSenal.tex;
    toast('No se encontró ' + CONFIG.videoUrl + '. Revisa la carpeta public/assets.', 4000);
    onSync();
  });

  function alternarCRT(pantallaMesh) {
    estado.efectoCRT = !estado.efectoCRT;
    pantallaMesh.material = estado.efectoCRT ? materialCRT : materialBasico;
    toast(estado.efectoCRT ? 'Efecto CRT activado' : 'Material básico (como en la guía)');
  }

  function alternarEncuadre() {
    estado.modoEncuadre = estado.modoEncuadre === 'cubrir' ? 'contener' : 'cubrir';
    ajustarEncuadre();
    toast(estado.modoEncuadre === 'cubrir' ? 'Video recortado para llenar la pantalla' : 'Video completo con franjas negras');
  }

  return {
    estado,
    video,
    videoTexture,
    materialBasico,
    materialCRT,
    ajustarEncuadre,
    setPlayingRef,
    alternarCRT,
    alternarEncuadre,
    get videoOk() { return estado.videoOk; },
    get efectoCRT() { return estado.efectoCRT; },
    get materialActivo() { return estado.efectoCRT ? materialCRT : materialBasico; }
  };
}
