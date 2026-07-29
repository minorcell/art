import { Gallery } from './core.js';
import roseItem from './items/rose.js';
import kleinItem from './items/klein.js';

const gallery = new Gallery();
gallery.register(roseItem);
gallery.register(kleinItem);
gallery.start();
