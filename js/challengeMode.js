// js/challengeMode.js

import { WordGame } from './gameCore.js';

(async function() {
  // 1) Grab DOM elements
  const wordBankElem     = document.getElementById('word-bank');
  const wordBankBoxElem  = document.getElementById('word-bank-box');
  const expandBtnElem    = document.getElementById('expand-btn');
  const checkmarkBtnElem = document.getElementById('checkmark-btn');
  const resetBtnElem     = document.getElementById('reset-btn');
  const timerDisplayElem = document.getElementById('timer-display');

  // 2) Helper: timer
  let timerId = null;
  function startTimer(seconds) {
    let remaining = seconds;
    timerDisplayElem.textContent = remaining;
    timerDisplayElem.style.display = 'block';
    timerId = setInterval(() => {
      remaining--;
      timerDisplayElem.textContent = remaining;
      if (remaining <= 0) handleGameOver('time');
    }, 1000);
  }

  // 3) Game over handler
  function handleGameOver(reason) {
    clearInterval(timerId);
    const msgs = {
      'one-letter': 'You must change exactly one letter.',
      invalid:      'That word is not in the list.',
      repeat:       'You already guessed that word.',
      'same-slot':  'Cannot change the same slot twice.',
      time:         "Time’s up!"
    };
    alert('Game over: ' + (msgs[reason] || reason));

    // lock all UI
    document.querySelectorAll('.letter-column').forEach(c => c.classList.add('locked'));
    checkmarkBtnElem.style.pointerEvents = 'none';
    resetBtnElem    .style.pointerEvents = 'none';
    expandBtnElem   .style.pointerEvents = 'none';
  }

  // 4) Create game instance
  const game = new WordGame({
    mode: 'challenge',
    onGameOver: handleGameOver
  });

  // 5) Load only wordlist + startingWords
  await game.loadLists({ includeDaily: false });

  // 6) Pick solution & init
  game.pickSolution();
  game.initColumns();

  // 7) Wire up shared UI
  game.registerWordBankUI({
    wordBankElem,
    wordBankBoxElem,
    expandBtnElem,
    maxCollapsed: 4
  });
  game.setupCheckmarkButton(checkmarkBtnElem);
  game.setupResetButton(resetBtnElem);

  // 8) Start the countdown
  startTimer(60);

})().catch(err => console.error('Challenge startup failed:', err));
