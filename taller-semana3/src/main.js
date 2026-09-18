import { comprobarWebGL2, createToast } from "./core/utils";
import {crearEscena} from './core/setup.js';

comprobarWebGL2();

const toast = createToast();
let syncUI = () => {};

const escena = crearEscena();
const {scene,camera,renderer, composer, controls,envMats, MAX_PR,ponerPR} = escena;