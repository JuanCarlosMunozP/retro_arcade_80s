import * as THREE from 'three';
import { PIXEL, mulberry32, makeCanvas, fontRedraws, clamp } from '../core/utils.js';

/** Texturas canvas, shader CRT y pantallas secundarias / sin señal */
export function crearTexturas(renderer) {
  function texCanvas(canvas, { repetir, mipmaps = true } = {}) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repetir[0], repetir[1]); }
    if (!mipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
    return t;
  }

  function textoNeon(g, texto, x, y, fuente, color, nucleo, blur) {
    g.save(); g.font = fuente; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.shadowColor = color; g.strokeStyle = color;
    g.shadowBlur = blur * 1.6; g.lineWidth = blur * 0.34; g.strokeText(texto, x, y);
    g.shadowBlur = blur * 0.6; g.lineWidth = blur * 0.2; g.strokeText(texto, x, y);
    g.shadowBlur = 0; g.strokeStyle = nucleo; g.lineWidth = Math.max(1.5, blur * 0.08); g.strokeText(texto, x, y);
    g.restore();
  }

  function texturaAlfombra() {
    const c = makeCanvas(512, 512), g = c.getContext('2d');
    g.fillStyle = '#08030f'; g.fillRect(0, 0, 512, 512);
    const cols = ['#ff2bd6', '#00f0ff', '#ffd400', '#7b2cff', '#ff7a18'];
    const r = mulberry32(84);
    for (let i = 0; i < 150; i++) {
      const x = r() * 512, y = r() * 512, s = 6 + r() * 20, rot = r() * 6.28, tipo = (r() * 5) | 0;
      const col = cols[(r() * cols.length) | 0], lw = 2 + r() * 2.5;
      g.globalAlpha = 0.45 + r() * 0.45;
      for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
        const px = x + ox, py = y + oy;
        if (px < -40 || px > 552 || py < -40 || py > 552) continue;
        g.save(); g.translate(px, py); g.rotate(rot);
        g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath();
        if (tipo === 0) { g.moveTo(0, -s); g.lineTo(s * 0.9, s * 0.6); g.lineTo(-s * 0.9, s * 0.6); g.closePath(); g.stroke(); }
        else if (tipo === 1) { g.arc(0, 0, s * 0.7, 0, 6.283); g.stroke(); }
        else if (tipo === 2) { g.moveTo(-s, 0); for (let k = 1; k <= 4; k++) g.lineTo(-s + k * s * 0.5, k % 2 ? -s * 0.4 : s * 0.4); g.stroke(); }
        else if (tipo === 3) { g.arc(0, 0, s * 0.22, 0, 6.283); g.fill(); }
        else { g.moveTo(-s * 0.5, 0); g.lineTo(s * 0.5, 0); g.moveTo(0, -s * 0.5); g.lineTo(0, s * 0.5); g.stroke(); }
        g.restore();
      }
    }
    return texCanvas(c, { repetir: [5, 5] });
  }

  function texturaPared() {
    const c = makeCanvas(256, 256), g = c.getContext('2d');
    g.fillStyle = '#130a24'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(123,44,255,0.13)'; g.lineWidth = 2;
    for (let x = 0; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    return texCanvas(c, { repetir: [6, 2] });
  }

  function caraFicha() {
    const c = makeCanvas(256, 256), g = c.getContext('2d');
    const dibujar = () => {
      const rg = g.createRadialGradient(100, 90, 10, 128, 128, 130);
      rg.addColorStop(0, '#fff4b0'); rg.addColorStop(0.5, '#f2c230'); rg.addColorStop(1, '#9a6a00');
      g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#7a5200'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 90, 0, 6.283); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 123, 0, 6.283); g.stroke();
      g.beginPath();
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? 27 : 60, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = '#ffe98a'; g.fill(); g.strokeStyle = '#8a5c00'; g.lineWidth = 4; g.stroke();
      const txt = 'VALE POR UNA PARTIDA \u2605 NEON ARCADE \u2605 ';
      g.fillStyle = '#6b4700'; g.font = '600 15px "Chakra Petch", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const paso = (Math.PI * 2) / txt.length;
      for (let i = 0; i < txt.length; i++) {
        const a = -Math.PI / 2 + i * paso;
        g.save(); g.translate(128 + Math.cos(a) * 107, 128 + Math.sin(a) * 107); g.rotate(a + Math.PI / 2); g.fillText(txt[i], 0, 0); g.restore();
      }
    };
    dibujar();
    return { canvas: c, dibujar };
  }

  function marquesina(titulo, c1, c2) {
    const c = makeCanvas(1024, 256), g = c.getContext('2d');
    const dibujar = () => {
      const bg = g.createLinearGradient(0, 0, 0, 256); bg.addColorStop(0, '#05000f'); bg.addColorStop(1, '#2b0747');
      g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
      const sg = g.createLinearGradient(0, 40, 0, 256); sg.addColorStop(0, '#ffd400'); sg.addColorStop(1, c1);
      g.fillStyle = sg; g.globalAlpha = 0.55; g.beginPath(); g.arc(512, 250, 150, Math.PI, 0); g.fill(); g.globalAlpha = 1;
      g.fillStyle = '#2b0747'; for (let i = 0; i < 6; i++) g.fillRect(340, 170 + i * 14, 344, 3 + i);
      const fg = g.createLinearGradient(0, 70, 0, 160); fg.addColorStop(0, '#fff7b8'); fg.addColorStop(0.45, '#ffd400'); fg.addColorStop(1, c1);
      g.font = '64px ' + PIXEL; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 12; g.strokeStyle = '#1a0026'; g.strokeText(titulo, 512, 118);
      g.fillStyle = fg; g.fillText(titulo, 512, 118);
      g.lineWidth = 2; g.strokeStyle = c2; g.strokeText(titulo, 512, 118);
      g.font = '18px ' + PIXEL; g.fillStyle = c2; g.fillText('\u00A9 1984 PIXELWAVE', 512, 210);
      g.strokeStyle = c1; g.lineWidth = 6; g.strokeRect(6, 6, 1012, 244);
    };
    dibujar();
    const tex = texCanvas(c);
    fontRedraws.push(() => { dibujar(); tex.needsUpdate = true; });
    return tex;
  }

  function arteTablero(c1, c2) {
    const c = makeCanvas(512, 256), g = c.getContext('2d');
    g.fillStyle = '#12071f'; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = [c1, '#7b2cff', c2][i % 3]; g.globalAlpha = 0.55;
      g.beginPath(); g.moveTo(-60 + i * 26, 256); g.lineTo(40 + i * 26, 0); g.lineTo(52 + i * 26, 0); g.lineTo(-48 + i * 26, 256); g.fill();
    }
    g.globalAlpha = 1; g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3; g.strokeRect(8, 8, 496, 240);
    return texCanvas(c);
  }

  function texturaRejilla() {
    const c = makeCanvas(256, 64), g = c.getContext('2d');
    g.fillStyle = '#16101f'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#030106';
    for (let y = 8; y < 64; y += 10) for (let x = 8 + ((y / 10) % 2) * 5; x < 250; x += 10) { g.beginPath(); g.arc(x, y, 3, 0, 6.283); g.fill(); }
    return texCanvas(c);
  }

  function aficheCarrera() {
    const c = makeCanvas(512, 768), g = c.getContext('2d');
    const dibujar = () => {
      const bg = g.createLinearGradient(0, 0, 0, 768); bg.addColorStop(0, '#0d0024'); bg.addColorStop(0.55, '#3d0b5c'); bg.addColorStop(0.62, '#7a1466'); bg.addColorStop(0.63, '#0a0014'); bg.addColorStop(1, '#0a0014');
      g.fillStyle = bg; g.fillRect(0, 0, 512, 768);
      const r = mulberry32(3);
      g.fillStyle = '#fff'; for (let i = 0; i < 80; i++) { g.globalAlpha = r(); g.fillRect(r() * 512, r() * 420, 2, 2); } g.globalAlpha = 1;
      const sg = g.createLinearGradient(0, 290, 0, 480); sg.addColorStop(0, '#fff27a'); sg.addColorStop(0.5, '#ffb000'); sg.addColorStop(1, '#ff2bd6');
      g.fillStyle = sg; g.beginPath(); g.arc(256, 480, 160, Math.PI, 0); g.fill();
      g.fillStyle = '#3d0b5c'; for (let i = 0; i < 7; i++) g.fillRect(90, 400 + i * 12, 332, 2 + i * 1.2);
      g.fillStyle = '#0a0014'; g.beginPath(); g.moveTo(0, 480);
      [[40, 430], [95, 460], [150, 410], [210, 470], [300, 440], [360, 400], [430, 455], [512, 420], [512, 480]].forEach(p => g.lineTo(p[0], p[1]));
      g.closePath(); g.fill(); g.strokeStyle = '#ff2bd6'; g.lineWidth = 2; g.stroke();
      g.globalAlpha = 0.8;
      for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(256 + i * 10, 482); g.lineTo(256 + i * 90, 768); g.stroke(); }
      for (let k = 1; k < 10; k++) { const y = 482 + 286 * (k / 10) * (k / 10); g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
      g.globalAlpha = 1;
      const tg = g.createLinearGradient(0, 60, 0, 250); tg.addColorStop(0, '#fff7b8'); tg.addColorStop(0.4, '#ffd400'); tg.addColorStop(0.7, '#ff7a18'); tg.addColorStop(1, '#ff2bd6');
      g.font = '66px ' + PIXEL; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#1a0026'; g.fillText('NEON', 262, 116); g.fillText('RUNNER', 262, 206);
      g.fillStyle = tg; g.fillText('NEON', 256, 110); g.fillText('RUNNER', 256, 200);
      g.font = '18px ' + PIXEL; g.fillStyle = '#ffffff'; g.fillText('CORRE POR LA RED', 256, 640);
      g.font = '12px ' + PIXEL; g.fillStyle = '#00f0ff'; g.fillText('YA EN ESTA SALA', 256, 690);
      g.strokeStyle = '#ffd400'; g.lineWidth = 8; g.strokeRect(10, 10, 492, 748);
    };
    dibujar();
    const tex = texCanvas(c);
    fontRedraws.push(() => { dibujar(); tex.needsUpdate = true; });
    return tex;
  }

  function aficheTorneo(fichaCanvas) {
    const c = makeCanvas(512, 768), g = c.getContext('2d');
    const dibujar = () => {
      g.fillStyle = '#070016'; g.fillRect(0, 0, 512, 768);
      g.save(); g.translate(256, 380);
      for (let i = 0; i < 24; i++) { g.rotate(Math.PI / 12); g.fillStyle = i % 2 ? '#1d0640' : '#3a0d6b'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-60, -620); g.lineTo(60, -620); g.fill(); }
      g.restore();
      g.save(); g.shadowColor = '#ffd400'; g.shadowBlur = 40; g.drawImage(fichaCanvas, 116, 240, 280, 280); g.restore();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '52px ' + PIXEL; g.fillStyle = '#1a0026'; g.fillText('COPA', 260, 94); g.fillStyle = '#00f0ff'; g.fillText('COPA', 256, 90);
      g.font = '42px ' + PIXEL; g.fillStyle = '#1a0026'; g.fillText('CÓSMICA', 260, 166); g.fillStyle = '#ff2bd6'; g.fillText('CÓSMICA', 256, 162);
      g.font = '18px ' + PIXEL; g.fillStyle = '#ffd400'; g.fillText('TORNEO DE PUNTAJE', 256, 590);
      g.font = '24px ' + PIXEL; g.fillStyle = '#ffffff'; g.fillText('SÁBADO 8PM', 256, 640);
      g.font = '14px ' + PIXEL; g.fillStyle = '#ff2bd6'; g.fillText('PREMIO 500 FICHAS', 256, 692);
      g.strokeStyle = '#00f0ff'; g.lineWidth = 8; g.strokeRect(10, 10, 492, 748);
    };
    dibujar();
    const tex = texCanvas(c);
    fontRedraws.push(() => { dibujar(); tex.needsUpdate = true; });
    return tex;
  }

  function crearMaterialCRT(textura, lineas) {
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: textura }, time: { value: 0 }, power: { value: 1.1 },
        lines: { value: lineas }, fit: { value: new THREE.Vector2(1, 1) }
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D map; uniform float time; uniform float power; uniform float lines; uniform vec2 fit;
        varying vec2 vUv;
        vec2 curva(vec2 uv) { uv = uv * 2.0 - 1.0; vec2 o = abs(uv.yx) / vec2(5.0, 4.2); uv += uv * o * o; return uv * 0.5 + 0.5; }
        vec3 muestra(vec2 uv) {
          vec2 t = (uv - 0.5) * fit + 0.5;
          vec3 c = texture2D(map, clamp(t, 0.0, 1.0)).rgb;
          float dentro = step(0.0, t.x) * step(t.x, 1.0) * step(0.0, t.y) * step(t.y, 1.0);
          return c * dentro;
        }
        void main() {
          vec2 uv = curva(vUv);
          float fw = fwidth(uv.y * lines);
          float s = 0.0014;
          vec3 col = vec3(muestra(uv + vec2(s, 0.0)).r, muestra(uv).g, muestra(uv - vec2(s, 0.0)).b);
          float barrido = clamp(1.0 - fw * 1.6, 0.0, 1.0) * 0.38;
          col *= 1.0 - barrido * (0.5 + 0.5 * cos(uv.y * lines * 6.28318));
          vec2 v = uv * (1.0 - uv.yx);
          col *= pow(clamp(v.x * v.y * 18.0, 0.0, 1.0), 0.3);
          col *= 0.97 + 0.03 * sin(time * 60.0);
          float enPantalla = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
          gl_FragColor = vec4(col * power * enPantalla + vec3(0.002, 0.001, 0.004) * (1.0 - enPantalla), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
  }

  const Secundarias = (() => {
    const pc = makeCanvas(160, 120), pg = pc.getContext('2d');
    const ptex = texCanvas(pc, { mipmaps: false });
    const B = { x: 80, y: 60, vx: 80, vy: 52, l: 60, r: 60, sl: 3, sr: 5 };
    const xc = makeCanvas(80, 60), xg = xc.getContext('2d');
    const xtex = texCanvas(xc, { mipmaps: false });
    const img = xg.createImageData(80, 60);
    const paleta = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255 * Math.PI * 2;
      paleta[i * 3] = 128 + 127 * Math.sin(t); paleta[i * 3 + 1] = 100 + 60 * Math.sin(t + 2.1); paleta[i * 3 + 2] = 150 + 105 * Math.sin(t + 4.2);
    }
    let t = 0;
    function actualizar(dt) {
      t += dt;
      B.x += B.vx * dt; B.y += B.vy * dt;
      if (B.y < 4 || B.y > 116) { B.vy *= -1; B.y = clamp(B.y, 4, 116); }
      B.l += clamp(B.y - B.l, -60 * dt, 60 * dt); B.r += clamp(B.y - B.r, -56 * dt, 56 * dt);
      if (B.x < 10) { if (Math.abs(B.y - B.l) < 14) B.vx = Math.min(150, Math.abs(B.vx) * 1.04); else { B.sr = (B.sr + 1) % 10; B.x = 80; B.vx = 80; } }
      if (B.x > 150) { if (Math.abs(B.y - B.r) < 14) B.vx = -Math.min(150, Math.abs(B.vx) * 1.04); else { B.sl = (B.sl + 1) % 10; B.x = 80; B.vx = -80; } }
      pg.fillStyle = '#02050a'; pg.fillRect(0, 0, 160, 120);
      pg.fillStyle = '#0a4a55'; for (let y = 2; y < 120; y += 8) pg.fillRect(79, y, 2, 4);
      pg.fillStyle = '#00f0ff'; pg.fillRect(6, B.l - 12, 3, 24); pg.fillRect(151, B.r - 12, 3, 24);
      pg.fillStyle = '#ffffff'; pg.fillRect(B.x - 1.5, B.y - 1.5, 3, 3);
      pg.font = '12px ' + PIXEL; pg.textAlign = 'center'; pg.fillStyle = '#00f0ff'; pg.fillText(String(B.sl), 60, 20); pg.fillText(String(B.sr), 100, 20);
      ptex.needsUpdate = true;
      const d = img.data;
      for (let y = 0; y < 60; y++) for (let x = 0; x < 80; x++) {
        const v = Math.sin(x * 0.2 + t) + Math.sin((y * 0.15 + t) * 1.3) + Math.sin((x + y) * 0.1 + t * 0.7) + Math.sin(Math.sqrt((x - 40) ** 2 + (y - 30) ** 2) * 0.25 - t * 2);
        const idx = (((v + 4) * 32 + t * 40) | 0) & 255, o = (y * 80 + x) * 4;
        d[o] = paleta[idx * 3]; d[o + 1] = paleta[idx * 3 + 1]; d[o + 2] = paleta[idx * 3 + 2]; d[o + 3] = 255;
      }
      xg.putImageData(img, 0, 0); xtex.needsUpdate = true;
    }
    actualizar(0.016);
    return { ptex, xtex, actualizar };
  })();

  const SinSenal = (() => {
    const c = makeCanvas(320, 240), g = c.getContext('2d');
    const tex = texCanvas(c, { mipmaps: false });
    const rc = makeCanvas(160, 120), rg = rc.getContext('2d'), img = rg.createImageData(160, 120);
    function dibujar(t) {
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) { const v = (Math.random() * 170) | 0; d[i] = v; d[i + 1] = v; d[i + 2] = Math.min(255, v + 25); d[i + 3] = 255; }
      rg.putImageData(img, 0, 0);
      g.imageSmoothingEnabled = false; g.drawImage(rc, 0, 0, 320, 240);
      g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(16, 84, 288, 76);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '16px ' + PIXEL; g.fillStyle = Math.floor(t * 2) % 2 ? '#ffd400' : '#ff2bd6'; g.fillText('SIN SEÑAL', 160, 108);
      g.font = '7px ' + PIXEL; g.fillStyle = '#00f0ff'; g.fillText('FALTA public/assets/retro_arcade_video.mp4', 160, 138);
      tex.needsUpdate = true;
    }
    return { tex, dibujar };
  })();

  return {
    texCanvas,
    textoNeon,
    texturaAlfombra,
    texturaPared,
    caraFicha,
    marquesina,
    arteTablero,
    texturaRejilla,
    aficheCarrera,
    aficheTorneo,
    crearMaterialCRT,
    Secundarias,
    SinSenal
  };
}
