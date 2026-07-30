import { Gallery } from './core.js';
import roseItem from './items/rose.js';
import creeperItem from './items/creeper.js';
import su7Item from './items/su7.js';
import j20Item from './items/j20.js';

const gallery = new Gallery();
gallery.register(roseItem);
gallery.register(creeperItem);
gallery.register(su7Item);
gallery.register(j20Item);
gallery.start();
