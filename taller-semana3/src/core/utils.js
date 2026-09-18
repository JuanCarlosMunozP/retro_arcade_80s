import * as THREE from 'three';

export const $ = (id) => document.getElementById(id);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const PIXEL = '"Press Start 2P", ui-monospace, monospace';
export const EJE_Y = new THREE.Vector3(0, 1, 0);
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fontRedraws = [];

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function createToast() {
  let toastTimer = 0;
  return function toast(msg, ms = 1800) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  };
}

export function mostrarError(msg) {
  const card = document.querySelector('#overlay .card');
  card.innerHTML = '<h1 class="small">Sin señal</h1><p class="lead"></p>';
  card.querySelector('.lead').textContent = msg;
}

export function comprobarWebGL2() {
  if (!document.createElement('canvas').getContext('webgl2')) {
    mostrarError('Este navegador no tiene WebGL2, así que no puede dibujar la sala 3D. Prueba con Chrome, Edge, Firefox o Safari actualizados.');
    throw new Error('WebGL2 no disponible');
  }
}

export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export const esVertical = () => innerWidth < innerHeight;
