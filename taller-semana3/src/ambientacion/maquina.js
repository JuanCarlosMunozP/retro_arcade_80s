import * as THREE from 'three';

/** Constructor de máquina arcade */
export function crearFabricaMaquina(scene, envMats, texturas, tuboNeon) {
  const { arteTablero, texturaRejilla } = texturas;

  return function crearMaquina({ borde, marquesinaTex, materialPantalla }) {
    const grupo = new THREE.Group();
    const cuerpo = new THREE.MeshStandardMaterial({ color: 0x0d0a14, roughness: 0.36, metalness: 0.35, envMapIntensity: 0.8 });
    envMats.push(cuerpo);
    const oscuro = new THREE.MeshStandardMaterial({ color: 0x050308, roughness: 0.7 });
    const add = (geo, mat, x, y, z, padre) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      (padre || grupo).add(m);
      return m;
    };

    const perfil = [[-0.4, 0], [0.42, 0], [0.42, 0.88], [0.62, 1.0], [0.62, 1.06], [0.34, 1.14], [0.18, 1.2], [0.06, 1.8], [0.3, 1.92], [0.3, 2.18], [-0.4, 2.18]];
    const forma = new THREE.Shape();
    forma.moveTo(perfil[0][0], perfil[0][1]);
    for (let i = 1; i < perfil.length; i++) forma.lineTo(perfil[i][0], perfil[i][1]);
    forma.closePath();
    const geoLateral = new THREE.ExtrudeGeometry(forma, { depth: 0.05, bevelEnabled: false });
    geoLateral.rotateY(-Math.PI / 2);
    add(geoLateral, cuerpo, -0.30, 0, 0);
    add(geoLateral, cuerpo, 0.35, 0, 0);
    const contorno = perfil.slice(1).concat([perfil[0]]);
    for (const sx of [-0.325, 0.325]) {
      tuboNeon(contorno.map(([z, y]) => new THREE.Vector3(sx, y, z)), borde, 0.028, false, grupo);
    }

    const W = 0.6;
    add(new THREE.BoxGeometry(W, 0.88, 0.03), cuerpo, 0, 0.44, 0.405);
    const metal = new THREE.MeshStandardMaterial({ color: 0x2a2433, roughness: 0.35, metalness: 0.8 });
    envMats.push(metal);
    add(new THREE.BoxGeometry(0.26, 0.32, 0.02), metal, 0, 0.5, 0.43);
    const ranuraMat = new THREE.MeshBasicMaterial({ color: 0xff3355 });
    const ranura = add(new THREE.BoxGeometry(0.035, 0.075, 0.012), ranuraMat, -0.065, 0.56, 0.443);
    add(new THREE.BoxGeometry(0.035, 0.075, 0.012), ranuraMat, 0.065, 0.56, 0.443);
    add(new THREE.BoxGeometry(0.05, 0.03, 0.01), oscuro, -0.065, 0.42, 0.442);
    add(new THREE.BoxGeometry(0.05, 0.03, 0.01), oscuro, 0.065, 0.42, 0.442);

    add(new THREE.BoxGeometry(W + 0.02, 0.07, 0.03), cuerpo, 0, 1.03, 0.605);
    const angPanel = Math.atan2(0.08, 0.28), largoPanel = Math.hypot(0.28, 0.08);
    const panel = new THREE.Group();
    panel.position.set(0, 1.10, 0.48);
    panel.rotation.x = angPanel;
    grupo.add(panel);
    const arte = arteTablero('#' + new THREE.Color(borde).getHexString(), '#00f0ff');
    const arteMat = new THREE.MeshStandardMaterial({ map: arte, roughness: 0.5, emissive: 0xffffff, emissiveMap: arte, emissiveIntensity: 0.12 });
    add(new THREE.BoxGeometry(W + 0.02, 0.025, largoPanel + 0.02), [cuerpo, cuerpo, arteMat, cuerpo, cuerpo, cuerpo], 0, -0.0125, 0, panel);
    add(new THREE.BoxGeometry(W, 0.06, 0.18), cuerpo, 0, 1.15, 0.26);
    add(new THREE.CylinderGeometry(0.035, 0.04, 0.012, 24), oscuro, -0.16, 0.006, 0.02, panel);
    const joystick = new THREE.Group();
    joystick.position.set(-0.16, 0.01, 0.02);
    panel.add(joystick);
    const cromo = new THREE.MeshStandardMaterial({ color: 0xdddde8, roughness: 0.18, metalness: 1 });
    envMats.push(cromo);
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 12), cromo, 0, 0.045, 0, joystick);
    const bola = add(new THREE.SphereGeometry(0.028, 20, 14), new THREE.MeshStandardMaterial({ color: 0xff2244, roughness: 0.25 }), 0, 0.1, 0, joystick);
    const botones = [];
    [0xff3355, 0xffd400, 0x00f0ff].forEach((col, i) => {
      const z = i === 1 ? -0.03 : 0.01;
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 24), oscuro, 0.02 + i * 0.075, 0.003, z, panel);
      const b = add(
        new THREE.CylinderGeometry(0.022, 0.022, 0.018, 24),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.3 }),
        0.02 + i * 0.075, 0.012, z, panel
      );
      b.userData = { tipo: 'boton', destello: 0, yBase: 0.012 };
      botones.push(b);
    });
    const startMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });
    add(new THREE.BoxGeometry(0.028, 0.01, 0.028), startMat, 0.23, 0.005, -0.1, panel);

    const angBisel = Math.atan2(0.12, 0.6);
    const bisel = new THREE.Group();
    bisel.position.set(0, 1.5, 0.11);
    bisel.rotation.x = -angBisel;
    grupo.add(bisel);
    add(new THREE.BoxGeometry(W, 0.64, 0.02), oscuro, 0, 0, -0.01, bisel);
    const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.345), materialPantalla);
    pantalla.position.z = 0.003;
    bisel.add(pantalla);
    const biselMat = new THREE.MeshStandardMaterial({ color: 0x1b1030, roughness: 0.55, emissive: borde, emissiveIntensity: 0.05 });
    const bh = (0.64 - 0.345) / 2, bw = (W - 0.46) / 2;
    add(new THREE.BoxGeometry(W, bh, 0.012), biselMat, 0, 0.345 / 2 + bh / 2, 0.006, bisel);
    add(new THREE.BoxGeometry(W, bh, 0.012), biselMat, 0, -0.345 / 2 - bh / 2, 0.006, bisel);
    add(new THREE.BoxGeometry(bw, 0.345, 0.012), biselMat, -0.23 - bw / 2, 0, 0.006, bisel);
    add(new THREE.BoxGeometry(bw, 0.345, 0.012), biselMat, 0.23 + bw / 2, 0, 0.006, bisel);

    const angRejilla = Math.atan2(0.12, 0.24);
    const rejilla = new THREE.Group();
    rejilla.position.set(0, 1.86, 0.18);
    rejilla.rotation.x = -angRejilla;
    grupo.add(rejilla);
    add(new THREE.BoxGeometry(W, 0.02, 0.27), [cuerpo, cuerpo, cuerpo, new THREE.MeshStandardMaterial({ map: texturaRejilla(), roughness: 0.8 }), cuerpo, cuerpo], 0, 0, 0, rejilla);
    const marqMat = new THREE.MeshBasicMaterial({ map: marquesinaTex });
    marqMat.color.setScalar(1.1);
    add(new THREE.BoxGeometry(W, 0.26, 0.05), [cuerpo, cuerpo, cuerpo, cuerpo, marqMat, cuerpo], 0, 2.05, 0.28);
    add(new THREE.BoxGeometry(0.72, 0.03, 0.72), cuerpo, 0, 2.195, -0.05);
    add(new THREE.BoxGeometry(W, 2.18, 0.02), cuerpo, 0, 1.09, -0.39);
    add(new THREE.BoxGeometry(W + 0.12, 0.05, 0.86), oscuro, 0, 0.025, 0.01);

    const anclaMonedero = new THREE.Object3D();
    anclaMonedero.position.set(0, 0.56, 0.45);
    grupo.add(anclaMonedero);
    scene.add(grupo);
    return { grupo, pantalla, joystick, bola, botones, marqMat, ranuraMat, ranura, startMat, anclaMonedero };
  };
}
