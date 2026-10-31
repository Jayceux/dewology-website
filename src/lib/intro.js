// Decides, before the page first paints, whether the intro plays.
//  - Plays once per visit (not again on refresh in the same tab)
//  - Never plays for people who turned on "reduce motion"
//  - Add ?intro to the address to force it (handy when presenting)

const KEY = 'dewology-intro-seen';

export function decideIntro() {
  let mode = 'play';
  try {
    const force = new URLSearchParams(window.location.search).has('intro');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seen = window.sessionStorage.getItem(KEY) === '1';
    if (reduce) mode = 'off';
    else if (force) mode = 'play';
    else if (seen) mode = 'off';
  } catch {
    mode = 'off';
  }
  document.documentElement.dataset.intro = mode;
  return mode;
}

export function markIntroSeen() {
  try {
    window.sessionStorage.setItem(KEY, '1');
  } catch {
    /* private mode: ignore */
  }
  document.documentElement.dataset.intro = 'done';
}
