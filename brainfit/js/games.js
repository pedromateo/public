import { State, Engine } from "./engine.js";
import { ANAGRAM_POOL, ANTONYMS_POOL, SYNONYMS_POOL, PATTERNS_POOL, DOMINO_POOL, COUNT_TARGET_SETS, STROOP_COLORS, CONFIG, TEXTS } from "./data.js";

export function getDominoHalfHTML(dots) {
  const layouts = {
    0: [],
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };
  const activeDots = layouts[dots] || [];
  let dotsHTML = '';
  for (let i = 0; i < 9; i++) {
    if (activeDots.includes(i)) {
      dotsHTML += '<div class="domino-dot"></div>';
    } else {
      dotsHTML += '<div></div>';
    }
  }
  return `<div class="domino-half">${dotsHTML}</div>`;
}

/**
 * COLECCIÓN DE 17 MINIJUEGOS
 */
export const Games = {
  
  calc(container) {
    const a = 10 + Math.floor(Math.random()*30), b = 5 + Math.floor(Math.random()*20);
    const correct = a + b;
    const ops = new Set([correct]);
    while(ops.size < 4) ops.add(correct + (Math.floor(Math.random()*11)-5));
    const arr = Array.from(ops).sort(()=>Math.random()-0.5);

    container.innerHTML = `
      <div class="game-title">${TEXTS.calcTitle}</div>
      <div style="font-size:44px;font-weight:900;color:#db2777;margin-bottom:24px;text-shadow:2px 2px 0px #fbcfe8;">${a} + ${b} = ?</div>
      <div class="grid-2">
        ${arr.map(v => `<button id="btn-calc-${v}">${v}</button>`).join('')}
      </div>`;
    arr.forEach(v => document.getElementById(`btn-calc-${v}`).onclick = () => v === correct ? Engine.success() : Engine.fail());
  },

  mem_seq(container) {
    const items = ['🍎','🔔','⚽','🚗','⭐','💎','🔑'].sort(()=>Math.random()-0.5).slice(0,6);
    const target = items.slice(0,3);
    const dur = CONFIG[State.diffKey].mem;
    
    container.innerHTML = `
      <div class="game-title">${TEXTS.memTitle.replace('{seconds}', dur/1000)}</div>
      <div style="font-size:60px;letter-spacing:10px;margin:20px 0;text-shadow: 0 8px 10px rgba(0,0,0,0.15);" id="mem-show">${target.join(' ')}</div>
      <div id="mem-play" class="hidden">
        <div id="mem-out" style="font-size:42px;height:55px;color:#db2777;margin-bottom:16px;">___ ___ ___</div>
        <div class="grid-3">${items.sort(()=>Math.random()-0.5).map((v,i)=>`<button class="chip-btn" id="mem-b-${i}">${v}</button>`).join('')}</div>
      </div>`;
    
    let seq = [];
    const to = setTimeout(() => {
      document.getElementById('mem-show').classList.add('hidden');
      document.getElementById('mem-play').classList.remove('hidden');
      document.querySelector('.game-title').innerText = TEXTS.memPlayTitle;
    }, dur);
    Engine.addCleanup(() => clearTimeout(to));

    items.forEach((v,i) => {
      const btn = document.getElementById(`mem-b-${i}`);
      if(btn) btn.onclick = () => {
        if(State.isLocked) return;
        if(v !== target[seq.length]) return Engine.fail(TEXTS.memFail);
        seq.push(v); btn.classList.add('selected');
        document.getElementById('mem-out').innerText = seq.join('  ');
        if(seq.length===3) Engine.success();
      };
    });
  },

  // 3. STROOP MEJORADO (Pregunta aleatoria por TINTA o por PALABRA)
  stroop(container) {
    const textItem = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    let inkItem;
    do {
      inkItem = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    } while (inkItem.n === textItem.n);

    // 50% probabilidad de preguntar por tinta o por palabra
    const isInkQuestion = Math.random() > 0.5;
    const correctName = isInkQuestion ? inkItem.n : textItem.n;

    const promptHTML = isInkQuestion ? TEXTS.stroopInkPrompt : TEXTS.stroopWordPrompt;

    const options = [...STROOP_COLORS].sort(() => Math.random() - 0.5);

    container.innerHTML = `
      <div class="game-title">${promptHTML}</div>
      <div style="font-size:52px;font-weight:900;color:${inkItem.h};margin:20px 0;text-shadow: 2px 2px 0px rgba(0,0,0,0.1);letter-spacing:2px;">${textItem.n}</div>
      <div class="grid-2">${options.map(x=>`<button class="btn-neutral" id="str-${x.n}">${x.n}</button>`).join('')}</div>`;
      
    options.forEach(x => {
      document.getElementById(`str-${x.n}`).onclick = () => {
        if (x.n === correctName) Engine.success();
        else Engine.fail(TEXTS.stroopFail);
      };
    });
  },

  order_diff(container) {
    const isDesc = Math.random()>0.5;
    let n = []; while(n.length<5) { let x=10+Math.floor(Math.random()*80); if(!n.includes(x)) n.push(x); }
    const sorted = [...n].sort((a,b)=>isDesc ? b-a : a-b);
    
    container.innerHTML = `
      <div class="game-title">${TEXTS.orderTitle.replace('{order}', isDesc ? TEXTS.orderDesc : TEXTS.orderAsc)}</div>
      <div id="ord-out" style="font-size:28px;font-weight:900;color:#db2777;height:40px;margin-bottom:16px;">...</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
        ${n.map(x=>`<button class="chip-btn" style="min-width:65px" id="ord-${x}">${x}</button>`).join('')}
      </div>`;
    let sel = [];
    n.forEach(x => {
      const b = document.getElementById(`ord-${x}`);
      b.onclick = () => {
        if(State.isLocked || sel.includes(x)) return;
        if(x !== sorted[sel.length]) return Engine.fail(TEXTS.orderFail);
        sel.push(x); b.classList.add('selected');
        document.getElementById('ord-out').innerText = sel.join(' ➜ ');
        if(sel.length===5) Engine.success();
      }
    });
  },

  odd_grid(container) {
    const sets = [{b:'🍎',o:'🍏'},{b:'🕒',o:'🕕'},{b:'🔷',o:'🔹'},{b:'👵',o:'👵🏻'}];
    const s = sets[Math.floor(Math.random()*sets.length)];
    const odd = Math.floor(Math.random()*16);
    
    container.innerHTML = `
      <div class="game-title">${TEXTS.oddGridTitle}</div>
      <div class="grid-4">${Array(16).fill(0).map((_,i)=>`<button class="chip-btn" style="font-size:32px;padding:0;box-shadow: 0 4px 0 #cbd5e1" id="odd-${i}">${i===odd?s.o:s.b}</button>`).join('')}</div>`;
    for(let i=0;i<16;i++) document.getElementById(`odd-${i}`).onclick = () => i===odd ? Engine.success() : Engine.fail();
  },

  pattern(container) {
    const item = PATTERNS_POOL[Math.floor(Math.random() * PATTERNS_POOL.length)];
    const correct = item.c;
    const ops = [...item.ops].sort(() => Math.random() - 0.5);
    
    container.innerHTML = `
      <div class="game-title">${TEXTS.patternTitle}</div>
      <div style="font-size:36px;font-weight:900;color:#db2777;letter-spacing:2px;margin:20px 0;text-shadow:1px 1px 0 #fbcfe8;">${item.seq.join(', ')}, <span style="color:#d97706">?</span></div>
      <div class="grid-2">${ops.map(x=>`<button id="pat-${x}">${x}</button>`).join('')}</div>`;
    ops.forEach(x => document.getElementById(`pat-${x}`).onclick = () => x===correct ? Engine.success() : Engine.fail());
  },

  anagram(container) {
    const w = ANAGRAM_POOL[Math.floor(Math.random() * ANAGRAM_POOL.length)];
    const ops = [w.w, ...w.f].sort(() => Math.random() - 0.5);
    container.innerHTML = `
      <div class="game-title">${TEXTS.anagramTitle}</div>
      <div style="font-size:34px;font-weight:900;color:#d97706;letter-spacing:4px;margin:20px 0;text-shadow:1px 1px 0 #fef08a;">${w.s}</div>
      <div class="grid-2">${ops.map(x=>`<button class="btn-neutral" style="font-size:18px" id="ana-${x}">${x}</button>`).join('')}</div>`;
    ops.forEach(x => document.getElementById(`ana-${x}`).onclick = () => x===w.w ? Engine.success() : Engine.fail());
  },

  count_target(container) {
    const set = COUNT_TARGET_SETS[Math.floor(Math.random() * COUNT_TARGET_SETS.length)];
    const tg = set.target, ns = set.noise, label = set.name;
    const tc = 4 + Math.floor(Math.random() * 8);
    let arr = [];
    for (let i = 0; i < tc; i++) arr.push(tg);
    for (let i = 0; i < 25 - tc; i++) arr.push(ns);
    arr.sort(() => Math.random() - 0.5);

    const ops = new Set([tc]);
    while (ops.size < 4) ops.add(tc + Math.floor(Math.random() * 7) - 3);
    
    container.innerHTML = `
      <div class="game-title">${TEXTS.countTargetTitle.replace('{label}', label).replace('{target}', tg)}</div>
      <div class="grid-5" style="background:#fdf2f8;border:4px dashed #fbcfe8;padding:8px;border-radius:16px;font-size:26px;margin-bottom:16px;box-shadow:inset 0 4px 8px rgba(0,0,0,0.05);">
        ${arr.map(x=>`<div>${x}</div>`).join('')}
      </div>
      <div class="grid-4">${Array.from(ops).sort(()=>Math.random()-0.5).map(x=>`<button id="cnt-${x}">${x}</button>`).join('')}</div>`;
    ops.forEach(x => document.getElementById(`cnt-${x}`).onclick = () => x===tc ? Engine.success() : Engine.fail());
  },

  antonym(container) {
    const isSynonym = Math.random() > 0.5;
    const pool = isSynonym ? SYNONYMS_POOL : ANTONYMS_POOL;
    const item = pool[Math.floor(Math.random() * pool.length)];
    const ops = [item.c, ...item.f].sort(() => Math.random() - 0.5);
    
    const promptHTML = isSynonym ? TEXTS.synonymPrompt : TEXTS.antonymPrompt;

    container.innerHTML = `
      <div class="game-title">${promptHTML}</div>
      <div style="font-size:38px;font-weight:900;color:#0284c7;margin:20px 0;text-shadow: 1px 1px 0 #bae6fd;">"${item.w}"</div>
      <div class="grid-2">${ops.map(x=>`<button class="btn-neutral" style="font-size:18px" id="ant-${x}">${x}</button>`).join('')}</div>`;
    ops.forEach(x => document.getElementById(`ant-${x}`).onclick = () => x===item.c ? Engine.success() : Engine.fail());
  },

  equation_val(container) {
    const a=10+Math.floor(Math.random()*20), b=5+Math.floor(Math.random()*15);
    const isOk=Math.random()>0.5, res = isOk ? (a+b) : (a+b+(Math.random()>0.5?2:-2));
    container.innerHTML = `
      <div class="game-title">${TEXTS.equationTitle}</div>
      <div style="font-size:46px;font-weight:900;margin:24px 0;color:#db2777;text-shadow:2px 2px 0 #fbcfe8;">${a} + ${b} = ${res}</div>
      <div class="grid-2">
        <button class="btn-green" id="eq-ok">${TEXTS.btnYes}</button>
        <button class="btn-red" id="eq-no">${TEXTS.btnNo}</button>
      </div>`;
    document.getElementById('eq-ok').onclick = () => isOk ? Engine.success() : Engine.fail();
    document.getElementById('eq-no').onclick = () => !isOk ? Engine.success() : Engine.fail();
  },

  precision_stop(container) {
    container.innerHTML = `
      <div class="game-title">${TEXTS.precisionTitle}</div>
      <div class="precision-track" id="p-track">
        <div class="precision-target" style="left:40%;width:20%;"></div>
        <div class="precision-cursor" id="p-cursor"></div>
      </div>
      <button id="p-btn" style="width:100%;padding:20px;font-size:28px;">${TEXTS.btnStop}</button>`;
    
    let pos = 0, dir = 1;
    const speed = 2 * CONFIG[State.diffKey].speedMod;
    let rId;
    const cursor = document.getElementById('p-cursor');
    
    const loop = () => {
      pos += speed * dir;
      if (pos > 100) { pos=100; dir=-1; }
      if (pos < 0) { pos=0; dir=1; }
      if(cursor) cursor.style.left = pos + '%';
      rId = requestAnimationFrame(loop);
    };
    rId = requestAnimationFrame(loop);
    Engine.addCleanup(() => cancelAnimationFrame(rId));

    document.getElementById('p-btn').onclick = () => {
      cancelAnimationFrame(rId);
      if(pos >= 40 && pos <= 60) Engine.success(); else Engine.fail(TEXTS.precisionFail);
    };
  },

  swipe_sort(container) {
    const allItems = [
      {e:'🍎',t:'f'},{e:'🍌',t:'f'},{e:'🍇',t:'f'},{e:'🍉',t:'f'},
      {e:'🐶',t:'a'},{e:'🐱',t:'a'},{e:'🐰',t:'a'},{e:'🐻',t:'a'}
    ];
    let queue = [];
    for(let i=0; i<4; i++) queue.push(allItems[Math.floor(Math.random()*allItems.length)]);
    let currentIdx = 0;

    container.innerHTML = `
      <div class="game-title mb-2">${TEXTS.swipeTitle} <span id="sw-count" style="color:#2563eb;background:#dbeafe;padding:2px 8px;border-radius:12px;">(${currentIdx+1}/4)</span></div>
      <div style="font-size:90px; margin:20px 0; touch-action:none; transition: transform 0.1s; filter:drop-shadow(0 10px 10px rgba(0,0,0,0.15));" id="sw-item">${queue[currentIdx].e}</div>
      <div class="grid-2">
        <button class="btn-neutral" id="btn-sw-f" style="font-size:20px;">${TEXTS.btnFruit}</button>
        <button class="btn-neutral" id="btn-sw-a" style="font-size:20px;">${TEXTS.btnAnimal}</button>
      </div>`;
      
    const el = document.getElementById('sw-item');
    const countEl = document.getElementById('sw-count');

    const check = (t) => {
      if (State.isLocked) return;
      if (t === queue[currentIdx].t) {
        currentIdx++;
        if (currentIdx >= 4) {
          Engine.success();
        } else {
          el.style.transform = 'scale(0)';
          setTimeout(() => {
            el.innerText = queue[currentIdx].e;
            countEl.innerText = `(${currentIdx + 1}/4)`;
            el.style.transform = 'scale(1) rotate('+(Math.random()*20-10)+'deg)';
          }, 100);
        }
      } else {
        Engine.fail(TEXTS.swipeFail);
      }
    };
    
    document.getElementById('btn-sw-f').onclick = () => check('f');
    document.getElementById('btn-sw-a').onclick = () => check('a');

    let startX = 0;
    el.addEventListener('touchstart', e => startX = e.touches[0].clientX, {passive:true});
    el.addEventListener('touchend', e => {
      const dX = e.changedTouches[0].clientX - startX;
      if (dX < -40) check('f'); else if (dX > 40) check('a');
    });
  },

  catch_target(container) {
    const bubbleIcons = ['🎯', '🫧', '🍬', '⭐', '🎈', '🍭', '🍓', '✨'];
    let currentCatches = 0;
    const totalToCatch = 4;
    let moveInt;

    container.innerHTML = `
      <div class="game-title mb-2">${TEXTS.catchTitle} <span id="catch-count" style="color:#2563eb;background:#dbeafe;padding:2px 8px;border-radius:12px;">(${1}/${totalToCatch})</span></div>
      <div class="catch-area" id="catch-area">
        <div class="catch-target" id="catch-btn">🎯</div>
      </div>`;

    const btn = document.getElementById('catch-btn');
    const area = document.getElementById('catch-area');
    const countEl = document.getElementById('catch-count');

    const move = () => {
      if(!btn || !area) return;
      const maxX = area.clientWidth - 74, maxY = area.clientHeight - 74;
      btn.style.left = Math.max(8, Math.random() * maxX) + 'px';
      btn.style.top = Math.max(8, Math.random() * maxY) + 'px';
    };

    const spawnNextBubble = () => {
      if (currentCatches >= totalToCatch) {
        clearInterval(moveInt);
        return Engine.success();
      }
      countEl.innerText = `(${currentCatches + 1}/${totalToCatch})`;
      btn.innerText = bubbleIcons[Math.floor(Math.random() * bubbleIcons.length)];
      move();
    };

    const speedMs = 1200 / CONFIG[State.diffKey].speedMod;
    spawnNextBubble();
    moveInt = setInterval(move, speedMs);
    Engine.addCleanup(() => clearInterval(moveInt));

    const handleCatch = (e) => {
      if (e) e.preventDefault();
      if (State.isLocked) return;

      currentCatches++;
      btn.style.transform = 'scale(1.25)';
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
        spawnNextBubble();
      }, 100);
    };

    btn.onmousedown = btn.ontouchstart = handleCatch;
  },

  drag_drop(container) {
    const allShapes = [
      { icon: '🟩', bg: '#10b981' }, { icon: '🔵', bg: '#3b82f6' },
      { icon: '⭐', bg: '#f59e0b' }, { icon: '🔺', bg: '#ef4444' },
      { icon: '💜', bg: '#a855f7' }, { icon: '🌙', bg: '#1e293b' },
      { icon: '🍉', bg: '#e11d48' }, { icon: '🍋', bg: '#eab308' }
    ];
    
    const queue = [...allShapes].sort(() => Math.random() - 0.5).slice(0, 4);
    let currentIdx = 0;

    container.innerHTML = `
      <div class="game-title mb-2">${TEXTS.dragTitle} <span id="dd-count" style="color:#2563eb;background:#dbeafe;padding:2px 8px;border-radius:12px;">(1/4)</span></div>
      <div class="drag-canvas" id="dd-canvas">
        <div class="drag-slot" id="dd-slot"><div style="opacity:0.4;font-size:36px;filter:grayscale(100%);" id="dd-slot-icon"></div></div>
        <div class="drag-piece" id="dd-piece"></div>
      </div>`;

    const canvas = document.getElementById('dd-canvas');
    const slot = document.getElementById('dd-slot');
    const piece = document.getElementById('dd-piece');
    const countEl = document.getElementById('dd-count');

    let piecePos = { x: 0, y: 0 }, slotPos = { x: 0, y: 0 };
    let isDragging = false, touchStart = { x: 0, y: 0 }, initPiece = { x: 0, y: 0 };

    function spawnCurrentItem() {
      if (currentIdx >= 4) return Engine.success();
      const slotIcon = document.getElementById('dd-slot-icon');
      if (!canvas || !slot || !piece || !slotIcon || !countEl) return;

      countEl.innerText = `(${currentIdx + 1}/4)`;
      const item = queue[currentIdx];

      piece.innerText = item.icon;
      piece.style.backgroundColor = item.bg;
      slotIcon.innerText = item.icon;

      const cw = canvas.clientWidth || 320, ch = canvas.clientHeight || 260;
      let tries = 0;
      do {
        slotPos = { x: 10 + Math.floor(Math.random() * (cw - 88)), y: 10 + Math.floor(Math.random() * (ch - 88)) };
        piecePos = { x: 10 + Math.floor(Math.random() * (cw - 84)), y: 10 + Math.floor(Math.random() * (ch - 84)) };
        tries++;
      } while (Math.hypot(slotPos.x - piecePos.x, slotPos.y - piecePos.y) < 110 && tries < 30);

      slot.style.left = slotPos.x + 'px'; slot.style.top = slotPos.y + 'px';
      piece.style.transform = 'none'; piece.style.left = piecePos.x + 'px'; piece.style.top = piecePos.y + 'px';
    }

    function onStart(cx, cy) { if(State.isLocked) return; isDragging = true; touchStart = { x: cx, y: cy }; initPiece = { ...piecePos }; piece.style.zIndex=100; piece.style.transform="scale(1.1)"; }
    function onMove(cx, cy) { if(!isDragging) return; const dx = cx - touchStart.x, dy = cy - touchStart.y; piece.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`; }
    function onEnd() {
      if(!isDragging) return; isDragging = false; piece.style.zIndex=10;
      const r1 = piece.getBoundingClientRect(), r2 = slot.getBoundingClientRect();
      const c1 = { x: r1.left + r1.width/2, y: r1.top + r1.height/2 }, c2 = { x: r2.left + r2.width/2, y: r2.top + r2.height/2 };
      
      if (Math.hypot(c1.x - c2.x, c1.y - c2.y) < 46) {
        piece.style.transform = 'scale(0)'; currentIdx++;
        const to = setTimeout(spawnCurrentItem, 180);
        Engine.addCleanup(() => clearTimeout(to));
      } else {
        piece.style.transform = 'none'; piece.style.left = initPiece.x + 'px'; piece.style.top = initPiece.y + 'px';
      }
    }

    piece.addEventListener('touchstart', e => { e.preventDefault(); onStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    window.addEventListener('touchmove', e => { if (isDragging) { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); } }, { passive: false });
    window.addEventListener('touchend', () => onEnd());
    piece.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => onEnd());

    const initTo = setTimeout(spawnCurrentItem, 20);
    Engine.addCleanup(() => clearTimeout(initTo));
  },

  balance(container) {
    container.innerHTML = `
      <div class="game-title mb-2">${TEXTS.balanceTitle}</div>
      <div class="balance-container">
        <div class="balance-base"></div>
        <div class="balance-beam" id="b-beam">
          <div class="balance-weight" style="background:radial-gradient(circle at 30% 30%,#38bdf8,#0284c7)"></div><div class="balance-weight"></div>
        </div>
      </div>
      <button class="btn-red" style="width:100%;" id="b-btn">${TEXTS.btnBalancePush}</button>`;
      
    let ang = 0, balTime = 0;
    const beam = document.getElementById('b-beam');
    const cfg = CONFIG[State.diffKey] || CONFIG.medium;
    const fallSpd = cfg.balanceSpd;
    const pushPwr = cfg.balancePush;
    const goalMs = cfg.balanceGoalMs;
    const delayMs = cfg.balanceDelayMs !== undefined ? cfg.balanceDelayMs : (State.diffKey === 'hard' ? 500 : State.diffKey === 'medium' ? 1000 : 2000);
    const startTime = Date.now();
    let rId;
    
    const loop = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= delayMs) {
        ang += fallSpd;
        if (Math.abs(ang) < 10) {
          balTime += 16;
          if (balTime > goalMs) { cancelAnimationFrame(rId); return Engine.success(); }
        } else {
          balTime = 0;
        }
      }
      
      if (beam) beam.style.transform = `rotate(${ang}deg)`;
      
      if (Math.abs(ang) > 40) { cancelAnimationFrame(rId); return Engine.fail(TEXTS.balanceFail); }
      rId = requestAnimationFrame(loop);
    };
    rId = requestAnimationFrame(loop);
    Engine.addCleanup(() => cancelAnimationFrame(rId));

    document.getElementById('b-btn').onmousedown = document.getElementById('b-btn').ontouchstart = (e) => {
      e.preventDefault(); ang -= pushPwr;
    };
  },

  sudoku_missing(container) {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    const missingIndex = Math.floor(Math.random() * 9);
    const missingNumber = numbers[missingIndex];

    const opsSet = new Set([missingNumber]);
    while (opsSet.size < 4) {
      const distractor = 1 + Math.floor(Math.random() * 9);
      opsSet.add(distractor);
    }
    const ops = Array.from(opsSet).sort(() => Math.random() - 0.5);

    container.innerHTML = `
      <div class="game-title mb-2">${TEXTS.sudokuTitle}</div>
      <div class="sudoku-container">
        <div class="sudoku-grid">
          ${numbers.map((val, idx) => `
            <div class="sudoku-cell ${idx === missingIndex ? 'missing' : ''}">
              ${idx === missingIndex ? '?' : val}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="grid-4">
        ${ops.map(v => `<button id="sdk-btn-${v}">${v}</button>`).join('')}
      </div>`;

    ops.forEach(v => {
      document.getElementById(`sdk-btn-${v}`).onclick = () => {
        if (v === missingNumber) Engine.success();
        else Engine.fail(TEXTS.sudokuFail);
      };
    });
  },

  domino_order(container) {
    const isDesc = Math.random() > 0.5;
    const badgeText = isDesc ? TEXTS.dominoOrderDesc : TEXTS.dominoOrderAsc;
    const badgeClass = isDesc ? "desc" : "asc";

    let chosenTiles = [];
    let usedSums = new Set();
    const shuffledPool = [...DOMINO_POOL].sort(() => Math.random() - 0.5);

    for (let tile of shuffledPool) {
      const sum = tile.t + tile.b;
      if (!usedSums.has(sum)) {
        usedSums.add(sum);
        chosenTiles.push({ ...tile, sum: sum });
        if (chosenTiles.length === 4) break;
      }
    }

    const correctOrder = [...chosenTiles].sort((a, b) => isDesc ? b.sum - a.sum : a.sum - b.sum);
    let selectedOrder = [];

    container.innerHTML = `
      <div class="game-title mb-2">${TEXTS.dominoTitle}</div>
      <div class="domino-badge-container">
        <span class="domino-order-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div id="domino-progress" style="font-size:20px;font-weight:900;color:#db2777;min-height:30px;margin-bottom:12px;letter-spacing:1px;">
        ...
      </div>
      <div class="grid-4" id="domino-grid">
        ${chosenTiles.map((tile, i) => `
          <div class="domino-tile" id="dtile-${i}">
            ${getDominoHalfHTML(tile.t)}
            <div class="domino-line"></div>
            ${getDominoHalfHTML(tile.b)}
          </div>
        `).join('')}
      </div>`;

    const progressEl = document.getElementById('domino-progress');

    chosenTiles.forEach((tile, i) => {
      const tileEl = document.getElementById(`dtile-${i}`);
      tileEl.onclick = () => {
        if (State.isLocked || selectedOrder.includes(tile)) return;

        const currentStep = selectedOrder.length;
        if (tile.sum !== correctOrder[currentStep].sum) {
          return Engine.fail(TEXTS.dominoFail);
        }

        selectedOrder.push(tile);
        tileEl.classList.add('selected');
        progressEl.innerText = selectedOrder.map(d => d.sum + " pts").join(' ➜ ');

        if (selectedOrder.length === 4) {
          Engine.success();
        }
      };
    });
  },

  rps_inverted(container) {
    const choices = [
      { id: 'rock', icon: '🪨', wins: 'scissors', loses: 'paper' },
      { id: 'paper', icon: '📄', wins: 'rock', loses: 'scissors' },
      { id: 'scissors', icon: '✂️', wins: 'paper', loses: 'rock' }
    ];
    const target = choices[Math.floor(Math.random() * choices.length)];
    const winMode = Math.random() > 0.5;
    
    container.innerHTML = `
      <div class="game-title mb-2">${winMode ? TEXTS.rpsTitleWin : TEXTS.rpsTitleLose}</div>
      <div style="font-size: 80px; text-align: center; margin-bottom: 20px;">${target.icon}</div>
      <div class="grid-3">
        ${choices.map(c => `<button id="rps-${c.id}" style="font-size:40px; height:80px;">${c.icon}</button>`).join('')}
      </div>`;
      
    choices.forEach(c => {
      document.getElementById(`rps-${c.id}`).onclick = () => {
        if (State.isLocked) return;
        const isCorrect = winMode ? (c.wins === target.id) : (c.loses === target.id);
        if (isCorrect) Engine.success();
        else Engine.fail(TEXTS.rpsFail);
      };
    });
  },

  memory_matrix(container) {
    const size = State.diffKey === 'easy' ? 3 : 4;
    const count = State.diffKey === 'easy' ? 3 : (State.diffKey === 'medium' ? 4 : 5);
    const total = size * size;
    const cells = Array.from({length: total}, (_, i) => i);
    cells.sort(() => Math.random() - 0.5);
    const activeCells = cells.slice(0, count);
    
    const cfg = CONFIG[State.diffKey] || CONFIG.medium;
    const memTime = cfg.mem || 3500;
    
    container.innerHTML = `
      <div class="game-title mb-2" id="matrix-title">${TEXTS.matrixTitle.replace('{seconds}', (memTime/1000).toFixed(1))}</div>
      <div class="matrix-grid" style="display:grid; grid-template-columns: repeat(${size}, 1fr); gap: 10px; margin-top: 20px;">
        ${Array.from({length: total}, (_, i) => `
          <div id="mcell-${i}" style="aspect-ratio: 1; background: ${activeCells.includes(i) ? '#3b82f6' : '#e5e7eb'}; border-radius: 8px; transition: background 0.3s; cursor: pointer;"></div>
        `).join('')}
      </div>
    `;
    
    const to = setTimeout(() => {
      if (State.isLocked) return;
      document.getElementById('matrix-title').innerText = TEXTS.matrixPlayTitle;
      Array.from({length: total}, (_, i) => {
        const el = document.getElementById(`mcell-${i}`);
        el.style.background = '#e5e7eb';
        el.onclick = () => {
          if (State.isLocked) return;
          if (activeCells.includes(i)) {
            el.style.background = '#22c55e';
            el.onclick = null;
            activeCells.splice(activeCells.indexOf(i), 1);
            if (activeCells.length === 0) Engine.success();
          } else {
            el.style.background = '#ef4444';
            Engine.fail(TEXTS.matrixFail);
          }
        };
      });
    }, memTime);
    Engine.addCleanup(() => clearTimeout(to));
  },

  heavy_deduction(container) {
    const items = ['🍎', '🍉', '🍇', '🍌', '🍍', '🍒', '🍓', '🥥', '🥝'].sort(() => Math.random() - 0.5).slice(0, 3);
    const askMore = Math.random() > 0.5;
    const targetItem = askMore ? items[0] : items[2];
    const titleText = askMore 
      ? (TEXTS.heavyTitleMore || "¿Cuál es MÁS pesado?") 
      : (TEXTS.heavyTitleLess || "¿Cuál es MENOS pesado?");
    
    let rules = [];
    if (Math.random() > 0.5) {
      rules.push(`<div style="font-size:20px;margin-bottom:10px;"><span style="font-size:26px;vertical-align:middle;">${items[0]}</span> pesa <strong style="color:#d97706;">MÁS</strong> que <span style="font-size:26px;vertical-align:middle;">${items[1]}</span></div>`);
    } else {
      rules.push(`<div style="font-size:20px;margin-bottom:10px;"><span style="font-size:26px;vertical-align:middle;">${items[1]}</span> pesa <strong style="color:#2563eb;">MENOS</strong> que <span style="font-size:26px;vertical-align:middle;">${items[0]}</span></div>`);
    }
    
    if (Math.random() > 0.5) {
      rules.push(`<div style="font-size:20px;margin-bottom:10px;"><span style="font-size:26px;vertical-align:middle;">${items[1]}</span> pesa <strong style="color:#d97706;">MÁS</strong> que <span style="font-size:26px;vertical-align:middle;">${items[2]}</span></div>`);
    } else {
      rules.push(`<div style="font-size:20px;margin-bottom:10px;"><span style="font-size:26px;vertical-align:middle;">${items[2]}</span> pesa <strong style="color:#2563eb;">MENOS</strong> que <span style="font-size:26px;vertical-align:middle;">${items[1]}</span></div>`);
    }
    
    rules.sort(() => Math.random() - 0.5);
    const displayItems = [...items].sort(() => Math.random() - 0.5);
    
    container.innerHTML = `
      <div class="game-title mb-2">${titleText}</div>
      <div style="background:#f3f4f6; padding:15px; border-radius:12px; text-align:center; margin-bottom:20px;">
        ${rules.join('')}
      </div>
      <div class="grid-3">
        ${displayItems.map(i => `<button id="heavy-${i}" style="font-size:40px; height:80px;">${i}</button>`).join('')}
      </div>
    `;
    
    displayItems.forEach(i => {
      document.getElementById(`heavy-${i}`).onclick = () => {
        if (State.isLocked) return;
        if (i === targetItem) Engine.success();
        else Engine.fail(TEXTS.heavyFail);
      };
    });
  }
};