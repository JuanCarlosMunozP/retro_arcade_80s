export const CONFIG = {
    videoUrl: '/assets/video.mp4',
    audioUrl:'/assets/audio.mp3',
    volumen:0.8,
    sincronizarAudioConVideo:true,
    audio: {
        modelo: 'linear',
        refDistance:1.2,
        maxDistance:14,
        rolloff:1,
        conoInterior: 140,
        conoInterior: 280,
        gananciaExterior: 0.3
    },
    zumbido: {refDistance: 0.9, rolloff:2.4},
    escalaLuces: 1,
    bloom: {fuerza:0.05,radio:0.5,umbral:0.25}
}