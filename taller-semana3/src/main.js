import * as THREE from 'three';

// 1. Escena, Cámara y Renderizador
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75,window.innerWidth /
  window.innerHeight , 0.1,1000
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. Bucle de Animación a 60 FPS
function animate() {
  requestAnimationFrame(animate);

  if (meshObjeto) {
    meshObjeto.rotation.y += 0.01;
  }
  renderer.render(scene,camera);
}
animate();

// 1. Crear elemento HTML5 de Video
const video = document.createElement('video');
video.src = '/assets/retro_arcade_video.mp4';
video.load();
video.loop = true;
video.muted = true; // Requerido por navegator para autoplay
video.play();

// 2. Crear VideoTexture en Three.js
const videoTexture = new THREE.VideoTexture(video);

// 3. Aplicar a una Malla 3D (Pantalla)
const geometry = new THREE.PlaneGeometry(4,2.25);
const material = new THREE.MeshBasicMaterial({map:videoTexture,side:
  THREE.DoubleSide
});
const pantallaMesh = new THREE.Mesh(geometry,material);
scene.add(pantallaMesh);

// 1. Crear Listener y vincularlo a la cámara
const listener = new THREE.AudioListener();
camera.add(listener);

// 2. Crear fuente de sonido posicional
const sound = new THREE.PositionalAudio(listener);

// 3. Cargar el archivo de Audio
const audioLoader = new THREE.AudioLoader(listener);
audioLoader.load('/assets/retro_arcade_music.mp3',function(buffer) {
  sound.setBuffer(buffer);
  sound.setRefDistance(1); // Distancia donde el volumen es máximo
  sound.setMaxDistance(10); // Distancia donde el audio deja de escucharse
  sound.setLopp(true);
  sound.setVolume(0.8);
  sound.play();
})

// 4. Adjuntar el audio a la pantalla 3D
pantallaMesh.add(sound);