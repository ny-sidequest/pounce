// Shared SVG paint servers (gradients + filters) for the rigs and the world. One hidden <svg> in the document, so any
// inline SVG (scene, posters, results art, serialized portraits) can reference url(#...). Not display:none (that breaks gradients).
const DEFS = `
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A0918"/><stop offset=".7" stop-color="#1E1943"/><stop offset="1" stop-color="#2B2457"/></linearGradient>
<linearGradient id="gCat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2D2759"/><stop offset=".5" stop-color="#0F0C22"/><stop offset="1" stop-color="#05040C"/></linearGradient>
<linearGradient id="rimCat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D2CDFA" stop-opacity=".95"/><stop offset=".45" stop-color="#8078CC" stop-opacity=".4"/><stop offset="1" stop-color="#8078CC" stop-opacity="0"/></linearGradient>
<linearGradient id="gScarf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF86BA"/><stop offset="1" stop-color="#D23578"/></linearGradient>
<linearGradient id="gScarf2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF2E88"/><stop offset="1" stop-color="#B72A68"/></linearGradient>
<linearGradient id="rimPink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD6E8" stop-opacity=".9"/><stop offset="1" stop-color="#FFD6E8" stop-opacity="0"/></linearGradient>
<linearGradient id="gCoat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5E49AC"/><stop offset="1" stop-color="#281C56"/></linearGradient>
<linearGradient id="rimCoat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D6CFFF" stop-opacity=".9"/><stop offset=".5" stop-color="#9C90E8" stop-opacity=".3"/><stop offset="1" stop-color="#9C90E8" stop-opacity="0"/></linearGradient>
<linearGradient id="gHat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3A3070"/><stop offset="1" stop-color="#0F0B20"/></linearGradient>
<linearGradient id="gFace" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A2142"/><stop offset="1" stop-color="#0E0A1C"/></linearGradient>
<linearGradient id="gSkin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0E0C6"/><stop offset="1" stop-color="#B79F82"/></linearGradient>
<linearGradient id="gMask" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6DC"/><stop offset="1" stop-color="#D7C497"/></linearGradient>
<radialGradient id="gSack" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#FFE59A"/><stop offset=".55" stop-color="#FFB238"/><stop offset="1" stop-color="#C46C10"/></radialGradient>
<radialGradient id="gGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFB238" stop-opacity=".6"/><stop offset="1" stop-color="#FFB238" stop-opacity="0"/></radialGradient>
<linearGradient id="gBin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8581B8"/><stop offset="1" stop-color="#3D3A6B"/></linearGradient>
<linearGradient id="gBld" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26224A"/><stop offset="1" stop-color="#15122E"/></linearGradient>
<linearGradient id="gSpot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE09A" stop-opacity=".0"/><stop offset="1" stop-color="#FFE09A" stop-opacity=".38"/></linearGradient>
<radialGradient id="gMoonGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F4E7C3" stop-opacity=".35"/><stop offset="1" stop-color="#F4E7C3" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="flash" x="-20%" y="-20%" width="140%" height="140%"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>

<radialGradient id="gHalo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFB238" stop-opacity=".5"/><stop offset=".55" stop-color="#FFB238" stop-opacity=".16"/><stop offset="1" stop-color="#FFB238" stop-opacity="0"/></radialGradient>
<linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B1838"/><stop offset="1" stop-color="#08070F"/></linearGradient>`;

export function ensureDefs() {
  if (typeof document === 'undefined' || document.getElementById('pounce-defs')) return;
  const holder = document.createElement('div');
  holder.innerHTML = `<svg id="pounce-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>${DEFS}</defs></svg>`;
  document.body.prepend(holder.firstElementChild);
}
