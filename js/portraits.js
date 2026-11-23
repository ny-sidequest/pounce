// Sprite frames as <img> / <image> markup for posters, cards and results art.
import { frameURL } from './sprites.js';

export const spriteImg = (sprite, name, i, height, cls = '') =>
  `<img class="spr ${cls}" alt="" src="${frameURL(sprite, name, i, 4)}" height="${height}">`;

/** an <image> for an SVG scene: size is sprite pixels * scale */
export const svgSprite = (sprite, name, i, x, y, scale) =>
  `<image href="${frameURL(sprite, name, i, 4)}" x="${x}" y="${y}" width="${sprite.size[0] * scale}" height="${sprite.size[1] * scale}" style="image-rendering:pixelated"/>`;
