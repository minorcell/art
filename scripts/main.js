import { Gallery } from './Gallery.js';
import { Rose } from './items/rose.js';
import { Creeper } from './items/creeper.js';
import { Car } from './items/car.js';
import { J20 } from './items/j20.js';
import { Skeleton } from './items/skeleton.js';

const gallery = new Gallery();
gallery.register(Rose);
gallery.register(Creeper);
gallery.register(Car);
gallery.register(J20);
gallery.register(Skeleton);
gallery.start();
