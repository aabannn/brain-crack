/* ---------------- MINI GAME RENDERERS ---------------- */
const RENDERERS = {};

// 1. CONSTELLATION - count the connected stars
RENDERERS.constellation = function(stage, answerArea, difficulty, cb){
  stage.classList.add(); // keep navy background (night sky)
  const numStars = Math.min(3 + difficulty, 9);
  const prompt = document.createElement('div');
  prompt.className = "prompt";
  prompt.textContent = "How many stars in the constellation?";
  stage.appendChild(prompt);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS,"svg");
  svg.setAttribute("width","100%");
  svg.setAttribute("height","100%");
  svg.style.position="absolute"; svg.style.inset="0";
  stage.appendChild(svg);

  // decorative background stars
  for(let i=0;i<14;i++){
    const c = document.createElementNS(svgNS,"circle");
    c.setAttribute("cx", 10+Math.random()*300);
    c.setAttribute("cy", 40+Math.random()*220);
    c.setAttribute("r", 1+Math.random()*1.2);
    c.setAttribute("fill", "rgba(255,255,255,0.5)");
    svg.appendChild(c);
  }

  const pts = [];
  const margin = 40;
  for(let i=0;i<numStars;i++){
    pts.push({
      x: margin + Math.random()*(300-margin*2),
      y: 50 + Math.random()*200
    });
  }
  for(let i=0;i<pts.length-1;i++){
    const line = document.createElementNS(svgNS,"line");
    line.setAttribute("x1",pts[i].x); line.setAttribute("y1",pts[i].y);
    line.setAttribute("x2",pts[i+1].x); line.setAttribute("y2",pts[i+1].y);
    line.setAttribute("stroke","#f2e98a"); line.setAttribute("stroke-width","2"); line.setAttribute("stroke-dasharray","3,3");
    svg.appendChild(line);
  }
  pts.forEach(p=>{
    const star = document.createElementNS(svgNS,"circle");
    star.setAttribute("cx",p.x); star.setAttribute("cy",p.y); star.setAttribute("r",6);
    star.setAttribute("fill","#f2e98a"); star.setAttribute("stroke","#fff"); star.setAttribute("stroke-width","1");
    svg.appendChild(star);
  });

  const grid = document.createElement('div');
  grid.className = "answer-grid";
  const lo = Math.max(2, numStars-2), hi = numStars+2;
  for(let n=lo; n<=hi; n++){
    const btn = document.createElement('button');
    btn.className = "answer-btn";
    btn.textContent = n;
    btn.onclick = ()=>{ revealAnswer(grid, btn, n===numStars); cb(n===numStars); };
    grid.appendChild(btn);
  }
  answerArea.appendChild(grid);
};

// 2. BOUNCING BALLS - tap highest or lowest ball
RENDERERS.balls = function(stage, answerArea, difficulty, cb){
  stage.classList.add("sky");
  const numBalls = Math.min(4 + difficulty, 9);
  const askHighest = Math.random() < 0.5;
  const prompt = document.createElement('div');
  prompt.className = "prompt";
  prompt.style.color = "#12201d";
  prompt.style.textShadow = "none";
  prompt.textContent = "Tap the " + (askHighest ? "HIGHEST" : "LOWEST") + " ball";
  stage.appendChild(prompt);

  const colors = ["#3d7dd6","#3aa35a","#e0b429","#d9622b","#8e4bd1","#2bb6b6","#d1447a","#8a8a2f","#c94f4f"];
  // Deterministic slot-based placement: divide the horizontal range into
  // numBalls even slots and jitter within each slot. This guarantees a
  // valid layout every time (the old random retry-until-no-collision loop
  // could never actually succeed once 7+ balls needed to fit with minimum
  // spacing in the available width, causing an infinite loop / frozen page).
  const rangeStart = 8, rangeEnd = 88;
  const slotWidth = (rangeEnd - rangeStart) / numBalls;
  const order = Array.from({length:numBalls}, (_,i)=>i).sort(()=>Math.random()-0.5);
  const positions = order.map((slotIdx)=>({
    top: 15 + Math.random()*65,
    left: rangeStart + slotIdx*slotWidth + slotWidth*0.15 + Math.random()*(slotWidth*0.7)
  }));
  let bestIdx = 0;
  positions.forEach((p,i)=>{
    if(askHighest ? p.top < positions[bestIdx].top : p.top > positions[bestIdx].top) bestIdx = i;
  });

  positions.forEach((p,i)=>{
    const ball = document.createElement('div');
    ball.className = "ball";
    ball.style.top = p.top + "%";
    ball.style.left = p.left + "%";
    ball.style.background = colors[i % colors.length];
    ball.textContent = i+1;
    ball.onclick = ()=>{
      const correct = i===bestIdx;
      ball.classList.add(correct?"flash-correct":"flash-wrong");
      if(!correct){
        const el = stage.children;
        for(const c of el){ if(c.textContent==String(bestIdx+1)) c.classList.add("flash-correct"); }
      }
      cb(correct);
    };
    stage.appendChild(ball);
  });
};

