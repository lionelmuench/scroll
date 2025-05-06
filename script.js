const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const wordBank = document.getElementById('word-bank');
const wordBankBox = document.getElementById('word-bank-box');
const expandBtn = document.getElementById('expand-btn');
const checkmarkBtn = document.getElementById('checkmark-btn');

let guessedWords = ['GAME'];
let previousGuess = 'GAME';
let lastChangedIndex = null;
let isFirstTurn = true;
let validWords = new Set();

const columnPositions = [
  alphabet.indexOf('G'),
  alphabet.indexOf('A'),
  alphabet.indexOf('M'),
  alphabet.indexOf('E'),
];

addToWordBank('GAME');

async function loadWordList() {
  const response = await fetch('wordlist.txt');
  const text = await response.text();
  validWords = new Set(
    text.trim().split('\n').map((w) => w.trim().toUpperCase())
  );
}
loadWordList();

function updateWordBankDisplay() {
  const allBoxes = wordBank.querySelectorAll('.word-box');
  const showAll = wordBankBox.classList.contains('expanded');
  allBoxes.forEach((box, i) => {
    box.style.display = showAll || i < 4 ? 'flex' : 'none';
  });
}

function addToWordBank(word) {
  const wordBox = document.createElement('div');
  wordBox.classList.add('word-box');
  wordBox.textContent = word;
  // push newest to the left
  wordBank.insertBefore(wordBox, wordBank.firstChild);
  updateWordBankDisplay();
}

expandBtn.addEventListener('click', () => {
  wordBankBox.classList.toggle('expanded');
  expandBtn.classList.toggle('expanded');
  updateWordBankDisplay();
});

function getSelectedWord() {
  return Array.from(
    document.querySelectorAll('.letter.active')
  )
    .map((el) => el.textContent)
    .join('');
}

checkmarkBtn.addEventListener('click', () => {
  const newWord = getSelectedWord();
  const diffs = [...newWord].reduce((acc, ch, i) => {
    if (ch !== previousGuess[i]) acc.push(i);
    return acc;
  }, []);

  // 1) exactly one letter changed?
  if (diffs.length !== 1) {
    alert('❌ You must change exactly one letter.');
    revertToLastLegalState();
    return;
  }
  const changedIndex = diffs[0];

  // 2) valid word?
  if (!validWords.has(newWord)) {
    alert('❌ Invalid word! This word is not in the word list.');
    revertToLastLegalState();
    return;
  }

  // 3) not already guessed
  if (guessedWords.includes(newWord)) {
    alert('❌ You already guessed this word.');
    revertToLastLegalState();
    return;
  }

  // 4) not same slot twice
  if (!isFirstTurn && changedIndex === lastChangedIndex) {
    alert('❌ You cannot change the same letter slot twice in a row.');
    revertToLastLegalState();
    return;
  }

  // Visual feedback: lock and highlight only the changed column
  document.querySelectorAll('.letter-column').forEach((col, idx) => {
    col.classList.remove('locked', 'last-used');
    if (idx === changedIndex) col.classList.add('locked', 'last-used');
  });

  // update state
  guessedWords.push(newWord);
  previousGuess = newWord;
  lastChangedIndex = changedIndex;
  isFirstTurn = false;
  columnPositions[changedIndex] = alphabet.indexOf(newWord[changedIndex]);
  addToWordBank(newWord);
});

function revertToLastLegalState() {
  document.querySelectorAll('.letter-column').forEach((col, i) => {
    const wrapper = col.querySelector('.letter-wrapper');
    const active = wrapper.querySelector('.letter.active');
    active.textContent = previousGuess[i];
    columnPositions[i] = alphabet.indexOf(previousGuess[i]);
  });
}

document.querySelectorAll('.letter-column').forEach((column, colIdx) => {
  let index = columnPositions[colIdx];

  function createLetterElement(content, cls) {
    const d = document.createElement('div');
    d.className = `letter ${cls}`;
    d.textContent = content;
    return d;
  }

  column.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'letter-wrapper';
  column.appendChild(wrapper);

  wrapper.appendChild(
    createLetterElement(alphabet[(index - 1 + 26) % 26], 'letter-above')
  );
  wrapper.appendChild(createLetterElement(alphabet[index], 'active'));
  wrapper.appendChild(
    createLetterElement(alphabet[(index + 1) % 26], 'letter-below')
  );

  function updateLetters() {
    const letters = wrapper.querySelectorAll('.letter');
    letters[0].textContent = alphabet[(index - 1 + 26) % 26];
    letters[1].textContent = alphabet[index];
    letters[2].textContent = alphabet[(index + 1) % 26];
    letters.forEach((l, i) => {
      l.className = 'letter';
      if (i === 0) l.classList.add('letter-above');
      if (i === 1) l.classList.add('active');
      if (i === 2) l.classList.add('letter-below');
    });
  }

  let startY = 0,
    offset = 0,
    dragging = false;

  column.addEventListener('mousedown', (e) => {
    if (column.classList.contains('locked')) return;
    dragging = true;
    startY = e.clientY;
    column.style.transition = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const delta = e.clientY - startY;
    offset += delta;
    wrapper.style.transform = `translateY(${offset}px)`;
    if (offset > 30) {
      index = (index - 1 + 26) % 26;
      updateLetters();
      offset -= 60;
    } else if (offset < -30) {
      index = (index + 1) % 26;
      updateLetters();
      offset += 60;
    }
    startY = e.clientY;
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    column.style.transition = 'transform 0.3s ease-out';
    offset = 0;
    wrapper.style.transform = `translateY(0)`;
    updateLetters();
    columnPositions[colIdx] = index;
  });

  column.addEventListener('wheel', (e) => {
    if (column.classList.contains('locked')) return;
    column.style.transition = 'transform 0.3s ease-out';
    index = e.deltaY > 0 ? (index + 1) % 26 : (index - 1 + 26) % 26;
    updateLetters();
    columnPositions[colIdx] = index;
  });

  updateLetters();
});
