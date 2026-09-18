import * as THREE from 'three';
import { mulberry32, fontRedraws } from '../core/utils.js';

/** Afiches, mesa, fichas, meshObjeto, polvo y captura de entorno */
export function crearObjetos({ scene, renderer, envMats, texturas, neonMat }) {
  const { caraFicha, texCanvas, aficheCarrera, aficheTorneo } = texturas;

  const ficha = caraFicha();
  const fichaTex = texCanvas(ficha.canvas);
  fontRedraws.unshift(() => { ficha.dibujar(); fichaTex.needsUpdate = true; });

  function crearAfiche(tex, x) {
    const marco = new THREE.Mesh(new THREE.BoxGeometry(1.32, 1.92, 0.04), new THREE.MeshStandardMaterial({ color: 0x1a1424, roughness: 0.4, metalness: 0.6 }));
    marco.position.set(x, 1.95, -3.975); scene.add(marco);
    const arte = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.14 }));
    arte.position.set(x, 1.95, -3.952); scene.add(arte);
  }
  crearAfiche(aficheCarrera(), -3.3);
  crearAfiche(aficheTorneo(ficha.canvas), 3.3);

  const geoFicha = new THREE.CylinderGeometry(0.07, 0.07, 0.012, 40);
  const oroMat = new THREE.MeshStandardMaterial({ color: 0xd9a51c, roughness: 0.3, metalness: 0.85, emissive: 0x3a2600 });
  envMats.push(oroMat);
  const caraMat = new THREE.MeshStandardMaterial({ map: fichaTex, roughness: 0.35, metalness: 0.5, emissive: 0xffffff, emissiveMap: fichaTex, emissiveIntensity: 0.14 });
  envMats.push(caraMat);

  const mesa = new THREE.Group(); mesa.position.set(2.0, 0, 1.3); scene.add(mesa);
  const mesaMat = new THREE.MeshStandardMaterial({ color: 0x120a1d, roughness: 0.25, metalness: 0.5 });
  envMats.push(mesaMat);
  const cubierta = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 40), mesaMat);
  cubierta.position.y = 1.0; cubierta.castShadow = cubierta.receiveShadow = true; mesa.add(cubierta);
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.98, 12), mesaMat);
  poste.position.y = 0.49; poste.castShadow = true; mesa.add(poste);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.03, 32), mesaMat);
  base.position.y = 0.015; mesa.add(base);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.01, 8, 64), neonMat(0xff2bd6));
  aro.rotation.x = Math.PI / 2; aro.position.y = 1.0; mesa.add(aro);
  {
    const pilas = [[0.1, 0.02, 12], [-0.12, 0.1, 8], [0.0, -0.16, 5]], sueltas = 5;
    const total = pilas.reduce((a, p) => a + p[2], 0) + sueltas;
    const inst = new THREE.InstancedMesh(geoFicha, [oroMat, caraMat, caraMat], total);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), rr = mulberry32(5);
    let k = 0;
    for (const [x, z, n] of pilas) for (let i = 0; i < n; i++) {
      p.set(x + (rr() - 0.5) * 0.006, 1.026 + i * 0.0125, z + (rr() - 0.5) * 0.006);
      q.setFromEuler(e.set(0, rr() * 6.28, 0));
      inst.setMatrixAt(k++, m.compose(p, q, s));
    }
    for (let i = 0; i < sueltas; i++) {
      const a = rr() * 6.28, d = 0.2 + rr() * 0.12;
      p.set(Math.cos(a) * d, 1.026, Math.sin(a) * d);
      q.setFromEuler(e.set((rr() - 0.5) * 0.1, rr() * 6.28, (rr() - 0.5) * 0.1));
      inst.setMatrixAt(k++, m.compose(p, q, s));
    }
    inst.castShadow = true; mesa.add(inst);
  }

  const meshObjeto = new THREE.Group();
  {
    const f = new THREE.Mesh(geoFicha, [oroMat, caraMat, caraMat]);
    f.rotation.x = Math.PI / 2;
    f.scale.setScalar(3);
    meshObjeto.add(f);
  }
  meshObjeto.position.set(0, 2.62, 0.02);
  scene.add(meshObjeto);
  const VELOCIDAD_GIRO = 1.2;

  const fichasFlotantes = [];
  for (let i = 0; i < 6; i++) {
    const pivote = new THREE.Group();
    const mats = [oroMat.clone(), caraMat.clone(), caraMat.clone()];
    mats.forEach(mm => envMats.push(mm));
    const malla = new THREE.Mesh(geoFicha, mats);
    malla.rotation.x = Math.PI / 2;
    malla.scale.setScalar(1.25);
    pivote.add(malla); scene.add(pivote);
    const tk = {
      pivote, malla, mats,
      a0: i / 6 * Math.PI * 2,
      r: 1.2 + (i % 2) * 0.18,
      y: 1.25 + (i % 3) * 0.28,
      giro: 1.4 + i * 0.25,
      estado: 'orbita', t: 0, hover: 0,
      desde: new THREE.Vector3(), control: new THREE.Vector3()
    };
    malla.userData = { tipo: 'ficha', ficha: tk };
    fichasFlotantes.push(tk);
  }

  const N_POLVO = 260;
  const polvoPos = new Float32Array(N_POLVO * 3), polvoSemilla = new Float32Array(N_POLVO);
  {
    const rr = mulberry32(9);
    for (let i = 0; i < N_POLVO; i++) {
      polvoPos[i * 3] = (rr() - 0.5) * 3;
      polvoPos[i * 3 + 1] = 0.3 + rr() * 3.5;
      polvoPos[i * 3 + 2] = -1 + rr() * 3.5;
      polvoSemilla[i] = rr() * 100;
    }
  }
  const polvoGeo = new THREE.BufferGeometry();
  polvoGeo.setAttribute('position', new THREE.BufferAttribute(polvoPos, 3));
  const polvo = new THREE.Points(polvoGeo, new THREE.PointsMaterial({
    color: 0xffd9ff, size: 0.014, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(polvo);

  {
    fichasFlotantes.forEach(t => t.pivote.visible = false); polvo.visible = false;
    const rt = new THREE.WebGLCubeRenderTarget(128, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    const cubeCam = new THREE.CubeCamera(0.05, 20, rt);
    cubeCam.position.set(0, 1.4, 1.6); scene.add(cubeCam);
    cubeCam.update(renderer, scene); scene.remove(cubeCam);
    envMats.forEach(m => { m.envMap = rt.texture; m.needsUpdate = true; });
    fichasFlotantes.forEach(t => t.pivote.visible = true); polvo.visible = true;
    renderer.shadowMap.needsUpdate = true;
  }

  return {
    meshObjeto,
    VELOCIDAD_GIRO,
    fichasFlotantes,
    N_POLVO,
    polvoPos,
    polvoSemilla,
    polvoGeo,
    polvo
  };
}
