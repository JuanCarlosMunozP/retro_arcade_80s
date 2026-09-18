import * as THREE from 'three';
import { CONFIG } from '../core/config.js';

/** FASE 3: Audio espacial (PositionalAudio) */
export function crearAudio({ camera, pantallaMesh, anclaZumbido, anclaMonedero, toast, onSync }) {
  const estado = { audioOk: false, audioError: false };

  const listener = new THREE.AudioListener();
  camera.add(listener);
  const ctx = listener.context;

  const sound = new THREE.PositionalAudio(listener);
  sound.setDistanceModel(CONFIG.audio.modelo);
  sound.setRefDistance(CONFIG.audio.refDistance);
  sound.setMaxDistance(CONFIG.audio.maxDistance);
  sound.setRolloffFactor(CONFIG.audio.rolloff);
  sound.setDirectionalCone(CONFIG.audio.conoInterior, CONFIG.audio.conoExterior, CONFIG.audio.gananciaExterior);

  const preAnalisis = ctx.createGain();
  const analizador = ctx.createAnalyser();
  analizador.fftSize = 1024;
  analizador.smoothingTimeConstant = 0.6;
  preAnalisis.connect(analizador);
  sound.setFilters([preAnalisis]);
  const frecuencias = new Uint8Array(analizador.frequencyBinCount);

  let playingRef = () => false;
  function setPlayingRef(fn) { playingRef = fn; }

  const audioLoader = new THREE.AudioLoader();
  audioLoader.load(
    CONFIG.audioUrl,
    (buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(CONFIG.volumen);
      estado.audioOk = true;
      onSync();
      if (playingRef()) iniciarSonido();
    },
    undefined,
    (err) => {
      console.warn('Error cargando audio:', err);
      estado.audioError = true;
      toast('No se pudo cargar ' + CONFIG.audioUrl + '. Revisa el nombre y la carpeta public/assets.', 4000);
      onSync();
    }
  );

  pantallaMesh.add(sound);

  const zumbidoMaster = ctx.createGain(); zumbidoMaster.gain.value = 0;
  const zumbidoSenal = ctx.createGain(); zumbidoSenal.gain.value = 0.14;
  {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 60;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 120;
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const chispa = ctx.createBufferSource(); chispa.buffer = nb; chispa.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.8;
    const cg = ctx.createGain(); cg.gain.value = 0.07;
    o1.connect(lp); o2.connect(lp); lp.connect(zumbidoSenal);
    chispa.connect(bp); bp.connect(cg); cg.connect(zumbidoSenal);
    zumbidoSenal.connect(zumbidoMaster);
    o1.start(); o2.start(); chispa.start();
  }
  const zumbido = new THREE.PositionalAudio(listener);
  zumbido.setNodeSource(zumbidoMaster);
  zumbido.setRefDistance(CONFIG.zumbido.refDistance);
  zumbido.setRolloffFactor(CONFIG.zumbido.rolloff);
  anclaZumbido.add(zumbido);

  const efectosBus = ctx.createGain();
  const efectos = new THREE.PositionalAudio(listener);
  efectos.setNodeSource(efectosBus);
  efectos.setRefDistance(1);
  efectos.setRolloffFactor(1.4);
  anclaMonedero.add(efectos);

  function beep(tipo, f0, f1, t, dur, pico) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(efectosBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const sfx = {
    ficha() {
      const t = ctx.currentTime + 0.01;
      beep('square', 988, 0, t, 0.07, 0.2);
      beep('square', 1319, 0, t + 0.075, 0.38, 0.2);
    },
    boton() { beep('square', 520, 1040, ctx.currentTime + 0.005, 0.06, 0.12); }
  };

  let videoRef = { videoOk: false, currentTime: 0 };

  function setVideoRef(ref) { videoRef = ref; }

  function iniciarSonido() {
    if (!estado.audioOk || !playingRef() || sound.isPlaying) return;
    if (CONFIG.sincronizarAudioConVideo && videoRef.videoOk && sound.buffer) {
      sound.stop();
      sound.offset = videoRef.currentTime % sound.buffer.duration;
    }
    sound.play();
  }

  return {
    estado,
    listener,
    ctx,
    sound,
    analizador,
    frecuencias,
    zumbidoMaster,
    zumbidoSenal,
    sfx,
    setPlayingRef,
    setVideoRef,
    iniciarSonido,
    get audioOk() { return estado.audioOk; },
    get audioError() { return estado.audioError; }
  };
}
