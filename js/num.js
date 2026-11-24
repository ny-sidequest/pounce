// Audiowide draws a slashed zero, which reads as "no / empty". A score of exactly 0 is shown as a plain digit instead.
import { formatNumber } from './engine.js';
export const numHTML = (n) => (Number(n) === 0 ? '<span class="z0">0</span>' : formatNumber(n));
