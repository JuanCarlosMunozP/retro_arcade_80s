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
video.src = '/assets/video.mp4';
video.load();
video.loop = true;
video.muted = true; // Requerido por navegator para autoplay
video.play();