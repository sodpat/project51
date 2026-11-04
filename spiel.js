/* PROJEKT 51 // Wohnzimmer-Protokoll – vollständig statisches Smartphone-Spiel
   Keine externen Bibliotheken; Fortschritt ausschließlich auf diesem Gerät. */
(() => {
  'use strict';
  const cfg = window.PROJEKT51_EINSTELLUNGEN || {};
  const STORE = 'projekt51_wohnzimmer_v1';
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
    quiz: 0, chase: 0, question: 0, answers: []
  });
  let g;
  try { g = {...fresh(), ...JSON.parse(localStorage.getItem(STORE) || '{}')}; } catch { g = fresh(); }
  if (!g.memory || !Array.isArray(g.memory.order)) g.memory = fresh().memory;
  if (g.memory.open?.length > 1) g.memory.open = [];
  if (!Array.isArray(g.puzzle) || g.puzzle.length !== 9) g.puzzle = fresh().puzzle;
  if (g.stage < 0 || g.stage > 13) g.stage = 0;
  let selectedTile = null, pointerStart = null, suppressClickUntil = 0, memBusy = false, previewTimer = null;
  const save = () => { try {localStorage.setItem(STORE, JSON.stringify(g));} catch (_) {} };
  const panel = (eyebrow, body) => `<section class="panel"><p class="eyebrow">${eyebrow}</p>${body}</section>`;
  const stamp = s => `<span class="stamp">◉ &nbsp;${s}</span>`;
  const button = (id, label, more = '') => `<button type="button" id="${id}" class="btn ${more}">${label}</button>`;
  const feedback = () => `<p id="feedback" class="feedback" role="status"></p>`;
  const error = text => { const node = $('#feedback'); if (node) {node.textContent = text;node.className = 'feedback bad';} };
  const status = () => {
    const labels = ['AUFTRAGSEINGANG', 'TEST 01 / 06', 'TEST 02 / 06', 'TEST 03 / 06', 'TEST 04 / 06', 'TEST 05 / 06', 'TEST 06 / 06', 'BEFRAGUNG', 'ZUGANG GESPERRT', 'ARCHIV A', 'ARCHIV B', 'ARCHIV C', 'STANDORT', 'ABGESCHLOSSEN'];
    $('#step-label').textContent = labels[g.stage] || 'GEHEIM';
    const percentages = [2,9,17,25,33,41,49,63,76,82,88,92,96,100];
    $('#progress-fill').style.width = `${percentages[g.stage]}%`;
  };
  const next = (stage = g.stage + 1) => {g.pendingSuccess = null; g.stage = stage; save(); selectedTile = null; memBusy = false; render(); window.scrollTo({top:0,behavior:'smooth'});};
  function success(kicker, title, description, nextLabel='Nächste Prüfung →') {
    g.pendingSuccess = {stage:g.stage,kicker,title,description,nextLabel};save();
    showSuccess();
  }
  function showSuccess() {
    const {kicker,title,description,nextLabel} = g.pendingSuccess;
    app.innerHTML = panel('PRÜFUNG ABGESCHLOSSEN // FREIGABE ERTEILT', `
      ${stamp(kicker)}<h1>${title}</h1><p class="lead">${description}</p>
      <div class="status-box">✓ &nbsp; Identitätslevel erhöht. Verdachtsmoment bleibt bestehen.</div>
      <div class="buttons">${button('proceed',nextLabel,'full')}</div>`);
    $('#proceed').onclick = () => next();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function render() {
    status();
    if(g.pendingSuccess && g.pendingSuccess.stage===g.stage) return showSuccess();
    switch(g.stage) {
      case 0: return intro();
      case 1: return fourPictures();
      case 2: return wormPuzzle();
      case 3: return hacking();
      case 4: return memory();
      case 5: return quiz();
      case 6: return chase();
      case 7: return questions();
      case 8: return pocketPassword();
      case 9: return firstFake();
      case 10: return secondFake();
      case 11: return thirdFake();
      case 12: return mapReveal();
      case 13: return finalReveal();
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
    app.innerHTML = panel('EIGNUNGSPRÜFUNG // 01 VON 06', `
      <span class="section-number">ANALYSEMODUL A</span><h2>4 Bilder.<br><span class="accent">1 Wort.</span></h2>
      <p class="muted">Vier Hinweise, ein gemeinsamer Begriff. Diesmal hat der Wurm ausnahmsweise nichts damit zu tun.</p>
      <div class="four-grid">${[0,1,2,3].map(i=>`<div class="pic-tile"><img src="${escapeHTML(pics[i] || '')}" alt="Bildausschnitt ${i+1}"><span>BEWEIS 0${i+1}</span></div>`).join('')}</div>
      <div class="code-cells" aria-hidden="true">${Array.from({length: answer.length}, () => '<span>?</span>').join('')}</div>
      <form id="four-form"><label class="field-label" for="four-answer">Gesuchtes Wort</label><input id="four-answer" class="input" placeholder="Wort eingeben" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="25" required>
      ${feedback()}<div class="buttons"><button type="submit" class="btn full">Wort prüfen →</button></div></form>`);
    $('#four-form').onsubmit = e => {
      e.preventDefault();
      if(normalize($('#four-answer').value) === answer) success('TEST 01 / 06', `Korrekt. ${escapeHTML(cfg.vierGewinntWort || 'REISE')}.`, 'Die Leitstelle ist überrascht, wie schnell du diesen hochkomplexen Zusammenhang erkannt hast.');
      else error('Leider falsch. Die vier Bilder scheinen ziemlich eindeutig in dieselbe Richtung zu zeigen.');
    };
  }
  const puzzleImage = () => escapeHTML(cfg.wurmBild || 'assets/wurm-puzzle.svg');
  function wormPuzzle() {
    app.innerHTML = panel('EIGNUNGSPRÜFUNG // 02 VON 06', `
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
    if(g.puzzle.every((p,i)=>p===i)) success('TEST 02 / 06', 'Wurm wiederhergestellt.', 'Alle neun Teile sind am richtigen Platz. Das Bild ist verstörend vollständig.');
  }
  const WORDS = ['KABEL','KARTE','WOLKE','KOMET','MASKE','LAMPE','KISTE','NACHT','WURME','RAUCH','SOFAS','ALARM'];
  function hacking() {
    const history = g.hack || [];
    const left = Math.max(0,4-history.length);
    const log = history.map(w => `&gt; ${w}: ${[...w].filter((c,i)=>c==='KABEL'[i]).length}/5 Positionen korrekt`).reverse().join('<br>');
    app.innerHTML = panel('EIGNUNGSPRÜFUNG // 03 VON 06', `
      <span class="section-number">TERMINALZUGANG</span><h2>Hacke den <span class="accent">lächerlich sicheren</span> Computer.</h2>
      <p class="muted">Ein einziges Wort passt. Nach jeder Eingabe siehst du, wie viele Buchstaben <strong>an der richtigen Position</strong> stehen. Vier Fehlversuche führen zum Neustart des Terminals.</p>
      <div class="term"><div class="term-head">[ ACCESS RESTRICTED ] &nbsp; VERSUCHE: ${'●'.repeat(left)}${'○'.repeat(4-left)}</div>
      <div class="term-grid">${WORDS.map((w,i)=>`<button type="button" class="word ${history.includes(w)?'used':''}" data-word="${w}" ${history.includes(w)||!left?'disabled':''}><span style="opacity:.6">0x${(0xF1A0+i*0x10).toString(16).toUpperCase()}</span> ${w}</button>`).join('')}</div>
      <div class="terminal-log">${log || '&gt; WÄHLE EIN CODEWORT AUS DER LISTE'}${history.length>=2?'<br>&gt; NOTFALLHINWEIS: Das Wort beginnt mit KA.':''}</div></div>
      ${left ? '' : `<div class="buttons">${button('reboot','TERMINAL NEU STARTEN','full')}</div>`}`);
    $$('.word').forEach(el => el.onclick = () => {
      const word=el.dataset.word;
      if(word==='KABEL') return success('TEST 03 / 06','Zugang gewährt.', 'Der Computer hatte offenbar das Passwort KABEL. Die IT-Abteilung schweigt dazu.');
      g.hack.push(word);save();render();
    });
    if ($('#reboot')) $('#reboot').onclick=()=>{g.hack=[];save();render();};
  }
  function memory() {
    const mem = g.memory;
    const isShown = i => mem.open.includes(i) || mem.matched.includes(i);
    app.innerHTML = panel('EIGNUNGSPRÜFUNG // 04 VON 06', `
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
          if(g.stage!==4) return;
          mem.turns++;
          if(mem.order[a]===mem.order[b]) mem.matched.push(a,b);
          mem.open=[];memBusy=false;save();
          if(mem.matched.length===12) success('TEST 04 / 06','Gedächtnis ausreichend.', 'Alle sechs Paare gefunden. Die Ermittlungsakte ist weiterhin völlig unklar.');
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
    app.innerHTML=panel('EIGNUNGSPRÜFUNG // 05 VON 06', `
      <span class="section-number">FRAGERUNDE ${g.quiz+1} / ${QUIZ.length}</span><h2>Wer wird <span class="accent">Verdachtsmillionär?</span></h2>
      <p class="quiz-money">FRAGE FÜR ${q.worth}</p><p class="lead" style="font-weight:850;color:#fff">${q.q}</p>
      <div class="quiz-options">${q.options.map((v,i)=>`<button type="button" class="quiz-option" data-i="${i}"><strong>${'ABCD'[i]}</strong>${escapeHTML(v.slice(3))}</button>`).join('')}</div>
      ${feedback()}<p class="muted small" style="margin-top:16px">Es gibt keinen Telefonjoker. Niemand möchte mit dieser Untersuchung in Verbindung gebracht werden.</p>`);
    $$('.quiz-option').forEach(el=>el.onclick=()=>{
      if(Number(el.dataset.i)!==q.correct) return error('Falsch. Die Spielleitung ist enttäuscht, aber nicht überrascht. Versuch es erneut.');
      g.quiz++;save();
      if(g.quiz===QUIZ.length) success('TEST 05 / 06','Du bist Verdachtsmillionär.', 'Das Preisgeld wurde leider in Form eines behördlichen Schulterklopfens ausgezahlt.');
      else render();
    });
  }
  function chase() {
    const position = (2+g.chase*7)%12;
    app.innerHTML = panel('EIGNUNGSPRÜFUNG // 06 VON 06', `
      <span class="section-number">VERDÄCHTIGENFESTNAHME</span><h2>Fang den <span class="accent">Wurm.</span></h2>
      <p class="muted">Ein Verdächtiger versucht, sich der Festnahme zu entziehen. Tippe ihn achtmal an. Warum? Das ist geheim.</p>
      <div class="chase-grid">${Array.from({length:12},(_,i)=>`<button type="button" class="chase-cell ${i===position?'target':''}" data-pos="${i}" aria-label="${i===position?'Wurm fangen':'Leeres Feld'}">${i===position?'🪱':'·'}</button>`).join('')}</div>
      <p class="muted small" style="text-align:center">ERFOLGREICHE FESTNAHMEN</p><p class="count" style="text-align:center">${g.chase} <span class="muted" style="font-size:22px">/ 8</span></p>`);
    $$('.chase-cell.target').forEach(el=>el.onclick=()=>{
      g.chase++;save();
      if(g.chase>=8) success('ALLE 6 TESTS BESTANDEN','Du bist qualifiziert.', 'Wofür genau, wissen wir selbst noch nicht. Aber der Verdächtige ist erschöpft.', 'Bericht anhören →');
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
      ${i===0 ? '<div class="buttons" style="margin-top:0;margin-bottom:18px">'+button('play-signal','🔊 Seltsames Geräusch abspielen','ghost')+'</div>' : ''}
      <p class="muted small">Beantworte die Frage. Deine Antwort wird irgendwo protokolliert. Vermutlich.</p>
      <div class="choice-grid">${button('yes','JA','secondary')}${button('no','NEIN','secondary')}</div>`);
    if($('#play-signal')) $('#play-signal').onclick = playSignal;
    ['yes','no'].forEach(id=>$('#'+id).onclick=()=>{
      g.answers.push(id==='yes'?'JA':'NEIN'); g.question++;save();
      if(g.question>=QUESTIONS.length) next(); else render();
    });
  }
  function playSignal() {
    try {
      const Context=window.AudioContext||window.webkitAudioContext; if(!Context) return;
      const ctx=new Context();
      [120,162,93].forEach((freq,i)=>{
        const osc=ctx.createOscillator(),gain=ctx.createGain();
        const t=ctx.currentTime+i*0.36;osc.type='triangle';osc.frequency.setValueAtTime(freq,t);
        gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(0.045,t+0.05);
        gain.gain.exponentialRampToValueAtTime(0.001,t+0.31);osc.connect(gain);gain.connect(ctx.destination);
        osc.start(t);osc.stop(t+0.32);
      });
      setTimeout(()=>ctx.close().catch(()=>{}),1800);
    } catch (_) { /* Ton ist optional; die Mission bleibt auch ohne ihn spielbar. */ }
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
      <img class="fake-picture" src="${escapeHTML(cfg.fakeUnterkunft1)}" alt="Scherzhafte Unterkunft aus Kartons unter einer Brücke">
      <span class="fake-label">KATEGORIE: EXPERIMENTELL</span>
      <p class="muted" style="margin-top:15px">Direkte Autobahnanbindung. Luftige Architektur. Regionaler Charme.</p>
      <div class="buttons">${button('fake-next','Äh … weiter? →','full')}</div>`);
    $('#fake-next').onclick=()=>next();
  }
  function secondFake() {
    app.innerHTML=panel('DEIN GESCHENK // REISEUNTERLAGEN 2 / 4', `
      ${stamp('UPGRADE BESTÄTIGT')}
      <h2>Okay. Zugegeben.<br><span class="accent">Wir haben noch ein Upgrade.</span></h2>
      <img class="fake-picture" src="${escapeHTML(cfg.fakeUnterkunft2)}" alt="Scherzhaftes Mikro-Zimmer als zweite Fake-Unterkunft">
      <span class="fake-label">DELUXE VERSION</span>
      <p class="lead">Jetzt mit Etagenbett! Stauraum ist theoretisch vorhanden. Sauerstoff ebenfalls.</p>
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
    const map = image ? `<img class="map-img" src="${escapeHTML(image)}" alt="Karte unseres Reiseziels">` :
      `<iframe class="map-frame" title="Karte unseres Reiseziels: Braunlage im Harz" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${escapeHTML(cfg.googleMapsEmbed)}"></iframe>`;
    app.innerHTML=panel('DEIN GESCHENK // REISEUNTERLAGEN 4 / 4', `
      ${stamp('GENUG QUATSCH')}
      <h2>So. <span class="accent">Hier geht es wirklich hin.</span></h2>
      <p class="muted">Kein Karton. Keine Brücke. Die bisherige Unterkunft war eine bewusste Falschinformation.</p>
      ${map}
      <p class="muted small">Falls die Karte nicht angezeigt wird: <a href="${escapeHTML(cfg.googleMapsUrl)}" target="_blank" rel="noopener noreferrer">Standort auf Google Maps öffnen ↗</a></p>
      <div class="destination"><span class="small muted">REISEZIEL IDENTIFIZIERT</span><strong>${escapeHTML(cfg.ziel)}</strong></div>
      <div class="buttons">${button('map-next','Und wo schlafen wir? →','full')}</div>`);
    $('#map-next').onclick=()=>next();
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
