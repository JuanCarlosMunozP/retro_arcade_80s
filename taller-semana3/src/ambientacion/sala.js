import * as THREE from 'three';
import { CONFIG } from '../core/config.js';
import { PIXEL, makeCanvas, fontRedraws } from '../core/utils.js';

/** Sala: piso, paredes, neones, letrero y luces */
export function crearSala(scene, texturas) {
  const { texturaAlfombra, texturaPared, textoNeon, texCanvas } = texturas;

  const neonMat = (hex, brillo = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(brillo) });

  const piso = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ map: texturaAlfombra(), roughness: 0.92, metalness: 0 }));
  piso.rotation.x = -Math.PI / 2; piso.position.set(0, 0, 2); piso.receiveShadow = true; scene.add(piso);

  const paredMat = new THREE.MeshStandardMaterial({ map: texturaPared(), roughness: 0.9 });
  [[0, 2, -4, 0], [-6, 2, 2, Math.PI / 2], [6, 2, 2, -Math.PI / 2], [0, 2, 8, Math.PI]].forEach(([x, y, z, ry]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), paredMat); p.position.set(x, y, z); p.rotation.y = ry; p.receiveShadow = true; scene.add(p);
  });
  const techo = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x06030c, roughness: 1 }));
  techo.rotation.x = Math.PI / 2; techo.position.set(0, 4, 2); scene.add(techo);

  function barraNeon(w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), neonMat(color));
    m.position.set(x, y, z);
    scene.add(m);
  }
  barraNeon(12, 0.03, 0.03, 0xff2bd6, 0, 0.05, -3.97);
  barraNeon(0.03, 0.03, 12, 0x00f0ff, -5.97, 0.05, 2);
  barraNeon(0.03, 0.03, 12, 0x00f0ff, 5.97, 0.05, 2);
  barraNeon(12, 0.025, 0.025, 0x7b2cff, 0, 3.95, -3.97);

  function puntosDensos(pts, sep, cerrado) {
    const out = [], n = pts.length, segs = cerrado ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n], k = Math.max(1, Math.ceil(a.distanceTo(b) / sep));
      for (let j = 0; j < k; j++) out.push(a.clone().lerp(b, j / k));
    }
    if (!cerrado) out.push(pts[n - 1].clone());
    return out;
  }

  function tuboNeon(pts, color, radio, cerrado, padre) {
    const densos = puntosDensos(pts, 0.02, cerrado);
    const curva = new THREE.CatmullRomCurve3(densos, cerrado, 'centripetal');
    const m = new THREE.Mesh(new THREE.TubeGeometry(curva, Math.min(700, densos.length * 2), radio, 8, cerrado), neonMat(color));
    (padre || scene).add(m);
    return m;
  }

  const letreroCanvas = makeCanvas(1024, 320), lg = letreroCanvas.getContext('2d');
  const letreroTex = texCanvas(letreroCanvas);
  const dibujarLetrero = () => {
    lg.clearRect(0, 0, 1024, 320);
    textoNeon(lg, 'ARCADE', 512, 168, '128px ' + PIXEL, '#ff2bd6', '#ffe3fa', 26);
    letreroTex.needsUpdate = true;
  };
  dibujarLetrero(); fontRedraws.push(dibujarLetrero);
  const letreroMat = new THREE.MeshBasicMaterial({ map: letreroTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const tablero = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.3, 0.03), new THREE.MeshStandardMaterial({ color: 0x0a0514, roughness: 0.6 }));
  tablero.position.set(0, 3.05, -3.975); scene.add(tablero);
  const letrero = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.31), letreroMat);
  letrero.position.set(0, 3.05, -3.95); scene.add(letrero);
  const anclaZumbido = new THREE.Object3D(); anclaZumbido.position.set(0, 3.05, -3.85); scene.add(anclaZumbido);

  const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.02, 10, 90), neonMat(0x00f0ff));
  anillo.position.set(-5.94, 2.55, -1.8); anillo.rotation.y = Math.PI / 2; scene.add(anillo);
  tuboNeon([90, 210, 330].map(a => {
    const r = THREE.MathUtils.degToRad(a);
    return new THREE.Vector3(-5.93, 2.55 + Math.sin(r) * 0.28, -1.8 + Math.cos(r) * 0.28);
  }), 0xff2bd6, 0.014, true);
  tuboNeon([[0.12, 0.6], [-0.16, 0.02], [0.02, 0.02], [-0.12, -0.6], [0.2, 0.1], [0.02, 0.1], [0.18, 0.6]].map(([u, v]) =>
    new THREE.Vector3(5.93, 2.45 + v, -1.5 + u)
  ), 0xffd400, 0.016, true);

  const L = CONFIG.escalaLuces;
  scene.add(new THREE.HemisphereLight(0x3a1a6a, 0x050010, 1.4 * L));
  const foco = new THREE.SpotLight(0xffe6f2, 12 * L, 9, 0.44, 0.7, 1.2);
  foco.position.set(0, 3.9, 2.2); foco.target.position.set(0, 1.1, 0); foco.castShadow = true;
  foco.shadow.mapSize.set(1024, 1024); foco.shadow.bias = -0.0008; foco.shadow.camera.near = 0.5; foco.shadow.camera.far = 8;
  scene.add(foco, foco.target);
  const luzRosa = new THREE.PointLight(0xff2bd6, 5 * L, 9, 1); luzRosa.position.set(0, 3.0, -3.2); scene.add(luzRosa);
  const luzCian = new THREE.PointLight(0x00f0ff, 2.5 * L, 6, 1); luzCian.position.set(-5.2, 2.5, -1.4); scene.add(luzCian);
  const luzDorada = new THREE.PointLight(0xffb000, 2.5 * L, 6, 1); luzDorada.position.set(5.2, 2.4, -1.2); scene.add(luzDorada);
  const luzPantalla = new THREE.PointLight(0xff2bd6, 1.5 * L, 4.5, 1); luzPantalla.position.set(0, 1.45, 0.95); scene.add(luzPantalla);
  const luzContra = new THREE.PointLight(0x7b2cff, 3 * L, 4.5, 1); luzContra.position.set(0, 2.6, -1.3); scene.add(luzContra);

  return {
    neonMat,
    tuboNeon,
    letreroMat,
    anclaZumbido,
    luzRosa,
    luzPantalla,
    L
  };
}