// 3. SPIDER'S WEB - ghost-leg puzzle, trace the exit
RENDERERS.web = function(stage, answerArea, difficulty, cb){
  const lines = Math.min(3 + difficulty, 7);
  const rows = Math.min(4 + difficulty, 9);
  const prompt = document.createElement('div');
  prompt.className = "prompt";
  prompt.textContent = "Where does the spider exit?";
  stage.appendChild(prompt);

  const svgNS = "http://www.w3.org/2000/svg";
  const W = 320, H = 280;
  const svg = document.createElementNS(svgNS,"svg");
  svg.setAttribute("viewBox", "0 0 "+W+" "+H);
  svg.style.position="absolute"; svg.style.inset="0"; svg.style.width="100%"; svg.style.height="100%";
  stage.appendChild(svg);

  const marginX = 30, topY = 58, botY = 250;
  const colX = [];
  for(let i=0;i<lines;i++){
    colX.push(marginX + i*((W-marginX*2)/(lines-1||1)));
  }
  const rowYs = [];
  for(let r=0;r<rows;r++) rowYs.push(topY + (r+1)*((botY-topY)/(rows+1)));

  // Generate rungs and trace the path; regenerate if the spider lands back
  // on its own starting column (the original game does the same - a puzzle
  // where the spider never actually changes direction is a boring puzzle).
  let rungs, startCol, exitCol;
  for(let attempt=0; attempt<8; attempt++){
    rungs = [];
    rowYs.forEach(y=>{
      const usedCols = new Set();
      const attempts = lines>1 ? Math.ceil(lines/2) : 0;
      for(let a=0;a<attempts;a++){
        const c = Math.floor(Math.random()*(lines-1));
        if(usedCols.has(c) || usedCols.has(c-1) || usedCols.has(c+1)) continue;
        if(Math.random()<0.55){
          rungs.push({y, colLeft:c});
          usedCols.add(c);
        }
      }
    });
    startCol = Math.floor(Math.random()*lines);
    let curCol = startCol;
    const sortedRungs = rungs.slice().sort((a,b)=>a.y-b.y);
    sortedRungs.forEach(r=>{
      if(r.colLeft === curCol) curCol = curCol+1;
      else if(r.colLeft === curCol-1) curCol = curCol-1;
    });
    exitCol = curCol;
    if(exitCol !== startCol) break; // good puzzle - spider actually moves
  }

  colX.forEach(x=>{
    const line = document.createElementNS(svgNS,"line");
    line.setAttribute("x1",x); line.setAttribute("y1",topY);
    line.setAttribute("x2",x); line.setAttribute("y2",botY);
    line.setAttribute("stroke","#dfe9f5"); line.setAttribute("stroke-width","2");
    svg.appendChild(line);
  });
  rungs.forEach(r=>{
    const line = document.createElementNS(svgNS,"line");
    line.setAttribute("x1",colX[r.colLeft]); line.setAttribute("y1",r.y);
    line.setAttribute("x2",colX[r.colLeft+1]); line.setAttribute("y2",r.y);
    line.setAttribute("stroke","#f2e98a"); line.setAttribute("stroke-width","3");
    svg.appendChild(line);
  });

  // spider icon at start
  const spider = document.createElementNS(svgNS,"text");
  spider.setAttribute("x", colX[startCol]);
  spider.setAttribute("y", topY-12);
  spider.setAttribute("text-anchor","middle");
  spider.setAttribute("font-size","22");
  spider.textContent = "\u{1F577}\uFE0F";
  svg.appendChild(spider);

  colX.forEach((x,i)=>{
    const t = document.createElementNS(svgNS,"text");
    t.setAttribute("x",x); t.setAttribute("y",botY+22);
    t.setAttribute("text-anchor","middle");
    t.setAttribute("fill","#f4f1e6"); t.setAttribute("font-size","16");
    t.textContent = i+1;
    svg.appendChild(t);
  });

  const grid = document.createElement('div');
  grid.className = "answer-grid";
  const webBtns = [];
  for(let i=0;i<lines;i++){
    const btn = document.createElement('button');
    btn.className = "answer-btn";
    btn.textContent = i+1;
    btn.onclick = ()=>{
      const correct = i===exitCol;
      revealAnswer(grid, btn, correct);
      if(!correct) webBtns[exitCol].classList.add("correct");
      cb(correct);
    };
    grid.appendChild(btn);
    webBtns.push(btn);
  }
  answerArea.appendChild(grid);
};

