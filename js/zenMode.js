// js/zenMode.js

import { WordGame } from './gameCore.js';

(async function() {
  // 1) Grab DOM elements
  const wordBankElem    = document.getElementById('word-bank');
  const wordBankBoxElem = document.getElementById('word-bank-box');
  const expandBtnElem   = document.getElementById('expand-btn');
  const checkmarkBtnElem= document.getElementById('checkmark-btn');
  const resetBtnElem    = document.getElementById('reset-btn');

  // 2) Create game instance
  const game = new WordGame({
    mode: 'zen',
    onGameOver: () => {
      /* never called in Zen mode */
    }
  });

  // 3) Load only what Zen needs (wordlist + startingWords)
  await game.loadLists({ includeDaily: false });

  // 4) Pick a random solution and initial word, then build columns
  game.pickSolution();
  game.initColumns();

  // 5) Wire up all shared UI
  game.registerWordBankUI({
    wordBankElem,
    wordBankBoxElem,
    expandBtnElem,
    maxCollapsed: 4
  });
  game.setupCheckmarkButton(checkmarkBtnElem);
  game.setupResetButton(resetBtnElem);

  // 6) Done
})().catch(err => console.error('Zen startup failed:', err));
