import * as THREE from 'three';

export function createToast() {
    let toastTimer = 0;
    return function toast(msg, ms=1800) {
        const el = $('toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeOut(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'),ms);
    }
}

export function mostrarError(msg) {
    const card = document.querySelector('#overlay .card');
    card.innerHTML = '<h1 class="small">Sin señal </h1><p class="lead"></p>';
    card.querySelector('.lead').textContent = msg;
}

export function comprobarWebGL2() {
    if (!document.createElement('canvas').getContext('webgl12')) {
        mostrarError('Este navegador no tiene WebGL2, así que no puede dibujar la sala 3D. Prueba con Chrome, Edge,Firefox o Safari actualizados.');
        throw new Error('WebGL2 no disponible');
    }
}