// 4. SHAPE ORDER - memorize and repeat the sequence of icons
RENDERERS.shapes = function(stage, answerArea, difficulty, cb){
  stage.classList.add("sky");
  const pool = ["\u26BD","\u2708\uFE0F","\uD83D\uDCF1","\uD83C\uDF88","\uD83C\uDFB2","\uD83C\uDF4E","\uD83D\uDE97","\uD83C\uDFB5","\u2B50","\uD83D\uDD11","\uD83C\uDF1E","\uD83C\uDF89"];
  const seqLen = difficulty === 1 ? 3 : difficulty === 2 ? 9 : 6;
  const seq = [];
  const shuffled = pool.slice().sort(()=>Math.random()-0.5);
  for(let i=0;i<seqLen;i++) seq.push(shuffled[i]);

  const prompt = document.createElement('div');
  prompt.className = "prompt";
  prompt.style.color = "#12201d"; prompt.style.textShadow="none";
  prompt.textContent = "Memorize the order";
  stage.appendChild(prompt);

  const big = document.createElement('div');
  big.className = "shape-big";
  stage.appendChild(big);

  let i = 0;
  const showNext = ()=>{
    if(i < seq.length){
      big.textContent = seq[i];
      i++;
      setTimeout(showNext, 750);
    }else{
      big.textContent = "?";
      buildAnswerUI();
    }
  };
  setTimeout(showNext, 400);

  function buildAnswerUI(){
    prompt.textContent = "Tap them back in order";
    const slots = document.createElement('div');
    slots.className = "shape-slots";
    seq.forEach(()=>{
      const s = document.createElement('div');
      s.className = "slot";
      slots.appendChild(s);
    });
    answerArea.appendChild(slots);

    const row = document.createElement('div');
    row.className = "shape-row";
    const answerOrder = seq.slice().sort(()=>Math.random()-0.5);
    let placed = 0;
    let failed = false;
    answerOrder.forEach((icon)=>{
      const btn = document.createElement('button');
      btn.className = "shape-btn";
      btn.textContent = icon;
      btn.onclick = ()=>{
        if(failed || btn.classList.contains('used')) return;
        const expected = seq[placed];
        if(icon === expected){
          slots.children[placed].textContent = icon;
          btn.classList.add('used');
          placed++;
          if(placed === seq.length){ cb(true); }
        }else{
          failed = true;
          btn.style.background = "var(--coral)";
          cb(false);
        }
      };
      row.appendChild(btn);
    });
    answerArea.appendChild(row);
  }
};

// 5. STILL AWAKE - simon-style sequence on a 3x3 grid
RENDERERS.simon = function(stage, answerArea, difficulty, cb){
  const prompt = document.createElement('div');
  prompt.className = "prompt";
  prompt.textContent = "Watch the pattern";
  stage.appendChild(prompt);

  const gridWrap = document.createElement('div');
  gridWrap.className = "grid3";
  gridWrap.style.marginTop = "40px";
  const cells = [];
  for(let i=0;i<9;i++){
    const c = document.createElement('div');
    c.className = "cell";
    gridWrap.appendChild(c);
    cells.push(c);
  }
  stage.appendChild(gridWrap);

  const seqLen = Math.min(3 + difficulty, 9);
  const seq = [];
  for(let i=0;i<seqLen;i++) seq.push(Math.floor(Math.random()*9));

  let i = 0;
  const playNext = ()=>{
    if(i>0) cells[seq[i-1]].classList.remove('lit');
    if(i < seq.length){
      cells[seq[i]].classList.add('lit');
      i++;
      setTimeout(playNext, 550);
    }else{
      setTimeout(()=>{
        cells[seq[seq.length-1]].classList.remove('lit');
        prompt.textContent = "Repeat it";
        enableInput();
      }, 500);
    }
  };
  setTimeout(playNext, 500);

  function enableInput(){
    let step = 0;
    let done = false;
    cells.forEach((cell, idx)=>{
      cell.style.cursor = "pointer";
      cell.onclick = ()=>{
        if(done) return;
        if(idx === seq[step]){
          cell.classList.add('lit-correct');
          setTimeout(()=>cell.classList.remove('lit-correct'),300);
          step++;
          if(step === seq.length){ done = true; cb(true); }
        }else{
          cell.classList.add('lit-wrong');
          done = true;
          cb(false);
        }
      };
    });
  }
};

function revealAnswer(container, chosenBtn, correct){
  Array.from(container.children).forEach(b=>b.onclick=null);
  chosenBtn.classList.add(correct ? "correct" : "wrong");
}
