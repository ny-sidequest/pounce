// Every animated moment as a TIMELINE: an array of steps, each with a duration (ms) and an action.
// Rules: the camera settles first, then a character acts (anticipation -> action -> reaction, with short holds).
// The question timer is held (paused) by the game for as long as any sequence or card is on screen.
// Tune the beats here: all durations live in T and in each step's `dur`.
import { reducedMotion } from './fx.js';

export const T = {
  lamp: 250, alert: 250, droop: 300, glance: 400, camClose: 350, hop: 400,
  camFrame: 350, anticipation: 500, leapCatch: 400, leapFall: 350, impact: 120,
  reaction: 300, loot: 300, unmask: 600, reveal: 400, plate: 300,
  realize: 250, drop: 450, binReaction: 400, camRoof: 250, hatTip: 250, thiefRun: 650, camBack: 300
};

const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? Math.min(ms, 40) : ms));

/** Run steps one after another. Each step runs its action AND lasts at least `dur` ms. */
export async function runTimeline(steps, ctx) {
  for (const s of steps) {
    if (ctx.cancelled?.()) return;
    if (typeof window !== 'undefined' && window.__beat) await window.__beat(s.name); // test hook: pause at the start of each beat
    await Promise.all([Promise.resolve(s.run?.(ctx)), wait(s.dur ?? 0)]);
  }
}

/* --------------------------------------------------------------- a clue resolves */
/**
 * kind: 'chase' (hop to roof `hopTo`, or none on clue 1), 'foot' (walk to `footStep`), 'caught' (cat sits tight)
 */
export function clueSequence({ idx, missed, kind, hopTo = null, footStep = 0 }) {
  const steps = [
    { name: 'lantern', dur: T.lamp, run: ({ scene }) => scene.lamp(idx, missed) },
    missed
      ? { name: 'ears droop', dur: T.droop, run: ({ scene }) => { if (kind !== 'caught') scene.catAnim('droop'); } }
      : { name: 'cat alert', dur: T.alert, run: ({ scene }) => { if (kind !== 'caught') scene.catAnim('alert'); } }
  ];
  if (kind === 'chase') {
    // the thief glances back (a shrug when the clue was missed)
    steps.push({ name: 'thief glance', dur: T.glance, run: ({ scene }) => scene.thiefAnim('glance') });
    steps.push({ name: 'thief resumes', dur: 0, run: ({ scene }) => scene.thiefAnim('sneak') });
    if (hopTo !== null) {
      // the camera settles first, THEN the cat hops
      steps.push({ name: 'camera closer', dur: T.camClose, run: ({ scene }) => { scene.setRoof(hopTo); return scene.frame('chase', T.camClose); } });
      steps.push({
        name: 'cat hops', dur: T.hop,
        run: async ({ scene }) => {
          const to = scene.geo.roofCat(hopTo);
          scene.catAnim('hop');
          await scene.catArc(to.x, to.y, T.hop, 20, 4);
          scene.setGapRoof(hopTo, true);   // the gap label updates
          scene.catAnim('idle');
        }
      });
    } else steps.push({ name: 'settle', dur: 0, run: ({ scene }) => scene.catAnim('idle') });
  } else if (kind === 'foot') {
    steps.push({ name: 'cat follows on foot', dur: 560, run: ({ scene }) => scene.walkTo(footStep, true) });
  }
  return steps;
}

