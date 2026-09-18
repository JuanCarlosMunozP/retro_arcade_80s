import * as THREE from 'three';
import { CONFIG } from '../core/config.js';
import { $, clamp, reduceMotion, easeInOut } from '../core/utils.js';

/** Monitor de audio espacial */
function gananciaDistancia(modelo, d, ref, max, roll) {
  if (modelo === 'linear') {
    const dd = clamp(d, ref, max);
    return 1 - Math.min(roll, 1) * (dd - ref) / (max - ref);
  }
  if (modelo === 'exponential') return Math.pow(Math.max(d, ref) / ref, -roll);
  return ref / (ref + roll * (Math.max(d, ref) - ref));
}

const mA = new THREE.Vector3(), mB = new THREE.Vector3(), mQ = new THREE.Quaternion(), mF = new THREE.Vector3(), mT = new THREE.Vector3();

function medirFuente(obj, modelo, ref, max, roll, cono, camera) {
  obj.getWorldPosition(mA);
  camera.getWorldPosition(mB);
  const d = mA.distanceTo(mB);
  let g = gananciaDistancia(modelo, d, ref, max, roll);
  if (cono) {
    obj.getWorldQuaternion(mQ);
    mF.set(0, 0, 1).applyQuaternion(mQ);
    mT.subVectors(mB, mA).normalize();
    const ang = THREE.MathUtils.radToDeg(Math.acos(clamp(mF.dot(mT), -1, 1)));
    const hi = cono.conoInterior / 2, ho = cono.conoExterior / 2;
    g *= ang <= hi ? 1 : ang >= ho ? cono.gananciaExterior : 1 + (cono.gananciaExterior - 1) * (ang - hi) / (ho - hi);
  }
  mA.applyMatrix4(camera.matrixWorldInverse);
  return { d, g, pan: clamp(mA.x / Math.max(0.001, Math.hypot(mA.x, mA.z)), -1, 1), detras: mA.z > 0 };
}

function pintarMedidor(prefijo, m) {
  $(prefijo + 'Dist').textContent = m.d.toFixed(1) + ' m';
  $(prefijo + 'Gain').style.width = Math.round(clamp(m.g, 0, 1) * 100) + '%';
  const p = $(prefijo + 'Pan');
  p.style.left = (50 + m.pan * 46) + '%';
  p.classList.toggle('behind', m.detras);
}

