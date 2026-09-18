/* Configuración: rutas, distancias de audio y brillo */
export const CONFIG = {
  videoUrl: '/assets/video.mp4',
  audioUrl: '/assets/audio.mp3',
  volumen: 0.8,
  sincronizarAudioConVideo: true,   // al reanudar, el audio salta al mismo segundo del video
  audio: {
    modelo: 'linear',               // 'linear' respeta maxDistance; 'inverse' y 'exponential' la ignoran
    refDistance: 1.2,               // hasta esta distancia el volumen es máximo
    maxDistance: 14,                // con 'linear', aquí el volumen llega a cero
    rolloff: 1,
    conoInterior: 140,              // grados: frente a la pantalla se oye completo
    conoExterior: 280,
    gananciaExterior: 0.3           // detrás de la máquina queda al 30 %
  },
  zumbido: { refDistance: 0.9, rolloff: 2.4 },
  escalaLuces: 1,                   // sube o baja todas las luces si tu pantalla se ve muy oscura o clara
  bloom: { fuerza: 0.85, radio: 0.5, umbral: 0.25 }
};
