/* PROJEKT 51 // Wohnzimmer-Protokoll – vollständig statisches Smartphone-Spiel
   Keine externen Bibliotheken; Fortschritt ausschließlich auf diesem Gerät. */
(() => {
  'use strict';
  const cfg = window.PROJEKT51_EINSTELLUNGEN || {};
  const STORE = 'projekt51_wohnzimmer_v2';
  const PASS_HASH = 'a8df80772631385d4842adc5a0a620474814cda1d0d96bc4166b643fd5e11cd6';
  const app = document.getElementById('app');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const normalize = str => String(str || '').toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS').replace(/[^A-Z]/g, '');
  const escapeHTML = str => String(str || '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const fresh = () => ({
    stage: 0,
    puzzle: [4,0,7,2,8,3,1,6,5], swaps: 0,
    hack: [],
    memory: { order: ['🪱','🦆','🛋️','🕵️','🦆','📦','🕵️','🔑','🛋️','🪱','🔑','📦'], open: [], matched: [], turns: 0 },
    quiz: 0, chase: 0, cat: {wins:0, attempts:0}, question: 0, answers: []
  });
  let g;
  try { g = {...fresh(), ...JSON.parse(localStorage.getItem(STORE) || '{}')}; } catch { g = fresh(); }
  if (!g.memory || !Array.isArray(g.memory.order)) g.memory = fresh().memory;
  if (!g.cat || typeof g.cat.wins !== 'number') g.cat = {wins:0, attempts:0};
  if (g.memory.open?.length > 1) g.memory.open = [];
  if (!Array.isArray(g.puzzle) || g.puzzle.length !== 9) g.puzzle = fresh().puzzle;
  if (g.stage < 0 || g.stage > 14) g.stage = 0;
  let selectedTile = null, pointerStart = null, suppressClickUntil = 0, memBusy = false, previewTimer = null, catRaf = null;
  let signalAudio = null;  // MP3 for the first interrogation question
  const save = () => { try {localStorage.setItem(STORE, JSON.stringify(g));} catch (_) {} };
  const panel = (eyebrow, body) => `<section class="panel"><p class="eyebrow">${eyebrow}</p>${body}</section>`;
  const stamp = s => `<span class="stamp">◉ &nbsp;${s}</span>`;
  const button = (id, label, more = '') => `<button type="button" id="${id}" class="btn ${more}">${label}</button>`;
  const feedback = () => `<p id="feedback" class="feedback" role="status"></p>`;
  const error = text => { const node = $('#feedback'); if (node) {node.textContent = text;node.className = 'feedback bad';} };
  const status = () => {
    const labels = ['AUFTRAGSEINGANG', 'TEST 01 / 07', 'TEST 02 / 07', 'TEST 03 / 07', 'TEST 04 / 07', 'TEST 05 / 07', 'TEST 06 / 07', 'TEST 07 / 07', 'BEFRAGUNG', 'ZUGANG GESPERRT', 'ARCHIV A', 'ARCHIV B', 'ARCHIV C', 'STANDORT', 'ABGESCHLOSSEN'];
    $('#step-label').textContent = labels[g.stage] || 'GEHEIM';
    const percentages = [2,9,16,23,30,38,45,53,66,78,83,87,91,96,100];
    $('#progress-fill').style.width = `${percentages[g.stage]}%`;
  };
  const next = (stage = g.stage + 1) => {g.pendingSuccess = null; g.stage = stage; save(); selectedTile = null; memBusy = false; render(); window.scrollTo({top:0,behavior:'smooth'});};
  function success(kicker, title, description, nextLabel='Nächste Prüfung →') {
    g.pendingSuccess = {stage:g.stage,kicker,title,description,nextLabel};save();
    showSuccess();
  }
  function showSuccess() {
    const {kicker,title,description,nextLabel} = g.pendingSuccess;
    document.body.classList.remove('solve-flash');
    void document.body.offsetWidth;
    document.body.classList.add('solve-flash');
    setTimeout(() => document.body.classList.remove('solve-flash'), 850);
    app.innerHTML = panel('PRÜFUNG ABGESCHLOSSEN // FREIGABE ERTEILT', `
      <div class="success-burst" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <span class="confetti a"></span><span class="confetti b"></span><span class="confetti c"></span>
      ${stamp(kicker)}<h1>${title}</h1><p class="lead">${description}</p>
      <div class="status-box success-box">✓ &nbsp; Identitätslevel erhöht. Verdachtsmoment bleibt bestehen.</div>
      <div class="buttons">${button('proceed',nextLabel,'full')}</div>`);
    const panelEl = app.querySelector('.panel');
    if (panelEl) panelEl.classList.add('success-panel');
    $('#proceed').onclick = () => next();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function render() {
    if (catRaf !== null) {cancelAnimationFrame(catRaf);catRaf = null;}
    status();
    if(g.pendingSuccess && g.pendingSuccess.stage===g.stage) return showSuccess();
    switch(g.stage) {
      case 0: return intro();
      case 1: return fourPictures();
      case 2: return wormPuzzle();
      case 3: return hacking();
      case 4: return spinningCat();
      case 5: return memory();
      case 6: return quiz();
      case 7: return chase();
      case 8: return questions();
      case 9: return pocketPassword();
      case 10: return firstFake();
      case 11: return secondFake();
      case 12: return thirdFake();
      case 13: return mapReveal();
      case 14: return finalReveal();
      default: return intro();
    }
  }
  function intro() {
    app.innerHTML = panel('EILMELDUNG // AKTE W-51', `
      ${stamp('SICHERHEITSSTUFE: MERKWÜRDIG')}
      <h1>Verdächtige im <span class="accent">Wohnzimmer.</span></h1>
      <p class="lead">Uns liegen mehrere unabhängige Meldungen vor, dass im Wohnzimmer verdächtige Personen gesehen wurden.</p>
      <p class="muted">Begib dich unauffällig dorthin. Beobachte den Raum. Wenn du sicher bist, dass du im Wohnzimmer stehst, bestätige deine Ankunft.</p>
      <div class="note">⚠️ Diese Seite ist Teil einer vertraulichen Untersuchung. Bitte keine voreiligen Schlüsse ziehen. Vor allem nicht über Würmer.</div>
      <div class="buttons">${button('arrived','Ich bin im Wohnzimmer →','full')}</div>`);
    $('#arrived').onclick = () => next();
  }
  function fourPictures() {
    const pics = cfg.bilderVierEins || [];
    const answer = normalize(cfg.vierGewinntWort || 'REISE');
    app.innerHTML = panel('EIGNUNGSPRÜFUNG // 01 VON 07', `
      <span class="section-number">ANALYSEMODUL A</span><h2>4 Bilder.<br><span class="accent">1 Wort.</span></h2>
      <p class="muted">Vier Hinweise, ein gemeinsamer Begriff. Diesmal hat der Wurm ausnahmsweise nichts damit zu tun.</p>
      <div class="four-grid">${[0,1,2,3].map(i=>`<div class="pic-tile"><img src="${escapeHTML(pics[i] || '')}" alt="Bildausschnitt ${i+1}"><span>BEWEIS 0${i+1}</span></div>`).join('')}</div>
      <div class="code-cells" aria-hidden="true">${Array.from({length: answer.length}, () => '<span>?</span>').join('')}</div>
      <form id="four-form"><label class="field-label" for="four-answer">Gesuchtes Wort</label><input id="four-answer" class="input" placeholder="Wort eingeben" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="25" required>
      ${feedback()}<div class="buttons"><button type="submit" class="btn full">Wort prüfen →</button></div></form>`);
    $('#four-form').onsubmit = e => {
      e.preventDefault();
      if(normalize($('#four-answer').value) === answer) success('TEST 01 / 07', `Korrekt. ${escapeHTML(cfg.vierGewinntWort || 'REISE')}.`, 'Die Leitstelle ist überrascht, wie schnell du diesen hochkomplexen Zusammenhang erkannt hast.');
      else error('Leider falsch. Die vier Bilder scheinen ziemlich eindeutig in dieselbe Richtung zu zeigen.');
    };
  }
  const puzzleImage = () => escapeHTML(cfg.wurmBild || 'assets/wurm-puzzle.svg');
  function wormPuzzle() {
    app.innerHTML = panel('EIGNUNGSPRÜFUNG // 02 VON 07', `
      <span class="section-number">BILDREKONSTRUKTION</span><h2>Der <span class="accent">zerstückelte Wurm.</span></h2>
      <p class="muted">Ein Beweisfoto wurde in neun Teile zerlegt. Stelle es wieder her. Ziehe Teile aufeinander <strong>oder tippe zwei Teile nacheinander an</strong>, um sie zu tauschen.</p>
      <div class="puzzle-wrap"><div class="puzzle-board" id="puzzle-board" role="group" aria-label="Neunteiliges Bilderpuzzle">${g.puzzle.map((part,pos)=>{
        const x = (part%3) * 50, y = Math.floor(part/3) * 50;
        return `<button type="button" class="puzzle-tile ${selectedTile === pos ? 'selected' : ''}" data-pos="${pos}" aria-label="Puzzleteil an Stelle ${pos+1}" style="background-image:url('${puzzleImage()}');background-position:${x}% ${y}%"></button>`;
      }).join('')}</div><div class="puzzle-stats"><span>VERSCHIEBUNGEN: ${g.swaps}</span><span>${g.puzzle.filter((p,i)=>p===i).length}/9 korrekt</span></div></div>
      <div id="preview-holder" hidden><img class="preview" src="${puzzleImage()}" alt="Originalbild als kurzer Tipp"></div>
      <div class="buttons">${button('preview','Originalbild kurz zeigen','secondary')}</div>${feedback()}`);
    const board = $('#puzzle-board');
    $$('.puzzle-tile',board).forEach(el => {
      el.onclick = () => {if(Date.now() < suppressClickUntil) return; tapTile(Number(el.dataset.pos));};
      el.onpointerdown = e => {pointerStart = {pos:Number(el.dataset.pos), x:e.clientX, y:e.clientY};};
      el.onpointerup = e => {
        if (!pointerStart) return;
        const target = document.elementFromPoint(e.clientX,e.clientY)?.closest('.puzzle-tile');
        const from = pointerStart.pos;
        pointerStart = null;
        if (target && Number(target.dataset.pos) !== from) {
          suppressClickUntil = Date.now()+350;
          swapTiles(from, Number(target.dataset.pos));
        }
      };
    });
    $('#preview').onclick = () => {
      $('#preview-holder').hidden = false;
      if(previewTimer) clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {if($('#preview-holder')) $('#preview-holder').hidden=true;}, 2800);
    };
  }
  function tapTile(pos) {if(selectedTile === null){selectedTile=pos;render();return;}if(selectedTile === pos){selectedTile=null;render();return;}const from = selectedTile;selectedTile=null;swapTiles(from,pos);}
  function swapTiles(a,b) {
    [g.puzzle[a],g.puzzle[b]]=[g.puzzle[b],g.puzzle[a]];
    g.swaps++;save();render();
    if(g.puzzle.every((p,i)=>p===i)) success('TEST 02 / 07', 'Wurm wiederhergestellt.', 'Alle neun Teile sind am richtigen Platz. Das Bild ist verstörend vollständig.');
  }
  function scoreGuess(guess, target) {
    const result = Array(guess.length).fill('absent');
    const counts = {};
    for (let i = 0; i < target.length; i++) {
      if (guess[i] === target[i]) result[i] = 'correct';
      else counts[target[i]] = (counts[target[i]] || 0) + 1;
    }
    for (let i = 0; i < guess.length; i++) {
      if (result[i] !== 'correct' && counts[guess[i]] > 0) {
        result[i] = 'present';
        counts[guess[i]]--;
      }
    }
    return result;
  }
  function hacking() {
    const target = normalize(cfg.wordleZiel || 'PIRAT').slice(0,5);
    const history = Array.isArray(g.hack) ? g.hack : [];
    const max = 6;
    const solved = history.includes(target);
    const left = Math.max(0, max - history.length);
    const rows = Array.from({length:max}, (_,row) => {
      const guess = history[row] || '';
      const score = guess ? scoreGuess(guess, target) : [];
      return `<div class="wordle-row">${Array.from({length:5}, (_,i) => {
        const ch = guess[i] || '';
        const cls = score[i] ? ' ' + score[i] : (guess ? ' filled' : '');
        return `<span class="wordle-cell${cls}">${escapeHTML(ch)}</span>`;
      }).join('')}</div>`;
    }).join('');
    const recent = history.length ? history.slice(-3).reverse().map(gw => {
      const hits = scoreGuess(gw, target);
      const info = hits.filter(x=>x==='correct').length;
      return `&gt; ${gw}: ${info}/5 exakt`;
    }).join('<br>') : '&gt; FÜNF BUCHSTABEN. NICHTS OFFENSICHTLICHES.';
    app.innerHTML = panel('EIGNUNGSPRÜFUNG // 03 VON 07', `
      <span class="section-number">TERMINALZUGANG</span><h2>Hacke den <span class="accent">lächerlich sicheren</span> Computer.</h2>
      <p class="muted">Diesmal im Stil eines peinlich modernen Sicherheitsprotokolls. Finde ein <strong>fünfbuchstabiges</strong> Wort. Grün = richtiger Buchstabe am richtigen Platz. Gelb = richtiger Buchstabe, aber falscher Platz. Grau = kommt nicht vor.</p>
      <div class="term"><div class="term-head">[ WORDLE PROTOKOLL ] &nbsp; VERSUCHE: ${'●'.repeat(left)}${'○'.repeat(max-left)}</div>
      <div class="wordle-board">${rows}</div>
      <form id="wordle-form" class="wordle-form" ${solved || !left ? 'hidden' : ''}>
        <input id="wordle-input" class="input" placeholder="5 Buchstaben" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="5" required>
        <button type="submit" class="btn">Versuch senden</button>
      </form>
      <div class="terminal-log">${recent}${history.length>=3 && !solved ? '<br>&gt; HINWEIS: Es ist etwas, das man früher möglicherweise mit Augenklappe getragen hätte. Oder auch nicht.' : ''}</div></div>
      ${!left && !solved ? `<div class="buttons">${button('reboot','WORDLE NEU STARTEN','full')}</div>` : ''}
      ${feedback()}`);
    if ($('#wordle-form')) $('#wordle-form').onsubmit = e => {
      e.preventDefault();
      const guess = normalize($('#wordle-input').value).slice(0,5);
      if (guess.length !== 5) return error('Bitte genau 5 Buchstaben eingeben.');
      if (history.includes(guess)) return error('Dieses Wort hast du schon ausprobiert.');
      g.hack.push(guess); save();
      if (guess === target) return success('TEST 03 / 07','Zugang gewährt.', 'Der Computer akzeptiert das Wort erstaunlicherweise. Seine Schutzmaßnahmen waren offenbar hauptsächlich Dekoration.');
      if (g.hack.length >= max) return render();
      render();
    };
    if ($('#reboot')) $('#reboot').onclick = () => { g.hack = []; save(); render(); };
  }
  // OEEAEE-KATZE – bewusst albernes Reflexspiel, ohne Audio-/Internet-Abhängigkeiten.
  function spinningCat(message = '') {
    const total = 3;
    if (g.cat.wins >= total) return success('TEST 04 / 07', 'Rotation erfolgreich.', 'Die Katze wurde dreimal erfolgreich kalibriert. Warum das nötig war, ist streng geheim.');
    const round = g.cat.wins;
    app.innerHTML = panel('EIGNUNGSPRÜFUNG // 04 VON 07', `
      <span class="section-number">FELINE ROTATIONSEINHEIT</span>
      <h2>OEEAEE – <span class="accent">Drehzahlprüfung.</span></h2>
      <p class="muted">Diese Katze rotiert aus Gründen der nationalen Sicherheit. Stoppe sie <strong>möglichst aufrecht</strong>. Drei gültige Stopps sind nötig.</p>
      <div class="cat-arena">
        <div class="cat-ring" aria-hidden="true"><div class="cat-zero"></div></div>
        <img class="cat-image" id="cat-image" src="assets/oeeaee-katze.png" alt="Oeeaee-Katze im Rotationsprüfstand" draggable="false">
        <div class="cat-label">OEEAEE // v${round+1}.0</div>
      </div>
      <div class="cat-score"><span>GÜLTIGE STOPPS <b>${g.cat.wins} / ${total}</b></span><span>VERSUCHE <b>${g.cat.attempts}</b></span></div>
      <p class="muted small">Grüner Bereich = Katze steht gerade. Beim Drehen auf <strong>JETZT STOPPEN</strong> tippen.</p>
      <div class="cat-buttons">${button('cat-start','▶ Rotation starten','full')}${button('cat-stop','■ JETZT STOPPEN','secondary full')}</div>
      <p id="cat-result" class="cat-result" role="status">${escapeHTML(message)}</p>`);
    const img = $('#cat-image');
    const startBtn = $('#cat-start');
    const stopBtn = $('#cat-stop');
    stopBtn.disabled = true;
    let running = false;
    let angle = 130 + (round * 45);
    let started = 0;
    const speed = [145,185,220][round];
    img.style.transform = `rotate(${angle}deg)`;
    startBtn.onclick = () => {
      if (running) return;
      running = true;
      started = performance.now();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      $('#cat-result').textContent = 'OEEAEE OEEAEE OEEAEE …';
      function frame(now) {
        if (!running || g.stage !== 4) return;
        angle = (130 + round*45 + (now-started)*speed/1000) % 360;
        img.style.transform = `rotate(${angle}deg)`;
        catRaf = requestAnimationFrame(frame);
      }
      catRaf = requestAnimationFrame(frame);
    };
    stopBtn.onclick = () => {
      if (!running) return;
      running = false;
      if (catRaf !== null) {cancelAnimationFrame(catRaf);catRaf = null;}
      stopBtn.disabled = true;
      const delta = Math.min(angle, 360-angle);
      g.cat.attempts++;
      const hit = delta <= 42;
      if (hit) {
        g.cat.wins++; save();
        if (g.cat.wins >= total) return success('TEST 04 / 07', 'OEEAEE kalibriert.', 'Dreimal aufrecht gestoppt. Diese Information wird in der Personalakte der Katze vermerkt.');
        return spinningCat('✓ Rotation bestätigt. Nächste Drehzahl wird erhöht.');
      }
      save();
      spinningCat('✗ Katze zu schief. Noch einmal versuchen.');
    };
  }
  function memory() {
    const mem = g.memory;
    const isShown = i => mem.open.includes(i) || mem.matched.includes(i);
    app.innerHTML = panel('EIGNUNGSPRÜFUNG // 05 VON 07', `
      <span class="section-number">GEDÄCHTNISDIAGNOSTIK</span><h2>Wir prüfen dein <span class="accent">Kurzzeitgedächtnis.</span></h2>
      <p class="muted">Finde sechs Paare. Alle Beteiligten bestreiten, an diesem Test mitgewirkt zu haben.</p>
      <div class="memory-grid">${mem.order.map((symbol,i)=>`<button type="button" class="memory-card ${isShown(i)?'open':''} ${mem.matched.includes(i)?'matched':''}" data-i="${i}" aria-label="Karte ${i+1}${isShown(i)?' '+symbol:''}" ${mem.matched.includes(i)?'disabled':''}>${isShown(i)?symbol:'51'}</button>`).join('')}</div>
      <p class="muted small">PAARE: ${mem.matched.length/2}/6 &nbsp; · &nbsp; VERSUCHE: ${mem.turns}</p>`);
    $$('.memory-card').forEach(el => el.onclick = () => {
      if(memBusy) return;
      const i=Number(el.dataset.i);
      if(mem.matched.includes(i)||mem.open.includes(i)) return;
      mem.open.push(i);save();render();
      if(mem.open.length===2){
        memBusy=true; const [a,b]=mem.open;
        setTimeout(()=>{
          if(g.stage!==5) return;
          mem.turns++;
          if(mem.order[a]===mem.order[b]) mem.matched.push(a,b);
          mem.open=[];memBusy=false;save();
          if(mem.matched.length===12) success('TEST 05 / 07','Gedächtnis ausreichend.', 'Alle sechs Paare gefunden. Die Ermittlungsakte ist weiterhin völlig unklar.');
          else render();
        },780);
      }
    });
  }
  const QUIZ = [
    {q:'Welche dieser Aussagen beschreibt einen perfekten Verdächtigen?', options:['A. Er trägt eine Sonnenbrille im Haus','B. Er sagt auffällig oft „Ich war’s nicht“','C. Er ist ein Wurm mit Aktenkoffer','D. Alle drei wirken äußerst verdächtig'],correct:3,worth:'50 €'},
    {q:'Was ist laut Ermittlungsleitung das gefährlichste Möbelstück?', options:['A. Ein sehr stilles Sofa','B. Ein Stuhl mit Führerschein','C. Ein Kühlschrank voller Geheimnisse','D. Ein Teppich, der flüstert'],correct:0,worth:'500 €'},
    {q:'Was tust du, wenn dir jemand eine völlig sinnlose Prüfung vorlegt?', options:['A. Das Bundeskriminalamt anrufen','B. Sie natürlich trotzdem bestehen','C. Den Wurm befragen','D. Unter dem Sofa nach dem Sinn suchen'],correct:1,worth:'1.000.000 €'}
  ];
  function quiz() {
    const q=QUIZ[g.quiz];
    app.innerHTML=panel('EIGNUNGSPRÜFUNG // 06 VON 07', `
      <span class="section-number">FRAGERUNDE ${g.quiz+1} / ${QUIZ.length}</span><h2>Wer wird <span class="accent">Verdachtsmillionär?</span></h2>
      <p class="quiz-money">FRAGE FÜR ${q.worth}</p><p class="lead" style="font-weight:850;color:#fff">${q.q}</p>
      <div class="quiz-options">${q.options.map((v,i)=>`<button type="button" class="quiz-option" data-i="${i}"><strong>${'ABCD'[i]}</strong>${escapeHTML(v.slice(3))}</button>`).join('')}</div>
      ${feedback()}<p class="muted small" style="margin-top:16px">Es gibt keinen Telefonjoker. Niemand möchte mit dieser Untersuchung in Verbindung gebracht werden.</p>`);
    $$('.quiz-option').forEach(el=>el.onclick=()=>{
      if(Number(el.dataset.i)!==q.correct) return error('Falsch. Die Spielleitung ist enttäuscht, aber nicht überrascht. Versuch es erneut.');
      g.quiz++;save();
      if(g.quiz===QUIZ.length) success('TEST 06 / 07','Du bist Verdachtsmillionär.', 'Das Preisgeld wurde leider in Form eines behördlichen Schulterklopfens ausgezahlt.');
      else render();
    });
  }
  function chase() {
    const position = (2+g.chase*7)%12;
    app.innerHTML = panel('EIGNUNGSPRÜFUNG // 07 VON 07', `
      <span class="section-number">VERDÄCHTIGENFESTNAHME</span><h2>Fang den <span class="accent">Wurm.</span></h2>
      <p class="muted">Ein Verdächtiger versucht, sich der Festnahme zu entziehen. Tippe ihn achtmal an. Warum? Das ist geheim.</p>
      <div class="chase-grid">${Array.from({length:12},(_,i)=>`<button type="button" class="chase-cell ${i===position?'target':''}" data-pos="${i}" aria-label="${i===position?'Wurm fangen':'Leeres Feld'}">${i===position?'🪱':'·'}</button>`).join('')}</div>
      <p class="muted small" style="text-align:center">ERFOLGREICHE FESTNAHMEN</p><p class="count" style="text-align:center">${g.chase} <span class="muted" style="font-size:22px">/ 8</span></p>`);
    $$('.chase-cell.target').forEach(el=>el.onclick=()=>{
      g.chase++;save();
      if(g.chase>=8) success('ALLE 7 TESTS BESTANDEN','Du bist qualifiziert.', 'Wofür genau, wissen wir selbst noch nicht. Aber der Verdächtige ist erschöpft.', 'Bericht anhören →');
      else render();
    });
  }
  const QUESTIONS = [
    'Du hast die Tests bestanden. <span class="accent">Hörst du das?</span>',
    'Hat der WURM eigentlich eine Genehmigung, so auszusehen?',
    'Kann ein Sofa als glaubwürdiger Zeuge auftreten?',
    'Wenn niemand hinsieht: Ist NORD dann immer noch oben?',
    'Würdest du einer Zimmerpflanze einen Personalausweis ausstellen?',
    'Hast du die verdächtigen Personen mittlerweile identifiziert?',
    'Ist BRAUN eher eine Farbe oder ein unvollständiges Geständnis?',
    'Könnte es sein, dass dich gerade ein Kühlschrank beobachtet?',
    'Würdest du einer Ente die Leitung dieser Mission übertragen?',
    'Hat der Teppich deiner Meinung nach ein Alibi?',
    'Wenn eine Uhr rückwärts läuft, ist dann schon morgen?',
    'Ist das Wohnzimmer wirklich noch derselbe Raum wie vorhin?',
    'Hat dir irgendjemand erklärt, warum du das hier machst?',
    'Bist du bereit zu akzeptieren, dass die Lösung niemals auf diesem Bildschirm war?'
  ];
  function questions() {
    const i=g.question;
    app.innerHTML=panel('NEUE EINGEHENDE ÜBERTRAGUNG // VERHÖR', `
      <div class="question-number">FRAGE ${String(i+1).padStart(2,'0')} / ${QUESTIONS.length} &nbsp; · &nbsp; DEIN STATUS: VERWIRRT</div>
      ${stamp('UNBESTÄTIGTES SIGNAL')}
      <div class="question-text ${i>10?'glitch':''}">${QUESTIONS[i]}</div>
      ${i===0 ? '<div class="buttons" style="margin-top:0;margin-bottom:10px">'+button('play-signal','🔊 Seltsames Geräusch abspielen','ghost')+'</div><p id="signal-feedback" class="muted small" role="status"></p>' : ''}
      <p class="muted small">Beantworte die Frage. Deine Antwort wird irgendwo protokolliert. Vermutlich.</p>
      <div class="choice-grid">${button('yes','JA','secondary')}${button('no','NEIN','secondary')}</div>`);
    if($('#play-signal')) $('#play-signal').onclick = playSignal;
    ['yes','no'].forEach(id=>$('#'+id).onclick=()=>{
      g.answers.push(id==='yes'?'JA':'NEIN'); g.question++;save();
      if(g.question>=QUESTIONS.length) next(); else render();
    });
  }
  function playSignal() {
    const btn = $('#play-signal');
    const status = $('#signal-feedback');
    const failure = () => {
      if (btn) btn.textContent = '🔊 Noch einmal versuchen';
      if (status) {
        status.innerHTML = 'Die Audiodatei konnte nicht abgespielt werden. <a href="assets/signal-miau.mp3" target="_blank" rel="noopener noreferrer">Miau direkt öffnen</a>';
      }
    };
    try {
      // The call is triggered directly by a tap; required for audio on mobile browsers.
      if (!signalAudio) {
        signalAudio = new Audio('assets/signal-miau.mp3?v=8');
        signalAudio.preload = 'auto';
        signalAudio.addEventListener('ended', () => {
          const currentButton = $('#play-signal');
          if (currentButton) currentButton.textContent = '🔊 Noch einmal abspielen';
        });
        signalAudio.addEventListener('error', failure);
      }
      signalAudio.pause();
      signalAudio.currentTime = 0;
      // Do not swallow playback errors: show a fallback when browser or asset blocks sound.
      const playback = signalAudio.play();
      if (btn) btn.textContent = '🔊 Miau wird abgespielt …';
      if (status) status.textContent = 'Ton läuft – bei Bedarf Medienlautstärke prüfen.';
      if (playback && typeof playback.catch === 'function') playback.catch(failure);
    } catch (_) { failure(); }
  }
  async function sha256(text) {
    if (!window.crypto?.subtle) throw new Error('Bitte über HTTPS (GitHub Pages) öffnen.');
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function pocketPassword() {
    app.innerHTML=panel('LETZTE FREIGABE // MANUELLE BESTÄTIGUNG', `
      ${stamp('DIE LETZTE SPUR')}
      <h1>Die Lösung war die ganze Zeit in <span class="accent">Patricks Hosentasche.</span></h1>
      <p class="lead">Bitte stelle umgehend Kontakt zu Patrick her. In seiner Hosentasche befindet sich ein Zettel mit den letzten Informationen.</p>
      <div class="note">Die Leitstelle hat keine weiteren Hinweise. Nicht in der Website suchen. <strong>In der Hosentasche.</strong></div>
      <form id="password-form"><label class="field-label" for="password">Passwort vom Zettel</label>
      <input id="password" class="input" type="password" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Geheimes Passwort" required>
      <div style="margin:12px 0 0"><label class="muted small"><input type="checkbox" id="show-password"> Passwort anzeigen</label></div>
      ${feedback()}<div class="buttons"><button type="submit" id="unlock" class="btn full">Letzte Freigabe öffnen →</button></div></form>`);
    $('#show-password').onchange=e=>$('#password').type=e.target.checked?'text':'password';
    $('#password-form').onsubmit=async e=>{
      e.preventDefault();
      const btn=$('#unlock'); btn.disabled=true;btn.textContent='Passwort wird geprüft …';
      try {
        const good=(await sha256($('#password').value.trim()))===PASS_HASH;
        if(good) next(); else {error('Passwort nicht akzeptiert. Prüfe die Groß-/Kleinschreibung auf Patricks Zettel.');btn.disabled=false;btn.textContent='Letzte Freigabe öffnen →';}
      } catch (err) { error(err.message || 'Die Prüfung ist momentan nicht möglich.');btn.disabled=false;btn.textContent='Erneut prüfen →'; }
    };
  }
  function firstFake() {
    app.innerHTML=panel('DEIN GESCHENK // REISEUNTERLAGEN 1 / 4', `
      ${stamp('HERZLICHEN GLÜCKWUNSCH')}
      <h1>Überraschung. <span class="accent">Wir verreisen!</span></h1>
      <p class="lead">Wir haben wirklich keine Kosten und Mühen gescheut, um eine unvergessliche Unterkunft für dich zu finden.</p>
      <img class="fake-picture" src="${escapeHTML(cfg.fakeUnterkunft2)}" alt="Verlassener Schlafplatz unter einer Brücke als erste Fake-Unterkunft">
      <span class="fake-label">DELUXE OPEN AIR</span>
      <p class="muted" style="margin-top:15px">Jetzt mit erheblich mehr Platz, maximaler Frischluft und bester Anbindung an die Unterseite einer Brücke.</p>
      <div class="buttons">${button('fake-next','Äh … weiter? →','full')}</div>`);
    $('#fake-next').onclick=()=>next();
  }
  function secondFake() {
    app.innerHTML=panel('DEIN GESCHENK // REISEUNTERLAGEN 2 / 4', `
      ${stamp('UPGRADE BESTÄTIGT')}
      <h2>Okay. Zugegeben.<br><span class="accent">Wir haben noch ein Upgrade.</span></h2>
      <img class="fake-picture" src="${escapeHTML(cfg.fakeUnterkunft1)}" alt="Kleines Schlafzimmer mit Etagenbett als zweite Fake-Unterkunft">
      <span class="fake-label">KATEGORIE: KOMPAKT</span>
      <p class="lead">Effizient geschnitten. Wenig Laufwege. Wer sich umdrehen will, sollte es vorher anmelden.</p>
      <div class="buttons">${button('fake-next','Das kann noch nicht alles sein … →','full')}</div>`);
    $('#fake-next').onclick=()=>next();
  }
  function thirdFake() {
    app.innerHTML=panel('DEIN GESCHENK // REISEUNTERLAGEN 3 / 4', `
      ${stamp('NOCH EIN VORSCHLAG')}
      <h2>Und falls dir das alles noch <span class="accent">zu luxuriös</span> war …</h2>
      <img class="fake-picture" src="${escapeHTML(cfg.fakeUnterkunft3)}" alt="Scherzhafte verwahrloste Hütte als weitere Fake-Unterkunft">
      <span class="fake-label">RUSTIKAL PLUS</span>
      <p class="lead">Freistehende Außenwände. Offenes Raumkonzept. Wer die Tür findet, hat gewonnen.</p>
      <div class="buttons">${button('fake-next','Bitte jetzt die echte Reise zeigen →','full')}</div>`);
    $('#fake-next').onclick=()=>next();
  }
  function mapReveal() {
    const image = String(cfg.kartenBild || '').trim();
    const mapImage = image || 'assets/karte-braunlage.png';
    app.innerHTML=panel('DEIN GESCHENK // REISEUNTERLAGEN 4 / 4', `
      ${stamp('JETZT WIRD ES KONKRET')}
      <h2>Hier liegt unser <span class="accent">geheimer Zielort.</span></h2>
      <p class="muted">Die Aufnahme stammt von oben. Tippe auf die Karte, um sie groß zu öffnen. Du kannst auf dem Handy mit zwei Fingern zoomen und den Ausschnitt verschieben.</p>
      <button type="button" class="map-open" id="map-open" aria-label="Satellitenkarte vergrößern"><img class="map-img" src="${escapeHTML(mapImage)}" alt="Satellitenkarte mit markierten Hinweisen"><span>⌕ &nbsp;KARTE VERGRÖSSERN</span></button>
      <form id="location-form" class="location-form"><label class="field-label" for="location-answer">Welcher Ort ist auf der Karte zu sehen?</label>
      <input class="input" id="location-answer" placeholder="Ortsname eingeben …" autocapitalize="words" autocomplete="off" spellcheck="false" required>
      ${feedback()}<div class="buttons"><button type="submit" class="btn full">Ort bestätigen →</button></div></form>
      <div id="map-modal" class="map-modal" hidden role="dialog" aria-modal="true" aria-label="Satellitenkarte vergrößern">
        <div class="map-modal-head"><strong>AKTE 51 // SATELLITENBILD</strong><button type="button" id="map-close" class="map-icon-btn" aria-label="Karte schließen">✕</button></div>
        <div class="map-viewport" id="map-viewport"><img id="map-zoom-image" src="${escapeHTML(mapImage)}" alt="Vergrößerbare Satellitenkarte" draggable="false"></div>
        <div class="map-tools"><button type="button" id="map-less" aria-label="Herauszoomen">−</button><span id="map-scale">100 %</span><button type="button" id="map-more" aria-label="Hineinzoomen">+</button><button type="button" id="map-reset">Zurücksetzen</button></div>
        <p>Mit zwei Fingern zoomen · mit einem Finger verschieben · am PC Mausrad benutzen</p>
      </div>`);
    $('#location-form').onsubmit = e => {
      e.preventDefault();
      if (normalize($('#location-answer').value) === 'BRAUNLAGE') next();
      else error('Noch nicht der richtige Ort. Schau dir die markierten Stellen auf der Karte genauer an.');
    };
    setupMapZoom();
  }
  function setupMapZoom() {
    const modal = $('#map-modal');
    const viewport = $('#map-viewport');
    const img = $('#map-zoom-image');
    let zoom = 1, tx = 0, ty = 0;
    const points = new Map();
    let lastDistance = null;
    let lastCenter = null;
    const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
    const apply = () => {
      const maxX = (viewport.clientWidth * Math.max(0,zoom-1))/2;
      const maxY = (viewport.clientHeight * Math.max(0,zoom-1))/2;
      tx=clamp(tx,-maxX,maxX);ty=clamp(ty,-maxY,maxY);
      img.style.transform=`translate(${tx}px,${ty}px) scale(${zoom})`;
      $('#map-scale').textContent=`${Math.round(zoom*100)} %`;
    };
    const setZoom = value => {zoom=clamp(value,1,6);if(zoom===1){tx=0;ty=0;}apply();};
    const close = () => {modal.hidden=true; document.body.classList.remove('map-is-open');points.clear();lastDistance=null;};
    $('#map-open').onclick = () => {modal.hidden=false;document.body.classList.add('map-is-open');setZoom(1);};
    $('#map-close').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    $('#map-more').onclick=()=>setZoom(zoom*1.5);
    $('#map-less').onclick=()=>setZoom(zoom/1.5);
    $('#map-reset').onclick=()=>setZoom(1);
    viewport.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*(e.deltaY<0?1.18:1/1.18));},{passive:false});
    const distance = ([a,b]) => Math.hypot(a.x-b.x,a.y-b.y);
    const center = ([a,b]) => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
    viewport.addEventListener('pointerdown',e=>{
      e.preventDefault();viewport.setPointerCapture(e.pointerId);
      points.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(points.size===2){const pair=[...points.values()];lastDistance=distance(pair);lastCenter=center(pair);}
    });
    viewport.addEventListener('pointermove',e=>{
      if(!points.has(e.pointerId))return;
      e.preventDefault();
      const old=points.get(e.pointerId);
      points.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(points.size===1){tx+=e.clientX-old.x;ty+=e.clientY-old.y;apply();}
      else if(points.size===2){
        const pair=[...points.values()];const nowDistance=distance(pair);const nowCenter=center(pair);
        if(lastDistance&&lastDistance>0)zoom=clamp(zoom*nowDistance/lastDistance,1,6);
        if(lastCenter){tx+=nowCenter.x-lastCenter.x;ty+=nowCenter.y-lastCenter.y;}
        lastDistance=nowDistance;lastCenter=nowCenter;apply();
      }
    });
    const removePointer = e=>{
      points.delete(e.pointerId);lastDistance=null;lastCenter=null;
      if(points.size===2){const pair=[...points.values()];lastDistance=distance(pair);lastCenter=center(pair);}
    };
    viewport.addEventListener('pointerup',removePointer);
    viewport.addEventListener('pointercancel',removePointer);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
    apply();
  }
  function finalReveal() {
    app.innerHTML=panel('AKTE W-51 // ENDE DER ERMITTLUNGEN', `
      <span class="confetti a"></span><span class="confetti b"></span><span class="confetti c"></span>
      ${stamp('MISSION ERFOLGREICH · ENDGÜLTIG')}
      <div class="finish-icon" aria-hidden="true">🎁</div>
      <h1>Das war alles nur für <span class="accent">dich.</span></h1>
      <p class="lead">Die Verdächtigen im Wohnzimmer, der verdächtige Wurm, die unmöglichen Fragen … all das für eine einzige Nachricht:</p>
      <h2><span class="accent">Wir schenken dir eine Reise nach Braunlage!</span></h2>
      <div class="destination"><span class="small muted">GEMEINSAME REISE</span><strong>${escapeHTML(cfg.reisezeit)}</strong><span class="small muted">Braunlage · Harz</span></div>
      <p class="muted">Und nein, du musst nicht unter einer Brücke schlafen. Wir haben wirklich etwas gebucht.</p>
      <div class="buttons"><a class="btn full" href="${escapeHTML(cfg.airbnbUrl)}" target="_blank" rel="noopener noreferrer">🏡 &nbsp;Unser echtes Airbnb ansehen ↗</a></div>
      <p class="muted small" style="margin-top:23px">Alles Gute zum Geburtstag. ❤️</p>`);
  }
  $('#reset').onclick=()=>{
    if(confirm('Wirklich das komplette Spiel von vorne beginnen?')) {
      g=fresh();save();selectedTile=null;memBusy=false;render();window.scrollTo({top:0,behavior:'smooth'});
    }
  };
  if(new URLSearchParams(location.search).has('reset')) {g=fresh();save();}
  save();render();
})();
