/* ===== Reading Section — app.js ===== */
/* Logic: TTS, word highlighting, image carousel, tooltips, navigation */

(function(){
'use strict';

/* ---- Navigation: Category Menu ---- */
const catGrid = document.getElementById('catGrid');
const catView = document.getElementById('catView');
const readingListView = document.getElementById('readingListView');
const readingListContainer = document.getElementById('readingListContainer');
const listTitle = document.getElementById('listTitle');
const listBadge = document.getElementById('listBadge');
const listLevel = document.getElementById('listLevel');

let currentCategoryData = null;
const completedReadings = JSON.parse(localStorage.getItem('readingCompleted') || '[]');

if (catGrid) {
  catGrid.addEventListener('click', async (e) => {
    const card = e.target.closest('.cat-card');
    if (!card) return;
    const cat = card.dataset.category;
    const jsonFile = `data/${cat}.json`;
    try {
      const res = await fetch(jsonFile);
      currentCategoryData = await res.json();
      showReadingList(currentCategoryData);
    } catch(err) {
      alert('Error loading category: ' + err.message);
    }
  });
}

function showReadingList(data) {
  catView.style.display = 'none';
  readingListView.classList.add('active');
  listBadge.textContent = data.categoryIcon || '📖';
  listTitle.textContent = data.categoryName;
  listLevel.textContent = `Level: ${data.level || 'A1'}`;
  readingListContainer.innerHTML = data.readings.map((r, i) => {
    const done = completedReadings.includes(r.id) ? '<span class="ri-done">✓</span>' : '';
    const wordCount = r.words ? r.words.length : (r.paragraphs ? r.paragraphs.join(' ').split(/\s+/).length : 0);
    const thumb = (r.images && r.images[0]) ? r.images[0] : (data.coverSVG || '');
    return `<a class="reading-item" href="reader.html?id=${r.id}&cat=${data.category}">
      <div class="ri-thumb">${thumb}</div>
      <div class="ri-info">
        <h4>${r.title}</h4>
        <p>${wordCount} words · ${r.paragraphs.length} paragraphs</p>
      </div>
      ${done}
    </a>`;
  }).join('');
}

// Back from reading list to categories
const backToCats = document.getElementById('backToCats');
if (backToCats) {
  backToCats.addEventListener('click', () => {
    readingListView.classList.remove('active');
    catView.style.display = 'block';
  });
}

/* ---- Reader (reader.html) ---- */
const readerContainer = document.getElementById('readerContainer');
if (readerContainer) {
  initReader();
}

function initReader() {
  const params = new URLSearchParams(window.location.search);
  const readingId = params.get('id');
  const cat = params.get('cat');

  if (!readingId || !cat) {
    readerContainer.innerHTML = '<div class="reader-loading"><p>⚠️ No reading specified. <a href="index.html">Go back</a></p></div>';
    return;
  }

  const hasSpeech = 'speechSynthesis' in window;
  let data = null;
  let reading = null;
  let utterance = null;
  let isPlaying = false;
  let isPaused = false;
  let currentRate = 1.0;
  let currentParagraphIndex = 0;
  let wordSpans = [];
  let voices = [];

  // Load voices
  function loadVoices() {
    voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  }
  if (hasSpeech) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function pickVoice() {
    // Prefer female voices for kids' content
    const preferred = voices.find(v => /female|samantha|zira|google us english/i.test(v.name));
    return preferred || voices[0] || null;
  }

  // Fetch data
  fetch(`data/${cat}.json`)
    .then(res => res.json())
    .then(json => {
      data = json;
      reading = json.readings.find(r => r.id === readingId);
      if (!reading) throw new Error('Reading not found: ' + readingId);
      renderReader();
    })
    .catch(err => {
      readerContainer.innerHTML = `<div class="reader-loading"><p>⚠️ ${err.message}</p><p><a href="index.html">Go back</a></p></div>`;
    });

  function renderReader() {
    // Top bar
    document.getElementById('rtbTitle').textContent = reading.title;
    document.getElementById('rtbCat').textContent = data.categoryName;
    document.getElementById('rtbCat').style.background = 'rgba(0,180,166,.2)';
    document.getElementById('rtbCat').style.color = 'var(--teal)';

    // No speech fallback
    if (!hasSpeech) {
      const ns = document.getElementById('noSpeech');
      if (ns) ns.style.display = 'block';
    }

    // Image area — render first image + dots
    const imgArea = document.getElementById('readerImageArea');
    const imgDots = document.getElementById('imgDots');
    renderImage(0);

    function renderImage(idx) {
      const svgs = reading.images || [];
      const svg = svgs[idx] || svgs[0] || '';
      // Fade animation by replacing content
      imgArea.innerHTML = svg + '<div class="img-progress" id="imgDots"></div>';
      const dotsContainer = document.getElementById('imgDots');
      const total = svgs.length || 1;
      dotsContainer.innerHTML = Array.from({length: total}, (_, i) =>
        `<div class="img-dot ${i === idx ? 'active' : ''}"></div>`
      ).join('');
    }

    // Text area — render paragraphs with word spans
    const textArea = document.getElementById('readerTextArea');
    textArea.innerHTML = '';
    wordSpans = [];

    reading.paragraphs.forEach((para, pIdx) => {
      const pDiv = document.createElement('div');
      pDiv.className = 'paragraph';
      pDiv.dataset.paragraphIndex = pIdx;

      // Split into words, preserving punctuation
      const tokens = para.split(/(\s+)/);
      tokens.forEach(token => {
        if (/^\s+$/.test(token)) {
          pDiv.appendChild(document.createTextNode(token));
        } else if (token.length > 0) {
          // Find matching word data
          const cleanWord = token.replace(/[^\w']/g, '').toLowerCase();
          const wordData = (reading.words || []).find(w =>
            w.word.toLowerCase() === cleanWord || w.word.toLowerCase() === token.toLowerCase()
          );

          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = token;
          span.dataset.paragraph = pIdx;
          span.dataset.word = cleanWord;

          if (wordData) {
            span.dataset.translation = wordData.translation || '';
            span.dataset.phonetics = wordData.phonetics || '';
          }

          span.addEventListener('click', (e) => onWordClick(e, span, cleanWord, wordData));
          pDiv.appendChild(span);
          wordSpans.push(span);
        }
      });

      textArea.appendChild(pDiv);
    });

    // Controls
    const playBtn = document.getElementById('btnPlay');
    const speedBtns = document.querySelectorAll('.speed-btn');

    playBtn.addEventListener('click', togglePlay);

    speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentRate = parseFloat(btn.dataset.rate);
      });
    });

    function togglePlay() {
      if (!hasSpeech) return;
      if (isPlaying && !isPaused) {
        // Pause
        window.speechSynthesis.pause();
        isPaused = true;
        playBtn.textContent = '▶️';
        playBtn.classList.remove('active');
      } else if (isPlaying && isPaused) {
        // Resume
        window.speechSynthesis.resume();
        isPaused = false;
        playBtn.textContent = '⏸️';
        playBtn.classList.add('active');
      } else {
        // Start
        startSpeaking();
      }
    }

    function startSpeaking() {
      window.speechSynthesis.cancel();
      const fullText = reading.paragraphs.join(' ');
      utterance = new SpeechSynthesisUtterance(fullText);
      utterance.lang = 'en-US';
      utterance.rate = currentRate;
      const voice = pickVoice();
      if (voice) utterance.voice = voice;

      let lastHighlightedIdx = -1;
      let boundaryFired = false;
      let timerInterval = null;

      function highlightWord(idx) {
        // Clear previous
        if (lastHighlightedIdx >= 0 && wordSpans[lastHighlightedIdx]) {
          wordSpans[lastHighlightedIdx].classList.remove('highlighted');
        }
        if (idx < wordSpans.length) {
          wordSpans[idx].classList.add('highlighted');
          wordSpans[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Update image if paragraph changed
          const pIdx = parseInt(wordSpans[idx].dataset.paragraph);
          if (pIdx !== currentParagraphIndex) {
            currentParagraphIndex = pIdx;
            renderImage(pIdx);
            updateProgress();
          }
          lastHighlightedIdx = idx;
        }
      }

      // Primary: onboundary event (Chrome/Edge/Safari)
      utterance.onboundary = (event) => {
        if (event.charIndex === undefined) return;
        boundaryFired = true;
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        // Calculate word index from char offset
        const text = fullText.substring(0, event.charIndex);
        const wordNum = text.split(/\s+/).filter(w => w.length > 0).length;
        highlightWord(wordNum);
      };

      // Fallback: timer-based highlighting if onboundary doesn't fire
      utterance.onstart = () => {
        setTimeout(() => {
          if (!boundaryFired && wordSpans.length > 0) {
            let wi = 0;
            const msPerWord = 350 / currentRate;
            highlightWord(0);
            timerInterval = setInterval(() => {
              wi++;
              if (wi < wordSpans.length) {
                highlightWord(wi);
              } else {
                clearInterval(timerInterval);
                timerInterval = null;
              }
            }, msPerWord);
          }
        }, 800);
      };

      utterance.onend = () => {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        isPlaying = false;
        isPaused = false;
        playBtn.textContent = '▶️';
        playBtn.classList.remove('active');
        // Clear all highlights
        wordSpans.forEach(s => s.classList.remove('highlighted'));
        // Mark as complete
        if (!completedReadings.includes(reading.id)) {
          completedReadings.push(reading.id);
          localStorage.setItem('readingCompleted', JSON.stringify(completedReadings));
        }
        const complete = document.getElementById('readingComplete');
        if (complete) complete.classList.add('show');
      };

      utterance.onerror = () => {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        isPlaying = false;
        isPaused = false;
        playBtn.textContent = '▶️';
        playBtn.classList.remove('active');
      };

      window.speechSynthesis.speak(utterance);
      isPlaying = true;
      isPaused = false;
      playBtn.textContent = '⏸️';
      playBtn.classList.add('active');
    }

    function updateProgress() {
      const total = reading.paragraphs.length;
      const progress = document.getElementById('ctrlProgress');
      if (progress) progress.textContent = `Paragraph ${currentParagraphIndex + 1} of ${total}`;
    }
    updateProgress();

    // Expose for paragraph replay if needed
    window.__readingApp = { startSpeaking, togglePlay, renderImage, updateProgress };
  }

  // Word click — pronounce + tooltip
  function onWordClick(e, span, word, wordData) {
    e.stopPropagation();
    if (!hasSpeech) return;

    // Pronounce single word
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.8;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);

    // Brief highlight
    span.classList.add('speaking');
    u.onend = () => span.classList.remove('speaking');

    // Show tooltip
    showTooltip(e, word, wordData);
  }

  let activeTooltip = null;
  function showTooltip(e, word, wordData) {
    removeTooltip();
    const translation = wordData ? (wordData.translation || '—') : '—';
    const phonetics = wordData ? (wordData.phonetics || '—') : '—';

    const tip = document.createElement('div');
    tip.className = 'word-tooltip';
    tip.innerHTML = `
      <div class="tt-en">${word}</div>
      <div class="tt-row"><span class="tt-label">ES</span><span class="tt-flag">🇪🇸</span><span class="tt-es">${translation}</span></div>
      <div class="tt-row"><span class="tt-label">Say</span><span class="tt-flag">🔤</span><span class="tt-phon">/${phonetics}/</span></div>
    `;
    document.body.appendChild(tip);

    // Position near the clicked word
    const rect = e.target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top - tipRect.height - 12;
    if (top < 8) top = rect.bottom + 12; // flip below if no space above
    if (left + tipRect.width > window.innerWidth - 8) left = window.innerWidth - tipRect.width - 8;
    if (left < 8) left = 8;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';

    activeTooltip = tip;
    setTimeout(removeTooltip, 5000);
  }

  function removeTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.word') && !e.target.closest('.word-tooltip')) {
      removeTooltip();
    }
  });
}

})();
