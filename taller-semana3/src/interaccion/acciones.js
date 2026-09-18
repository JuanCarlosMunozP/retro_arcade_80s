import * as THREE from 'three';
import { CONFIG } from '../core/config.js';
import { $, reduceMotion, esVertical } from '../core/utils.js';

/** Estado de la app e interacciones (reproducir, fichas, calidad, UI) */
export function crearAcciones(deps) {
  const {
    toast,
    controls,
    camera,
    videoApi,
    audioApi,
    maquina,
    fichasFlotantes,
    polvo,
    MAX_PR,
    ponerPR,
    pantallaMesh
  } = deps;

  const estado = {
    started: false,
    playing: false,
    muted: false,
    touring: false,
    fichas: 0,
    calidad: 'auto',
    ayudaAbierta: false,
    tiempo: 0,
    pulso: 0,
    destelloRanura: 0,
    golpeJoystick: 0,
    intro: null,
    ultimaEntrada: performance.now()
  };

  const posMonedero = new THREE.Vector3();
  maquina.grupo.updateMatrixWorld(true);
  maquina.anclaMonedero.getWorldPosition(posMonedero);

  videoApi.setPlayingRef(() => estado.playing);
  audioApi.setPlayingRef(() => estado.playing);
  audioApi.setVideoRef({
    get videoOk() { return videoApi.videoOk; },
    get currentTime() { return videoApi.video.currentTime; }
  });

  function syncUI() {
    const bp = $('btnPlay');
    bp.setAttribute('aria-pressed', String(estado.playing));
    bp.querySelector('.lbl').textContent = estado.playing ? 'Pausar' : 'Reproducir';
    bp.querySelector('.ico-play').style.display = estado.playing ? 'none' : '';
    bp.querySelector('.ico-pause').style.display = estado.playing ? '' : 'none';
    const bm = $('btnMute');
    bm.setAttribute('aria-pressed', String(estado.muted));
    bm.querySelector('.lbl').textContent = estado.muted ? 'Silenciado' : 'Sonido';
    bm.querySelector('.wave').style.display = estado.muted ? 'none' : '';
    bm.querySelector('.cross').style.display = estado.muted ? '' : 'none';
    $('btnTour').setAttribute('aria-pressed', String(estado.touring));
    $('qualityLbl').textContent = estado.calidad === 'auto' ? 'Auto' : estado.calidad === 'high' ? 'Alta' : 'Baja';
    $('fichas').textContent = String(estado.fichas).padStart(2, '0');
    $('stVideo').textContent = videoApi.videoOk ? 'listo' : (videoApi.video.error ? 'no encontrado' : 'cargando');
    $('stAudio').textContent = audioApi.audioOk ? 'listo' : 'cargando';
    const vivo = audioApi.audioOk && estado.playing && !estado.muted;
    $('audioPanel').classList.toggle('off', !vivo);
    $('apState').textContent = !audioApi.audioOk ? 'Sin archivo' : estado.muted ? 'Silenciado' : estado.playing ? 'En vivo' : 'En pausa';
  }

  function iniciarIntro() {
    const aPos = esVertical() ? new THREE.Vector3(2.2, 1.9, 5.2) : new THREE.Vector3(1.7, 1.75, 3.9);
    const aObj = new THREE.Vector3(0, 1.35, 0.2);
    if (reduceMotion) {
      camera.position.copy(aPos);
      controls.target.copy(aObj);
      return;
    }
    estado.intro = {
      t: 0,
      dePos: camera.position.clone(),
      deObj: controls.target.clone(),
      aPos,
      aObj
    };
    controls.enabled = false;
  }

  function iniciarExperiencia() {
    if (estado.started) return;
    estado.started = true;
    $('overlay').classList.add('gone');
    controls.autoRotate = false;
    iniciarIntro();
    reproducir(true);
  }

  async function reproducir(silencioso = false) {
    if (!estado.started) { iniciarExperiencia(); return; }
    estado.playing = true;
    syncUI();
    if (!silencioso) toast('Reproduciendo');
    const reanudar = audioApi.ctx.resume();
    if (videoApi.videoOk) videoApi.video.play().catch((e) => console.warn('El navegador bloqueó el video:', e));
    audioApi.zumbidoMaster.gain.setTargetAtTime(1, audioApi.ctx.currentTime, 0.08);
    try { await reanudar; } catch (e) { console.warn(e); }
    audioApi.iniciarSonido();
  }

  function pausar(silencioso = false) {
    estado.playing = false;
    videoApi.video.pause();
    if (audioApi.sound.isPlaying) audioApi.sound.pause();
    audioApi.zumbidoMaster.gain.setTargetAtTime(0, audioApi.ctx.currentTime, 0.08);
    syncUI();
    if (!silencioso) toast('En pausa');
  }

  const alternarReproduccion = () => (estado.playing ? pausar() : reproducir());

  function alternarSilencio() {
    estado.muted = !estado.muted;
    audioApi.listener.setMasterVolume(estado.muted ? 0 : 1);
    syncUI();
    toast(estado.muted ? 'Sonido silenciado' : 'Sonido activado');
  }

  function lanzarFicha(t) {
    if (!estado.started) iniciarExperiencia();
    t.estado = 'volando';
    t.t = 0;
    t.desde.copy(t.pivote.position);
    t.control.copy(t.desde).lerp(posMonedero, 0.5);
    t.control.y += 0.55;
    t.control.z += 0.35;
  }

  function insertarFicha(yaLlego) {
    if (!yaLlego) {
      const libre = fichasFlotantes.filter(k => k.estado === 'orbita')
        .sort((a, b) => a.pivote.position.distanceTo(posMonedero) - b.pivote.position.distanceTo(posMonedero))[0];
      if (libre) { lanzarFicha(libre); return; }
    }
    estado.fichas = Math.min(99, estado.fichas + 1);
    estado.destelloRanura = 1;
    if (!estado.started) iniciarExperiencia();
    else if (!estado.playing) reproducir(true);
    audioApi.ctx.resume().then(() => audioApi.sfx.ficha());
    syncUI();
  }

  function cambiarCalidad() {
    estado.calidad = estado.calidad === 'auto' ? 'high' : estado.calidad === 'high' ? 'low' : 'auto';
    if (estado.calidad === 'high') ponerPR(MAX_PR);
    if (estado.calidad === 'low') ponerPR(Math.min(1, MAX_PR));
    if (estado.calidad === 'auto') ponerPR(Math.min(MAX_PR, 1.5));
    polvo.visible = estado.calidad !== 'low';
    syncUI();
    toast('Calidad gráfica: ' + (estado.calidad === 'auto' ? 'automática' : estado.calidad === 'high' ? 'alta' : 'baja'));
  }

  function alternarRecorrido() {
    estado.touring = !estado.touring;
    controls.autoRotate = estado.touring;
    controls.autoRotateSpeed = reduceMotion ? 0.6 : 2;
    if (estado.touring) controls.target.set(0, 1.35, 0.2);
    syncUI();
    toast(estado.touring ? 'Recorrido de cámara activado' : 'Recorrido de cámara detenido');
  }

  function alternarAyuda(forzar) {
    estado.ayudaAbierta = typeof forzar === 'boolean' ? forzar : !estado.ayudaAbierta;
    $('help').hidden = !estado.ayudaAbierta;
    $('btnHelp').setAttribute('aria-expanded', String(estado.ayudaAbierta));
  }

  function interaccionUsuario() {
    estado.ultimaEntrada = performance.now();
    document.body.classList.remove('idle');
    if (estado.touring) {
      estado.touring = false;
      controls.autoRotate = false;
      syncUI();
    }
  }

  return {
    estado,
    posMonedero,
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
    alternarCRT: () => videoApi.alternarCRT(pantallaMesh),
    alternarEncuadre: () => videoApi.alternarEncuadre()
  };
}
