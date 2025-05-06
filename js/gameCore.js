// js/gameCore.js

// Scroll & bounce settings
const WHEEL_SENSITIVITY    = 10;   // larger = need bigger wheel move to advance one letter
const BOUNCE_DELAY         = 50;   // ms to wait after wheel stops before bounce
const BOUNCE_DURATION      = 200;  // ms duration of bounce animation
const LETTER_CHANGE_FACTOR = 0.75; // fraction of slot height to trigger a letter change

export class WordGame {
  constructor({ mode, onGameOver }) {
    this.mode = mode;             // 'zen', 'challenge', 'daily', etc.
    this.onGameOver = onGameOver; // callback(reason)
    this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    this.valid = new Set();
    this.dailyList = [];
    this.starting = [];
    this.solution = '';
    this.prev = '';
    this.guessed = [];
    this.lastChangedIndex = null;
    this.isFirstTurn = true;
    this.columns = [];

    // UI elements (to be registered later)
    this.wordBankElem = null;
    this.wordBankBoxElem = null;
    this.expandBtnElem = null;
    this.checkmarkBtnElem = null;
    this.resetBtnElem = null;
    this.maxCollapsed = 4;
    this.onNewGuess = null;
  }

  // ------------------ Data Loading ------------------
  async loadLists({ includeDaily = false } = {}) {
    const fetches = [
      fetch('wordlist.txt').then(r => r.text()),
      fetch('startingWords.txt').then(r => r.text())
    ];
    if (includeDaily) {
      fetches.push(fetch('dailyWords.txt').then(r => r.text()));
    }
    const results = await Promise.all(fetches);

    this.valid = new Set(
      results[0].trim().split('\n').map(w => w.toUpperCase())
    );
    this.starting = results[1].trim().split('\n').map(w => w.toUpperCase());
    if (includeDaily) {
      this.dailyList = results[2].trim().split('\n').map(w => w.toUpperCase());
    }
  }

  // ------------------ Solution Selection ------------------
  pickSolution() {
    if (this.mode === 'daily') {
      const startDate = new Date('2025-01-01T00:00:00');
      const today = new Date();
      const dayIndex = Math.floor(
        (today - startDate) / (24 * 60 * 60 * 1000)
      );
      this.solution = this.dailyList[dayIndex % this.dailyList.length];
    } else {
      const validArr = Array.from(this.valid);
      this.solution = validArr[
        Math.floor(Math.random() * validArr.length)
      ];
    }
    this.prev = this.starting[
      Math.floor(Math.random() * this.starting.length)
    ];
    this.guessed = [this.prev];
    this.lastChangedIndex = null;
    this.isFirstTurn = true;
  }

  // ------------------ Column Setup ------------------
  initColumns() {
    this.columns = this.prev
      .split('')
      .map(ch => this.alphabet.indexOf(ch));
    document.querySelectorAll('.letter-column').forEach((col, idx) => {
      this.setupColumn(col, idx);
    });
  }

  setupColumn(columnEl, columnIndex) {
    let index = this.columns[columnIndex];
    const wrapper = document.createElement('div');
    wrapper.className = 'letter-wrapper';
    columnEl.innerHTML = '';
    columnEl.appendChild(wrapper);

    const slotH = columnEl.clientHeight / 3;
    const threshold = slotH * LETTER_CHANGE_FACTOR;
    let offset = 0;
    let isDragging = false;
    let startY = 0;
    let wheelTimer = null;

    const createLetterElement = (content, cls) => {
      const el = document.createElement('div');
      el.className = `letter ${cls}`;
      el.textContent = content;
      return el;
    };

    const updateLetters = () => {
      wrapper.innerHTML = '';
      wrapper.appendChild(
        createLetterElement(
          this.alphabet[(index - 1 + 26) % 26],
          'letter-above'
        )
      );
      wrapper.appendChild(
        createLetterElement(this.alphabet[index], 'active')
      );
      wrapper.appendChild(
        createLetterElement(
          this.alphabet[(index + 1) % 26],
          'letter-below'
        )
      );
      // highlight base letter
      if (index === this.columns[columnIndex]) {
        wrapper.querySelector('.active').classList.add('home-green');
      }
    };

    // initial render
    updateLetters();

    // --- Drag to scroll ---
    columnEl.addEventListener('mousedown', e => {
      if (columnEl.classList.contains('locked')) return;
      e.preventDefault();
      clearTimeout(wheelTimer);
      isDragging = true;
      startY = e.clientY;
      offset = 0;
      wrapper.style.transition = 'none';
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const delta = e.clientY - startY;
      offset += delta;
      wrapper.style.transform = `translateY(${offset}px)`;

      // change letter early once threshold passed
      while (offset > threshold) {
        index = (index - 1 + 26) % 26;
        updateLetters();
        offset -= slotH;
        wrapper.style.transform = `translateY(${offset}px)`;
      }
      while (offset < -threshold) {
        index = (index + 1) % 26;
        updateLetters();
        offset += slotH;
        wrapper.style.transform = `translateY(${offset}px)`;
      }
      startY = e.clientY;
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      this.columns[columnIndex] = index;
      // bounce back
      wrapper.style.transition = `transform ${BOUNCE_DURATION}ms ease-out`;
      wrapper.style.transform = 'translateY(0)';
      wrapper.addEventListener(
        'transitionend',
        function h(ev) {
          if (ev.propertyName !== 'transform') return;
          wrapper.removeEventListener('transitionend', h);
          offset = 0;
          updateLetters();
        },
        { once: true }
      );
    });

    // --- Wheel handler with sensitivity & bounce ---
    columnEl.addEventListener('wheel', e => {
      if (columnEl.classList.contains('locked')) return;
      e.preventDefault();
      clearTimeout(wheelTimer);
      wrapper.style.transition = 'none';

      offset += -e.deltaY / WHEEL_SENSITIVITY;
      wrapper.style.transform = `translateY(${offset}px)`;

      while (offset > threshold) {
        index = (index - 1 + 26) % 26;
        updateLetters();
        offset -= slotH;
        wrapper.style.transform = `translateY(${offset}px)`;
      }
      while (offset < -threshold) {
        index = (index + 1) % 26;
        updateLetters();
        offset += slotH;
        wrapper.style.transform = `translateY(${offset}px)`;
      }

      this.columns[columnIndex] = index;

      wheelTimer = setTimeout(() => {
        wrapper.style.transition = `transform ${BOUNCE_DURATION}ms ease-out`;
        wrapper.style.transform = 'translateY(0)';
        wrapper.addEventListener(
          'transitionend',
          function h(ev) {
            if (ev.propertyName !== 'transform') return;
            wrapper.removeEventListener('transitionend', h);
            offset = 0;
            updateLetters();
          },
          { once: true }
        );
      }, BOUNCE_DELAY);
    });
  }