/** Bucle de animación a 60 FPS */
export function crearAnimate(deps) {
  const {
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
    materialCRT,
    materialPaletas,
    materialPlasma,
    Secundarias,
    SinSenal,
    letreroMat,
    luzRosa,
    luzPantalla,
    L,
    anclaZumbido,
    pantallaMesh,
    meshObjeto,
    VELOCIDAD_GIRO,
    fichasFlotantes,
    N_POLVO,
    polvoPos,
    polvoSemilla,
    polvoGeo,
    polvo,
    MAX_PR,
    ponerPR,
    getPixelRatio
  } = deps;

  const estado = acciones.estado;
  const colRosa = new THREE.Color(0xff2bd6), colCian = new THREE.Color(0x00f0ff);
  const _orb = new THREE.Vector3();
  let ultimo = performance.now();
  let fpsCuadros = 0, fpsAcum = 0, perfCuadros = 0, perfAcum = 0, perfEspera = 3, ultimaBajada = -99;
  let acumSecundarias = 0, acumUI = 0, acumSinSenal = 0, ticHover = 0;
  let promedioBajos = 0, esperaPulso = 0;
  let proximoParpadeo = 5 + Math.random() * 6, tParpadeo = -1, letreroAnterior = 1;

  $('res').textContent = getPixelRatio() + '×';

  function analizarAudio(dt) {
    if (audioApi.audioOk && estado.playing) {
      audioApi.analizador.getByteFrequencyData(audioApi.frecuencias);
      let s = 0;
      for (let i = 1; i < 6; i++) s += audioApi.frecuencias[i];
      const bajos = s / 5 / 255;
      promedioBajos += (bajos - promedioBajos) * Math.min(1, dt * 1.5);
      esperaPulso -= dt;
      if (bajos > promedioBajos * 1.2 + 0.03 && bajos > 0.3 && esperaPulso <= 0) {
        estado.pulso = 1;
        esperaPulso = 0.22;
        maquina.botones[(Math.random() * 3) | 0].userData.destello = 0.8;
        estado.golpeJoystick = Math.max(estado.golpeJoystick, 0.5);
      }
    }
    estado.pulso *= Math.exp(-dt * 7);
  }

  function actualizarFichas(dt) {
    for (let i = 0; i < fichasFlotantes.length; i++) {
      const t = fichasFlotantes[i];
      const a = t.a0 + estado.tiempo * 0.22;
      _orb.set(Math.cos(a) * t.r, t.y + Math.sin(estado.tiempo * 1.3 + i) * 0.06, 0.15 + Math.sin(a) * t.r);
      if (t.estado === 'orbita') {
        t.pivote.position.copy(_orb);
        t.pivote.rotation.y += dt * t.giro;
        t.hover += ((input.sobre === t.malla ? 1 : 0) - t.hover) * Math.min(1, dt * 12);
        t.malla.scale.setScalar(1.25 + t.hover * 0.25);
        t.mats[1].emissiveIntensity = t.mats[2].emissiveIntensity = 0.14 + t.hover * 0.5;
      } else if (t.estado === 'volando') {
        t.t += dt / 0.8;
        const u = easeInOut(Math.min(1, t.t)), iu = 1 - u;
        t.pivote.position.set(
          iu * iu * t.desde.x + 2 * iu * u * t.control.x + u * u * acciones.posMonedero.x,
          iu * iu * t.desde.y + 2 * iu * u * t.control.y + u * u * acciones.posMonedero.y,
          iu * iu * t.desde.z + 2 * iu * u * t.control.z + u * u * acciones.posMonedero.z
        );
        t.pivote.rotation.y += dt * (t.giro + 14 * iu);
        t.malla.scale.setScalar(1.25 * (1 - u * 0.6));
        if (t.t >= 1) {
          t.estado = 'oculta';
          t.t = 0;
          t.pivote.visible = false;
          acciones.insertarFicha(true);
        }
      } else if (t.estado === 'oculta') {
        t.t += dt;
        if (t.t > 2.5) { t.estado = 'aparece'; t.t = 0; t.pivote.visible = true; }
      } else {
        t.t += dt / 0.5;
        t.pivote.position.copy(_orb);
        t.pivote.rotation.y += dt * t.giro;
        t.malla.scale.setScalar(1.25 * (1 - Math.pow(1 - Math.min(1, t.t), 3)));
        if (t.t >= 1) t.estado = 'orbita';
      }
    }
  }

  function animate(ahora = performance.now()) {
    requestAnimationFrame(animate);

    const dtReal = Math.max(0, (ahora - ultimo) / 1000);
    ultimo = ahora;
    const dt = Math.min(dtReal, 1 / 20);
    estado.tiempo += dt;

    fpsCuadros++; fpsAcum += dtReal; perfCuadros++; perfAcum += dtReal; perfEspera -= dtReal;
    if (fpsAcum >= 0.5) {
      $('fps').textContent = Math.round(fpsCuadros / fpsAcum);
      fpsCuadros = 0; fpsAcum = 0;
    }
    if (perfAcum >= 1.5) {
      const fps = perfCuadros / perfAcum;
      if (estado.calidad === 'auto' && perfEspera <= 0) {
        const pixelRatio = getPixelRatio();
        if (fps < 52 && pixelRatio > 0.75) {
          ponerPR(Math.max(0.75, pixelRatio - 0.25));
          perfEspera = 3;
          ultimaBajada = estado.tiempo;
        } else if (fps > 58.5 && pixelRatio < MAX_PR && estado.tiempo - ultimaBajada > 15) {
          ponerPR(Math.min(MAX_PR, pixelRatio + 0.25));
          perfEspera = 6;
        }
      }
      perfAcum = 0; perfCuadros = 0;
    }

    if (estado.intro) {
      estado.intro.t += dt / 1.8;
      const e = easeInOut(Math.min(1, estado.intro.t));
      camera.position.lerpVectors(estado.intro.dePos, estado.intro.aPos, e);
      controls.target.lerpVectors(estado.intro.deObj, estado.intro.aObj, e);
      camera.lookAt(controls.target);
      if (estado.intro.t >= 1) {
        estado.intro = null;
        controls.enabled = true;
      }
    } else {
      const adelante = (input.teclas.has('w') || input.teclas.has('arrowup') ? 1 : 0) - (input.teclas.has('s') || input.teclas.has('arrowdown') ? 1 : 0);
      const lado = (input.teclas.has('d') || input.teclas.has('arrowright') ? 1 : 0) - (input.teclas.has('a') || input.teclas.has('arrowleft') ? 1 : 0);
      const giro = (input.teclas.has('q') ? 1 : 0) - (input.teclas.has('e') ? 1 : 0);
      if (adelante || lado) input.caminar(adelante, lado, dt);
      if (giro) input.orbitar(giro * 1.4 * dt);
      controls.target.set(
        clamp(controls.target.x, -4.8, 4.8),
        clamp(controls.target.y, 0.6, 2.5),
        clamp(controls.target.z, -3, 6.5)
      );
      controls.update(dt);
    }
    camera.position.set(
      clamp(camera.position.x, -5.7, 5.7),
      clamp(camera.position.y, 0.3, 3.8),
      clamp(camera.position.z, -3.7, 7.7)
    );

    if (meshObjeto) {
      meshObjeto.rotation.y += VELOCIDAD_GIRO * dt;
      meshObjeto.position.y = 2.62 + Math.sin(estado.tiempo * 1.6) * 0.03;
    }

    analizarAudio(dt);

    const potenciaObjetivo = !estado.started ? 0.9 : estado.playing ? 1.15 : 0.7;
    const u = materialCRT.uniforms;
    u.power.value += (potenciaObjetivo - u.power.value) * Math.min(1, dt * 4);
    u.time.value = estado.tiempo;
    materialPaletas.uniforms.time.value = estado.tiempo;
    materialPlasma.uniforms.time.value = estado.tiempo;
    acumSecundarias += dt;
    if (acumSecundarias >= 1 / 30) {
      Secundarias.actualizar(acumSecundarias);
      acumSecundarias = 0;
    }
    if (!videoApi.videoOk && videoApi.video.error) {
      acumSinSenal += dt;
      if (acumSinSenal >= 1 / 20) {
        acumSinSenal = 0;
        SinSenal.dibujar(estado.tiempo);
      }
    }

    estado.golpeJoystick = Math.max(0, estado.golpeJoystick - dt * 3);
    maquina.joystick.rotation.z = Math.sin(estado.tiempo * 18) * 0.35 * estado.golpeJoystick;
    for (const b of maquina.botones) {
      b.userData.destello = Math.max(0, b.userData.destello - dt * 4);
      b.material.emissiveIntensity = 0.35 + b.userData.destello * 2.2;
      b.position.y = b.userData.yBase - b.userData.destello * 0.006;
    }
    maquina.startMat.emissiveIntensity = estado.started ? 0.5 : (Math.floor(estado.tiempo * 2) % 2 ? 1.6 : 0.2);
    estado.destelloRanura = Math.max(0, estado.destelloRanura - dt * 1.5);
    maquina.ranuraMat.color.setRGB(
      1 + estado.destelloRanura * 1.5,
      0.2 + estado.destelloRanura * 1.2,
      0.33 + estado.destelloRanura * 0.6
    );
    maquina.marqMat.color.setScalar(1.1 + estado.pulso * 0.3);

    let encendido = 1;
    if (!reduceMotion) {
      proximoParpadeo -= dt;
      if (proximoParpadeo <= 0 && tParpadeo < 0) {
        tParpadeo = 0;
        proximoParpadeo = 6 + Math.random() * 8;
      }
      if (tParpadeo >= 0) {
        tParpadeo += dt;
        encendido = Math.sin(tParpadeo * 70) + Math.sin(tParpadeo * 23) > 0.2 ? 1 : 0.15;
        if (tParpadeo > 0.45) tParpadeo = -1;
      }
    }
    if (encendido !== letreroAnterior) {
      audioApi.zumbidoSenal.gain.setTargetAtTime(0.14 * encendido, audioApi.ctx.currentTime, 0.01);
      letreroAnterior = encendido;
    }
    letreroMat.color.setScalar(encendido * (1.3 + estado.pulso * 0.3));
    luzRosa.intensity = (4 + estado.pulso * 3) * L * (0.35 + 0.65 * encendido);
    luzPantalla.color.lerpColors(colRosa, colCian, 0.5 + 0.5 * Math.sin(estado.tiempo * 0.8));
    luzPantalla.intensity = ((!estado.started ? 1.2 : estado.playing ? 1.5 : 0.6) + estado.pulso * 1.5) * L;

    actualizarFichas(dt);

    if (polvo.visible) {
      for (let i = 0; i < N_POLVO; i++) {
        const j = i * 3;
        polvoPos[j + 1] += dt * 0.03;
        if (polvoPos[j + 1] > 3.8) polvoPos[j + 1] = 0.3;
        polvoPos[j] += Math.sin(estado.tiempo * 0.3 + polvoSemilla[i]) * dt * 0.02;
      }
      polvoGeo.attributes.position.needsUpdate = true;
    }

    if (input.mouseMovido && ++ticHover % 3 === 0 && !input.inicioPuntero) {
      input.mouseMovido = false;
      input.sobre = input.elegir();
      $('stage').style.cursor = input.sobre ? 'pointer' : 'grab';
    }

    acumUI += dt;
    if (acumUI >= 0.1) {
      acumUI = 0;
      const A = CONFIG.audio;
      pintarMedidor('scr', medirFuente(pantallaMesh, A.modelo, A.refDistance, A.maxDistance, A.rolloff, A, camera));
      pintarMedidor('hum', medirFuente(anclaZumbido, 'inverse', CONFIG.zumbido.refDistance, 25, CONFIG.zumbido.rolloff, null, camera));
      document.body.classList.toggle(
        'idle',
        estado.started && estado.playing && !estado.ayudaAbierta && performance.now() - estado.ultimaEntrada > 3500
      );
    }

    if (estado.calidad === 'low') renderer.render(scene, camera);
    else composer.render(dt);
  }

  return animate;
}
