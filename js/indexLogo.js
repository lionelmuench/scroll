// js/indexLogo.js

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const TARGET = 'SCROLLIT';
const baseIndices = TARGET.split('').map(ch => alphabet.indexOf(ch));

// Wheel sensitivity: larger means you need to scroll more to advance one letter
const WHEEL_SENSITIVITY = 10;

document.querySelectorAll('.letter-column').forEach((column, colIdx) => {
  let index = baseIndices[colIdx];
  let dragging = false;
  let startY = 0;
  let offset = 0;
  let wheelTimer = null;

  // Build the wrapper and initial letters
  const wrapper = document.createElement('div');
  wrapper.className = 'letter-wrapper';
  column.innerHTML = '';
  column.appendChild(wrapper);

  const createLetterElement = (content, cls) => {
    const el = document.createElement('div');
    el.className = `letter ${cls}`;
    el.textContent = content;
    return el;
  };

  wrapper.appendChild(createLetterElement(alphabet[(index - 1 + 26) % 26], 'letter-above'));
  wrapper.appendChild(createLetterElement(alphabet[index], 'active'));
  wrapper.appendChild(createLetterElement(alphabet[(index + 1) % 26], 'letter-below'));

  const slotH = column.clientHeight / 3;

  function updateLetters() {
    const letters = wrapper.querySelectorAll('.letter');
    letters[0].textContent = alphabet[(index - 1 + 26) % 26];
    letters[1].textContent = alphabet[index];
    letters[2].textContent = alphabet[(index + 1) % 26];
    letters.forEach((l, i) => {
      l.className = 'letter';
      if (i === 0) l.classList.add('letter-above');
      if (i === 1) {
        l.classList.add('active');
        if (index === baseIndices[colIdx]) l.classList.add('home-green');
      }
      if (i === 2) l.classList.add('letter-below');
    });
  }

  // Bounce-back: animate step-by-step back to the base letter
  function bounceBack() {
    // Calculate shortest distance back
    let diff = (baseIndices[colIdx] - index + 26) % 26;
    if (diff > 13) diff -= 26;
    const steps = Math.abs(diff);
    const stepDir = diff > 0 ? 1 : -1;
    animateBackSteps(steps, stepDir);
  }

  function animateBackSteps(stepsRemaining, dir) {
    if (stepsRemaining === 0) {
      // final settle (in case wrapper was offset)
      wrapper.style.transition = 'transform 0.15s ease';
      wrapper.style.transform = 'translateY(0)';
      index = baseIndices[colIdx];
      updateLetters();
      return;
    }
    // Animate one letter scroll
    wrapper.style.transition = 'transform 0.15s ease';
    wrapper.style.transform = `translateY(${-dir * slotH}px)`;
    wrapper.addEventListener('transitionend', function handler(e) {
      if (e.propertyName !== 'transform') return;
      wrapper.removeEventListener('transitionend', handler);
      // Update the letter
      index = (index + dir + 26) % 26;
      updateLetters();
      // Reset position
      wrapper.style.transition = 'none';
      wrapper.style.transform = 'translateY(0)';
      // Next letter after a short pause
      setTimeout(() => animateBackSteps(stepsRemaining - 1, dir), 0);
    });
  }

  // WHEEL: natural direction, low sensitivity
  column.addEventListener('wheel', e => {
    e.preventDefault();
    clearTimeout(wheelTimer);
    wrapper.style.transition = 'none';

    // Inverted so scroll-down → next letter
    offset += -e.deltaY / WHEEL_SENSITIVITY;
    wrapper.style.transform = `translateY(${offset}px)`;

    // Change letters past the slot threshold
    while (offset > slotH) {
      index = (index - 1 + 26) % 26;
      updateLetters();
      offset -= slotH;
      wrapper.style.transform = `translateY(${offset}px)`;
    }
    while (offset < -slotH) {
      index = (index + 1) % 26;
      updateLetters();
      offset += slotH;
      wrapper.style.transform = `translateY(${offset}px)`;
    }

    // Bounce back 200ms after last scroll
    wheelTimer = setTimeout(bounceBack, 200);
  });

  // DRAG start
  column.addEventListener('mousedown', e => {
    e.preventDefault();
    clearTimeout(wheelTimer);
    dragging = true;
    startY = e.clientY;
    offset = 0;
    wrapper.style.transition = 'none';
  });

  // DRAG move
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = e.clientY - startY;
    offset += delta;
    wrapper.style.transform = `translateY(${offset}px)`;

    if (offset > slotH) {
      index = (index - 1 + 26) % 26;
      updateLetters();
      offset -= slotH;
      wrapper.style.transform = `translateY(${offset}px)`;
    } else if (offset < -slotH) {
      index = (index + 1) % 26;
      updateLetters();
      offset += slotH;
      wrapper.style.transform = `translateY(${offset}px)`;
    }

    startY = e.clientY;
  });

  // DRAG end
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    bounceBack();
  });

  // Initial render
  updateLetters();
});