  // ------------------ Guess Handling ------------------
  getCurrentGuess() {
    return this.columns.map(i => this.alphabet[i]).join('');
  }

  validateGuess() {
    const guess = this.getCurrentGuess();
    const diffs = [];
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] !== this.prev[i]) diffs.push(i);
    }
    if (diffs.length !== 1) return { ok: false, reason: 'one-letter' };
    const changedIdx = diffs[0];
    if (!this.valid.has(guess)) return { ok: false, reason: 'invalid' };
    if (this.guessed.includes(guess)) return { ok: false, reason: 'repeat' };
    if (!this.isFirstTurn && changedIdx === this.lastChangedIndex)
      return { ok: false, reason: 'same-slot' };
    return { ok: true, changed: changedIdx };
  }

  submitGuess() {
    const check = this.validateGuess();
    if (!check.ok) {
      if (this.mode === 'challenge') {
        this.onGameOver(check.reason);
        return;
      }
      const msgs = {
        'one-letter': 'Change exactly one letter.',
        invalid:      'Not in word list.',
        repeat:       'Already guessed.',
        'same-slot':  'Cannot change same slot twice.'
      };
      alert(msgs[check.reason]);
      this.revert();
      return;
    }
    const changedIdx = check.changed;
    this.lockColumn(changedIdx);

    const guess = this.getCurrentGuess();
    this.guessed.push(guess);
    this.prev = guess;
    this.lastChangedIndex = changedIdx;
    this.isFirstTurn = false;

    if (this.onNewGuess) this.onNewGuess(guess);
  }

  revert() {
    this.columns = this.prev
      .split('')
      .map(ch => this.alphabet.indexOf(ch));
    document.querySelectorAll('.letter-column').forEach((col, i) => {
      const wrapper = col.querySelector('.letter-wrapper');
      const letters = wrapper.querySelectorAll('.letter');
      const idx = this.columns[i];
      letters[0].textContent = this.alphabet[(idx - 1 + 26) % 26];
      letters[1].textContent = this.alphabet[idx];
      letters[2].textContent = this.alphabet[(idx + 1) % 26];
      letters.forEach((l, j) => {
        l.className = 'letter';
        if (j === 0) l.classList.add('letter-above');
        if (j === 1) l.classList.add('active');
        if (j === 2) l.classList.add('letter-below');
      });
    });
  }

  lockColumn(idx) {
    document.querySelectorAll('.letter-column').forEach((col, i) => {
      col.classList.remove('locked', 'last-used');
      if (i === idx) col.classList.add('locked', 'last-used');
    });
  }

  // ------------------ UI Registration ------------------
  registerWordBankUI({ wordBankElem, wordBankBoxElem, expandBtnElem, maxCollapsed = 4 }) {
    this.wordBankElem = wordBankElem;
    this.wordBankBoxElem = wordBankBoxElem;
    this.expandBtnElem = expandBtnElem;
    this.maxCollapsed = maxCollapsed;

    this.updateWordBankDisplay = () => {
      const boxes = this.wordBankElem.querySelectorAll('.word-box');
      const showAll = this.wordBankBoxElem.classList.contains('expanded');
      boxes.forEach((box, i) => {
        box.style.display = showAll || i < this.maxCollapsed ? 'flex' : 'none';
      });
    };

    this.addToWordBankDOM = word => {
      const box = document.createElement('div');
      box.className = 'word-box';
      box.textContent = word;
      this.wordBankElem.insertBefore(box, this.wordBankElem.firstChild);
      this.updateWordBankDisplay();
    };

    this.onNewGuess = this.addToWordBankDOM;

    this.expandBtnElem.addEventListener('click', () => {
      this.wordBankBoxElem.classList.toggle('expanded');
      this.expandBtnElem.classList.toggle('expanded');
      this.updateWordBankDisplay();
    });

    this.guessed.forEach(w => this.addToWordBankDOM(w));
  }

  setupCheckmarkButton(btnElem) {
    this.checkmarkBtnElem = btnElem;
    btnElem.addEventListener('click', () => this.submitGuess());
  }

  setupResetButton(btnElem) {
    this.resetBtnElem = btnElem;
    btnElem.addEventListener('click', () => this.revert());
  }
}