/* --------------------------------------------------------------------- the catch */
/** ui: { showPlate(), waitForTap() } provided by the game (the plate is DOM). */
export function catchSequence() {
  return [
    { name: 'camera', dur: T.camFrame, run: ({ scene }) => { scene.dim(true); scene.setReserve(scene.sceneEl.clientWidth >= 900 ? 216 : 0); return scene.frame('chase', T.camFrame); } },
    { name: 'anticipation', dur: T.anticipation, run: ({ scene }) => { scene.catAnim('crouch'); scene.thiefAnim('spooked'); } },
    {
      name: 'leap', dur: T.leapCatch,
      run: async ({ scene }) => {
        const from = scene.geo.cat();
        const to = scene.geo.impact();
        scene.hideGap();
        scene.catAnim('leap');
        scene.speedLines(from.x, from.y, to.x, to.y, T.leapCatch, 48);
        await scene.catArc(to.x, to.y, T.leapCatch, 48, 8);
      }
    },
    {
      name: 'impact (hit-stop)', dur: T.impact,
      run: ({ scene }) => {
        const at = scene.geo.impact();
        scene.pausePlayers();
        scene.flash();
        scene.dust(at.x + 50, at.y + 36, 12);
        scene.shake(4);
        setTimeout(() => scene.resumePlayers(), T.impact);
      }
    },
    {
      name: 'reaction', dur: T.reaction,
      run: async ({ scene }) => {
        await scene.frame('thief', 250);              // camera settles on the pair first
        scene.thiefAnim('stagger');
        scene.catAnim('land');
        const hat = scene.geo.hat();
        await scene.catArc(hat.x, hat.y, 250, 20, 6); // the cat lands on top
      }
    },
    { name: 'loot', dur: T.loot, run: ({ scene }) => scene.thiefAnim('sack_drop') },
    {
      name: 'unmask', dur: T.unmask,
      run: async ({ scene }) => {
        scene.catAnim('swat');
        await new Promise((r) => setTimeout(r, 150));
        await scene.maskFly(T.unmask - 150);
      }
    },
    { name: 'reveal', dur: T.reveal, run: ({ scene }) => { scene.spotlight(true); scene.thiefAnim('unmasked'); } },
    { name: 'name plate', dur: T.plate, run: ({ ui }) => ui.showPlate() },
    {
      name: 'hold until tap', dur: 0,
      run: async ({ scene, ui }) => {
        scene.catAnim('sit_smug');
        scene.thiefAnim('tied');
        scene.thiefGlow(false);
        const tied = scene.geo.tiedHat();
        scene.catArc(tied.x, tied.y, 160, 10, 3);
        await ui.waitForTap();
        scene.spotlight(false);
      }
    }
  ];
}

/* ---------------------------------------------------------------------- the fall */
export function fallSequence(state = {}) {
  return [
    { name: 'camera', dur: T.camFrame, run: ({ scene }) => scene.frame('chase', T.camFrame) },
    { name: 'anticipation', dur: T.anticipation, run: ({ scene }) => { scene.catAnim('crouch'); scene.thiefAnim('spooked'); } },
    {
      name: 'leap (falls short)', dur: T.leapFall,
      run: async ({ scene }) => {
        const bi = scene.geo.nearestBin(scene.geo.reach(0.62));
        state.bi = bi;
        const bin = scene.geo.bin(bi);
        scene.hideGap();
        scene.catAnim('leap');
        await scene.catArc(bin.x, scene.geo.cat().y + 6, T.leapFall, 14, 7); // a lower arc that visibly falls short
      }
    },
    { name: 'realisation (freeze)', dur: T.realize, run: ({ scene }) => scene.catAnim('realize') },
    {
      name: 'drop', dur: T.drop,
      run: async ({ scene }) => {
        const bin = scene.geo.bin(state.bi);
        scene.catAnim('fall');
        // here the camera follows the cat down to the street (the one deliberate exception to "one thing at a time")
        await Promise.all([scene.frame('fall', T.drop), scene.catDrop(bin.y - 8, T.drop)]);
      }
    },
    {
      name: 'impact (hit-stop)', dur: T.impact,
      run: ({ scene, sfx }) => {
        const bin = scene.geo.bin(state.bi);
        scene.pausePlayers();
        scene.shake(6);
        scene.dust(bin.x + 20, bin.y + 36, 14);
        scene.lidFly(state.bi);
        scene.binsShake();
        scene.clatter(bin.x + 29);
        sfx?.clatter();
        setTimeout(() => scene.resumePlayers(), T.impact);
      }
    },
    {
      name: 'reaction', dur: T.binReaction,
      run: ({ scene }) => {
        const bin = scene.geo.bin(state.bi);
        scene.hideBin(state.bi);
        scene.placeCat(bin.x, bin.y);
        scene.catAnim('bin');
      }
    },
    {
      name: 'thief exit', dur: 0,
      run: async ({ scene }) => {
        await scene.frame('rooftop', T.camRoof);                   // the camera pans up to the roof
        await scene.thiefAsync('hat_tip');
        await scene.thiefRun(T.thiefRun);                          // runs off; its glow leaves with it
      }
    },
    { name: 'camera back down', dur: T.camBack, run: ({ scene }) => scene.frame('fall', T.camBack) },
    { name: 'card', dur: 0, run: ({ ui }) => ui.showCard() }
  ];
}

/* ------------------------------------------------------------------ never pounced */
export function letGoSequence() {
  return [
    { name: 'cat sits down (scaredy)', dur: 300, run: ({ scene }) => scene.catAnim('title_scaredy') },
    { name: 'thief tips hat', dur: T.hatTip + 100, run: ({ scene }) => scene.thiefAsync('hat_tip') },
    { name: 'thief runs', dur: 0, run: ({ scene }) => scene.thiefRun(700) }
  ];
}
