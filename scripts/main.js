import { Gallery } from './core.js';
import roseItem from './items/rose.js';
import kleinItem from './items/klein.js';
import creeperItem from './items/creeper.js';
import lightsaberItem from './items/lightsaber.js';

const gallery = new Gallery();
gallery.register(roseItem);
gallery.register(kleinItem);
gallery.register(creeperItem);
gallery.register(lightsaberItem);
gallery.start();
