// The night's screen mode as ONE state machine: question -> story -> decision -> (ready) -> question ...
// The clue timer and the keyboard both follow the mode, so nothing else needs its own flags. Pure, so it is tested.
//   question  the clue is visible and accepting input (keyboard open on phones)
//   story     the scene plays a beat (full screen on phones)
//   decision  the scene stays on top; a card below asks pounce or creep closer (also the heads-up and end cards)
//   ready     "Ready for the next clue?" card: the question stays hidden until a tap
export const MODES = ['question', 'story', 'decision', 'ready'];

const ALLOWED = {
  question: ['story'],
  story: ['story', 'decision', 'ready', 'question'],
  decision: ['decision', 'story', 'ready', 'question'],
  ready: ['question']
};

export const canGo = (from, to) => from === null || from === to || (ALLOWED[from] || []).includes(to);

/** The clue clock runs only while the question is visible, and never while a sequence/card holds it or the tab is hidden. */
export const timerRuns = ({ mode, hidden = false, busy = false }) => mode === 'question' && !hidden && !busy;

/** Only question mode wants the keyboard. */
export const wantsKeyboard = (mode) => mode === 'question';

export function createFlow(onChange = () => {}) {
  let mode = null;
  return {
    get mode() { return mode; },
    go(next) {
      if (!MODES.includes(next)) throw new Error('unknown mode ' + next);
      if (!canGo(mode, next)) throw new Error(`illegal mode change ${mode} -> ${next}`);
      const prev = mode;
      mode = next;
      if (prev !== next) onChange(next, prev);
      return mode;
    },
    is: (m) => mode === m
  };
}
