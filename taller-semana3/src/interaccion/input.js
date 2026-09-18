import * as THREE from 'three';
import { $, clamp, EJE_Y, esVertical } from '../core/utils.js';

/** Teclado, puntero, raycaster y resize */
export function registrarInput(deps) {
  const {
    camera,
    controls,
    renderer,
    composer,
    acciones,
    maquina,
    pantallaMesh,
    fichasFlotantes,
    audioApi
  } = deps;

  const {
    estado,
    syncUI,
    iniciarExperiencia,
    reproducir,
    pausar,
    alternarReproduccion,
    alternarSilencio,
    insertarFicha,
    lanzarFicha,
    cambiarCalidad,
    alternarRecorrido,
    alternarAyuda,
    interaccionUsuario,
    alternarCRT,
    alternarEncuadre
  } = acciones;

  $('btnPlay').addEventListener('click', alternarReproduccion);
  $('btnMute').addEventListener('click', alternarSilencio);
  $('btnCoin').addEventListener('click', () => insertarFicha(false));
  $('btnTour').addEventListener('click', alternarRecorrido);
  $('btnQuality').addEventListener('click', cambiarCalidad);
  $('btnHelp').addEventListener('click', () => alternarAyuda());
  $('overlay').addEventListener('click', () => insertarFicha(true));

  const _off = new THREE.Vector3(), _dir = new THREE.Vector3(), _der = new THREE.Vector3();
  function orbitar(a) {
    _off.subVectors(camera.position, controls.target).applyAxisAngle(EJE_Y, a);
    camera.position.copy(controls.target).add(_off);
  }
  function acercar(f) {
    _off.subVectors(camera.position, controls.target);
    _off.setLength(clamp(_off.length() * f, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(_off);
  }
  function caminar(adelante, lado, dt) {
    camera.getWorldDirection(_dir); _dir.y = 0; _dir.normalize();
    _der.crossVectors(_dir, EJE_Y).normalize();
    const paso = 2.2 * dt;
    _dir.multiplyScalar(adelante * paso).add(_der.multiplyScalar(lado * paso));
    controls.target.add(_dir); camera.position.add(_dir);
  }

  controls.addEventListener('start', () => { if (estado.started) interaccionUsuario(); });

  const teclas = new Set();
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (e.target && e.target.tagName === 'BUTTON' && (k === ' ' || k === 'enter')) return;
    estado.ultimaEntrada = performance.now();
    document.body.classList.remove('idle');
    if (!estado.started && [' ', 'enter', 'c', 'p'].includes(k)) {
      e.preventDefault();
      insertarFicha(true);
      return;
    }
    switch (k) {
      case ' ': case 'p': e.preventDefault(); alternarReproduccion(); break;
      case 'm': alternarSilencio(); break;
      case 'c': insertarFicha(false); break;
      case 't': alternarRecorrido(); break;
      case 'g': cambiarCalidad(); break;
      case 'v': alternarCRT(); break;
      case 'f': alternarEncuadre(); break;
      case 'h': case '?': alternarAyuda(); break;
      case 'u': document.body.classList.toggle('ui-hidden'); break;
      case 'escape': alternarAyuda(false); break;
      case '+': case '=': interaccionUsuario(); acercar(0.85); break;
      case '-': case '_': interaccionUsuario(); acercar(1.18); break;
      default:
        if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
          e.preventDefault();
          teclas.add(k);
          interaccionUsuario();
        }
    }
  });
  window.addEventListener('keyup', (e) => teclas.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => teclas.clear());

  const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
  const clicables = [pantallaMesh, ...maquina.botones, maquina.bola, maquina.ranura, ...fichasFlotantes.map(t => t.malla)];
  let inicioPuntero = null, mouseMovido = false, sobre = null;
  const lienzo = renderer.domElement;

  function ponerMouse(e) {
    const r = lienzo.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  function elegir() {
    raycaster.setFromCamera(mouse, camera);
    const h = raycaster.intersectObjects(clicables, false);
    return h.length ? h[0].object : null;
  }

  lienzo.addEventListener('pointerdown', (e) => {
    inicioPuntero = { x: e.clientX, y: e.clientY };
    $('stage').style.cursor = 'grabbing';
  });
  lienzo.addEventListener('pointermove', (e) => {
    ponerMouse(e);
    mouseMovido = true;
    estado.ultimaEntrada = performance.now();
    document.body.classList.remove('idle');
  });
  lienzo.addEventListener('pointerup', (e) => {
    const esClic = inicioPuntero && Math.hypot(e.clientX - inicioPuntero.x, e.clientY - inicioPuntero.y) < 6;
    inicioPuntero = null;
    $('stage').style.cursor = sobre ? 'pointer' : 'grab';
    if (!esClic) return;
    ponerMouse(e);
    const obj = elegir();
    if (!obj) return;
    if (!estado.started) { iniciarExperiencia(); return; }
    if (obj === pantallaMesh) return alternarReproduccion();
    if (obj === maquina.ranura) return insertarFicha(false);
    if (obj === maquina.bola) { estado.golpeJoystick = 1; audioApi.sfx.boton(); return; }
    const d = obj.userData;
    if (d.tipo === 'ficha' && d.ficha.estado === 'orbita') return lanzarFicha(d.ficha);
    if (d.tipo === 'boton') {
      d.destello = 1;
      audioApi.sfx.boton();
      if (!estado.playing) reproducir();
    }
  });

  let reanudarAlVolver = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && estado.playing) { reanudarAlVolver = true; pausar(true); }
    else if (!document.hidden && reanudarAlVolver) { reanudarAlVolver = false; reproducir(true); }
  });

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = esVertical() ? 70 : 60;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });

  return {
    teclas,
    orbitar,
    caminar,
    get mouseMovido() { return mouseMovido; },
    set mouseMovido(v) { mouseMovido = v; },
    get inicioPuntero() { return inicioPuntero; },
    get sobre() { return sobre; },
    set sobre(v) { sobre = v; },
    elegir
  };
}
