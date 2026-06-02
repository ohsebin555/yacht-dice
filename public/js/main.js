const game = {
  round:1, totalRounds:12, isPlayerTurn:true,
  rollsLeft:3, maxRolls:3, currentDice:[], phase:'idle',
  playerScores:{}, aiScores:{}, playerName:'나',
};

const abilitySystem = {
  type: null,
  // 저격: 1회, 더블찬스: 2회
  usesLeft: 0,
  usedThisTurn: false,
  sniperActive: false,

  init(type) {
    this.type = type;
    this.usesLeft = (type === 'sniper') ? 1 : 2;
    this.usedThisTurn = false;
    this.sniperActive = false;
  },

  canUse() {
    if (this.usesLeft <= 0) return false;
    if (this.usedThisTurn) return false;
    return true;
  },
};

let socket = null;
let myPlayerIndex = 0;
let isMyTurn = false;
let opponentName = 'AI';
let multiSelectedAbility = null;

const screenTitle   = document.getElementById('screen-title');
const screenMode    = document.getElementById('screen-mode');
const screenAbility = document.getElementById('screen-ability');
const screenGame    = document.getElementById('screen-game');
const screenResult  = document.getElementById('screen-result');
const btnRoll       = document.getElementById('btn-roll');
const btnAbility    = document.getElementById('btn-ability');
const rollsLeftEl   = document.getElementById('rolls-left');
const turnEl        = document.getElementById('turn-current');
const phaseEl       = document.getElementById('phase-msg');
const keepHintEl    = document.getElementById('keep-hint');

function playSFX(name, ...args) { try { SFX[name](...args); } catch(e) {} }

function showScreen(id) {
  [screenTitle, screenMode, screenAbility, screenGame, screenResult]
    .forEach(s => { if(s) s.classList.add('hidden'); });
  const screenMulti = document.getElementById('screen-multi');
  if (screenMulti) screenMulti.classList.add('hidden');
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function drawDice(value, size) {
  const cv=document.createElement('canvas');
  cv.width=size; cv.height=size;
  const ctx=cv.getContext('2d');
  const R=size*0.16;
  ctx.fillStyle='#F8F8F8';
  ctx.beginPath();
  ctx.moveTo(R,0); ctx.lineTo(size-R,0); ctx.quadraticCurveTo(size,0,size,R);
  ctx.lineTo(size,size-R); ctx.quadraticCurveTo(size,size,size-R,size);
  ctx.lineTo(R,size); ctx.quadraticCurveTo(0,size,0,size-R);
  ctx.lineTo(0,R); ctx.quadraticCurveTo(0,0,R,0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.10)'; ctx.lineWidth=size*0.025; ctx.stroke();
  const dotMap = {
    1:[[.5,.5]], 2:[[.28,.28],[.72,.72]], 3:[[.28,.28],[.5,.5],[.72,.72]],
    4:[[.28,.28],[.72,.28],[.28,.72],[.72,.72]],
    5:[[.28,.28],[.72,.28],[.5,.5],[.28,.72],[.72,.72]],
    6:[[.28,.2],[.72,.2],[.28,.5],[.72,.5],[.28,.8],[.72,.8]],
  };
  ctx.fillStyle=(value===1)?'#CC1111':'#1A1A3E';
  const DR=size*0.092;
  (dotMap[value]||[]).forEach(([px,py]) => {
    ctx.shadowColor='rgba(0,0,0,0.22)'; ctx.shadowBlur=size*0.04;
    ctx.shadowOffsetX=size*0.02; ctx.shadowOffsetY=size*0.02;
    ctx.beginPath(); ctx.arc(px*size,py*size,DR,0,Math.PI*2); ctx.fill();
  });
  ctx.shadowColor='transparent';
  return cv;
}

function createBgDice(containerId) {
  const container=document.getElementById(containerId);
  if (!container) return;
  container.innerHTML='';
  const rollAnims=['bgRoll1','bgRoll2','bgRoll3','bgFloat1','bgFloat2','bgFloat3'];
  for (let i=0; i<7; i++) {
    const value=Math.floor(Math.random()*6)+1;
    const size=Math.round(36+Math.random()*40);
    const cv=drawDice(value,size);
    cv.className='bg-die-canvas';
    const anim=rollAnims[Math.floor(Math.random()*rollAnims.length)];
    const dur=5+Math.random()*6;
    const delay=-(Math.random()*10);
    cv.style.cssText=`left:${Math.random()*88}%;top:${Math.random()*85}%;width:${size}px;height:${size}px;opacity:0.18;animation:${anim} ${dur}s ${delay}s ease-in-out infinite;`;
    container.appendChild(cv);
  }
  for (let g=0; g<3; g++) {
    const bx=8+Math.random()*75, by=8+Math.random()*72;
    const n=2+Math.floor(Math.random()*2);
    const baseSize=Math.round(30+Math.random()*24);
    for (let j=0; j<n; j++) {
      const value=Math.floor(Math.random()*6)+1;
      const cv=drawDice(value,baseSize);
      cv.className='bg-die-canvas';
      const rot=-30+Math.random()*60;
      const dx=(Math.random()-0.5)*18;
      const dy=-j*(baseSize*0.55);
      cv.style.cssText=`left:calc(${bx}% + ${dx}px);top:calc(${by}% + ${dy}px);width:${baseSize}px;height:${baseSize}px;transform:rotate(${rot}deg);opacity:0.13;z-index:${j};`;
      container.appendChild(cv);
    }
  }
}

createBgDice('bg-dice-wrap');
createBgDice('bg-dice-wrap2');
createBgDice('bg-dice-wrap3');

document.getElementById('player-name-input').addEventListener('keydown', e=>{ if(e.key==='Enter') goToMode(); });
document.getElementById('btn-to-mode').addEventListener('click', goToMode);

function goToMode() {
  const raw=document.getElementById('player-name-input').value.trim();
  game.playerName=raw||'나';
  showScreen('screen-mode');
}

document.getElementById('btn-ai-mode').addEventListener('click', ()=>{ showScreen('screen-ability'); });
document.getElementById('btn-user-mode').addEventListener('click', ()=>{ showScreen('screen-multi'); });

let selectedAbility=null;
document.querySelectorAll('.ability-choice-card').forEach(card => {
  card.addEventListener('click', ()=>{
    document.querySelectorAll('.ability-choice-card').forEach(c=>c.classList.remove('selected'));
    card.classList.add('selected');
    selectedAbility=card.dataset.ability;
    document.getElementById('btn-confirm-ability').disabled=false;
  });
});

document.getElementById('btn-confirm-ability').addEventListener('click', ()=>{
  if (!selectedAbility) return;
  abilitySystem.type=selectedAbility;
  startGame();
});

function startGame() {
  game.round=1; game.playerScores={}; game.aiScores={};
  abilitySystem.init(abilitySystem.type);
  document.getElementById('label-player').textContent=game.playerName;
  updateAbilityButton();
  showScreen('screen-game');
  setTimeout(()=>window.dispatchEvent(new Event('resize')),30);
  setTimeout(()=>playSFX('playStart'),150);
  startPlayerTurn();
}

function updateAbilityButton() {
  const ab = abilitySystem;
  const icons = { sniper:'🎯', doubleChance:'🎲' };
  const names = { sniper:'저격', doubleChance:'더블찬스' };
  document.getElementById('ability-btn-icon').textContent = icons[ab.type]||'⚡';
  document.getElementById('ability-btn-name').textContent = names[ab.type]||'능력';

  // 충전 표시 (저격은 1개, 더블찬스는 2개)
  const charge1 = document.getElementById('ability-charge-1');
  const charge2 = document.getElementById('ability-charge-2');
  if (ab.type === 'sniper') {
    charge1.className = 'charge' + (ab.usesLeft >= 1 ? '' : ' empty');
    charge2.style.display = 'none';
  } else {
    charge1.className = 'charge' + (ab.usesLeft >= 1 ? '' : ' empty');
    charge2.style.display = '';
    charge2.className = 'charge' + (ab.usesLeft >= 2 ? '' : ' empty');
  }

  const statusEl = document.getElementById('ability-btn-status');
  const btn = document.getElementById('btn-ability');

  if (!game.isPlayerTurn || game.phase === 'ai') {
    btn.disabled = true; btn.classList.remove('cooldown');
    statusEl.textContent = 'AI 턴'; return;
  }
  if (ab.usesLeft <= 0) {
    btn.disabled = true; btn.classList.add('cooldown');
    statusEl.textContent = '사용 완료'; return;
  }
  if (ab.usedThisTurn) {
    btn.disabled = true; btn.classList.add('cooldown');
    statusEl.textContent = '이번 턴 사용 완료'; return;
  }
  if (game.rollsLeft < 3) {
    btn.disabled = true; btn.classList.add('cooldown');
    statusEl.textContent = '굴리기 전에만 사용 가능'; return;
  }
  btn.disabled = false; btn.classList.remove('cooldown');
  statusEl.textContent = '사용 가능!';
}

document.getElementById('btn-ability').addEventListener('click', ()=>{
  if (!abilitySystem.canUse()) return;
  if (abilitySystem.type==='sniper') activateSniper();
  if (abilitySystem.type==='doubleChance') activateDoubleChance();
});

function activateSniper() {
  document.getElementById('sniper-modal').classList.remove('hidden');
  abilitySystem.sniperActive=true;
}

document.querySelectorAll('.sniper-num').forEach(btn => {
  btn.addEventListener('click', ()=>{
    const num=Number(btn.dataset.num);
    closeSniperModal();

    // 킵되지 않은 첫 번째 주사위에 숫자 확정 고정
    const target=diceMeshes.find(d=>!d.userData.kept);
    if (!target) return;
    const idx=target.userData.index;
    target.userData.value=num;
    target.userData.kept=true;
    target.userData.outline.visible=true;

    // 저격으로 고정된 주사위는 클릭해도 해제 안 되게 표시
    target.userData.sniped=true;

    diceBodies[idx].type=CANNON.Body.STATIC;
    diceBodies[idx].velocity.setZero();
    diceBodies[idx].angularVelocity.setZero();
    const targetEuler=TARGET_ROTS[num]||TARGET_ROTS[1];
    smoothMoveDie(idx,KEEP_SLOT_X[idx],DISPLAY_Y,KEEP_Z,targetEuler,350);

    useAbility();

    phaseEl.textContent=`🎯 저격! ${num} 확정 고정! (해제 불가)`;
    setTimeout(()=>{ phaseEl.textContent='주사위를 굴려주세요!'; },1200);
  });
});

document.getElementById('sniper-cancel').addEventListener('click', ()=>{ closeSniperModal(); });
function closeSniperModal() { document.getElementById('sniper-modal').classList.add('hidden'); abilitySystem.sniperActive=false; }

function activateDoubleChance() {
  game.rollsLeft++;
  rollsLeftEl.textContent=game.rollsLeft;
  useAbility();
  phaseEl.textContent='🎲 더블찬스! 굴리기 횟수 +1!';
  setTimeout(()=>{ phaseEl.textContent='주사위를 굴려주세요!'; },1200);
  btnRoll.disabled=false;
  updateAbilityButton();
}

function useAbility() {
  abilitySystem.usesLeft--;
  abilitySystem.usedThisTurn=true;
  playSFX('playClick');
  updateAbilityButton();
}

function startPlayerTurn() {
  game.isPlayerTurn=true; game.rollsLeft=3; game.maxRolls=3;
  abilitySystem.usedThisTurn=false;
  game.currentDice=[]; game.phase='rolling';
  turnEl.textContent=game.round;
  rollsLeftEl.textContent=3;
  btnRoll.disabled=false;
  btnRoll.textContent='🎲 주사위 굴리기';
  phaseEl.textContent='주사위를 굴려주세요!';
  phaseEl.className='phase-msg';
  keepHintEl.textContent='👆 굴린 후 주사위를 클릭하면 킵(고정)할 수 있어요';
  document.getElementById('label-player').textContent=game.playerName;
  document.getElementById('label-player').style.fontWeight='900';
  document.getElementById('label-ai').style.fontWeight='400';
  updateScoreCard(game.playerScores,game.aiScores,[],true,3,null);
  updateAbilityButton();
  // 매 턴 시작 시 저격 고정 초기화
diceMeshes.forEach(d => { d.userData.sniped = false; });
  resetDice();
  setCanInteract(false);
}

btnRoll.addEventListener('click', ()=>{
  if (!game.isPlayerTurn||game.rollsLeft<=0||game.phase==='idle') return;
  if (isRolling) return;
  const keptIdx=diceMeshes.filter(d=>d.userData.kept).map(d=>d.userData.index);
  btnRoll.disabled=true; setCanInteract(false);
  rollDice(keptIdx, values=>{
    game.currentDice=values; game.rollsLeft--;
    rollsLeftEl.textContent=game.rollsLeft;
    game.phase='choosing';
    if (game.rollsLeft>0) { btnRoll.disabled=false; phaseEl.textContent='주사위를 킵하거나 다시 굴리세요!'; }
    else { btnRoll.disabled=true; phaseEl.textContent='점수를 선택하세요! (점수판 클릭)'; }
    setCanInteract(true);
    updateAbilityButton();
    updateScoreCard(game.playerScores,game.aiScores,game.currentDice,true,game.rollsLeft,onPlayerScoreSelect);
  });
  playSFX('playDiceRoll');
});

function onPlayerScoreSelect(cat) {
  if (!game.isPlayerTurn) return;
  if (game.phase!=='choosing') return;
  if (game.playerScores[cat]!==undefined) return;
  if (game.currentDice.length<5) return;
  const score=ScoreCalc[cat](game.currentDice);
  game.playerScores[cat]=score;
  playSFX('playClick');
  if (cat==='yacht') setTimeout(()=>playSFX('playYacht'),80);
  phaseEl.textContent=`✅ ${CAT_NAMES[cat]}: ${score}점!`;
  btnRoll.disabled=true; setCanInteract(false); closeSniperModal();
  updateScoreCard(game.playerScores,game.aiScores,[],false,0,null);
  if (socket && socket.connected) {
    socket.emit('scoreSelect', { playerIndex:myPlayerIndex, cat, score });
    socket.emit('turnEnd', { turn:myPlayerIndex===0?1:0, round:game.round+1 });
    if (game.round>=game.totalRounds) showResults();
  } else {
    setTimeout(startAITurn, 800);
  }
}

function startAITurn() {
  game.isPlayerTurn=false; game.phase='ai';
  playSFX('playAITurn');
  phaseEl.textContent='🤖 AI 준비 중...';
  phaseEl.className='phase-msg ai-turn';
  btnRoll.disabled=true;
  keepHintEl.textContent='AI가 플레이 중입니다...';
  document.getElementById('label-player').style.fontWeight='400';
  document.getElementById('label-ai').style.fontWeight='900';
  updateAbilityButton();
  const avail=ALL_CATS.filter(c=>game.aiScores[c]===undefined);
  let aiDice=[], rollCnt=0;
  resetDice();

  function doAIRoll(keptIdx) {
    rollCnt++;
    phaseEl.textContent=`🤖 AI 굴리는 중... (${rollCnt}/3)`;
    rollDiceAI(keptIdx, values=>{
      aiDice=[...values];
      if (rollCnt<3) {
        const rollsRemaining=3-rollCnt;
        const nextKept=aiChooseDiceToKeep(aiDice,avail,rollsRemaining);
        diceMeshes.forEach(d=>{
          const idx=d.userData.index;
          const keep=nextKept.includes(idx);
          d.userData.kept=keep; d.userData.outline.visible=keep;
          const targetEuler=TARGET_ROTS[d.userData.value]||TARGET_ROTS[1];
          if (keep) {
            diceBodies[idx].type=CANNON.Body.STATIC;
            diceBodies[idx].velocity.setZero(); diceBodies[idx].angularVelocity.setZero();
            diceBodies[idx].position.set(KEEP_SLOT_X[idx],FLOOR_Y,KEEP_Z);
            smoothMoveDie(idx,KEEP_SLOT_X[idx],DISPLAY_Y,KEEP_Z,targetEuler,400);
          }
        });
        if (nextKept.length===5) { phaseEl.textContent='🤖 AI: 최적 패 확보!'; setTimeout(()=>aiSelectScore(aiDice,avail),700); return; }
        setTimeout(()=>doAIRoll(nextKept),950);
      } else {
        setTimeout(()=>aiSelectScore(aiDice,avail),600);
      }
    });
    playSFX('playDiceRoll');
  }

  function aiSelectScore(dice, availableCats) {
    const bestCat=aiChooseBestScore(dice,availableCats);
    const score=ScoreCalc[bestCat](dice);
    game.aiScores[bestCat]=score;
    playSFX('playClick');
    if (bestCat==='yacht') setTimeout(()=>playSFX('playYacht'),80);
    const msg=score>0?`🤖 AI: ${CAT_NAMES[bestCat]} → ${score}점!`:`🤖 AI: ${CAT_NAMES[bestCat]} → 0점 (희생)`;
    phaseEl.textContent=msg;
    updateScoreCard(game.playerScores,game.aiScores,[],false,0,null);
    setTimeout(()=>{ if(game.round>=game.totalRounds) showResults(); else { game.round++; startPlayerTurn(); } },1200);
  }

  setTimeout(()=>doAIRoll([]),600);
}

function showResults() {
  showScreen('screen-result');
  const pt=getTotal(game.playerScores), at=getTotal(game.aiScores);
  document.getElementById('result-player-total').textContent=pt;
  document.getElementById('result-ai-total').textContent=at;
  const rPlayerName=document.getElementById('result-player-name');
  const rThPlayer=document.getElementById('result-th-player');
  if (rPlayerName) rPlayerName.textContent=game.playerName;
  if (rThPlayer) rThPlayer.textContent=game.playerName;
  const el=document.getElementById('result-winner');
  if (pt>at) { el.textContent=`🏆 ${game.playerName} 승리!`; el.className='result-winner player-win'; setTimeout(()=>playSFX('playWin'),400); }
  else if (at>pt) { el.textContent='🤖 AI 승리!'; el.className='result-winner ai-win'; setTimeout(()=>playSFX('playLose'),400); }
  else { el.textContent='🤝 무 승 부!'; el.className='result-winner draw'; setTimeout(()=>playSFX('playDraw'),400); }
  const tbody=document.getElementById('result-tbody');
  tbody.innerHTML='';
  ALL_CATS.forEach(cat=>{
    const ps=game.playerScores[cat]??0, as=game.aiScores[cat]??0;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${CAT_NAMES[cat]}</td><td ${ps>as?'style="color:#fbbf24;font-weight:700"':''}>${ps}</td><td ${as>ps?'style="color:#f87171;font-weight:700"':''}>${as}</td>`;
    tbody.appendChild(tr);
  });
  const pu=getUpperSum(game.playerScores), au=getUpperSum(game.aiScores);
  const bTr=document.createElement('tr');
  bTr.style.borderTop='1px solid rgba(255,255,255,.15)';
  bTr.innerHTML=`<td style="color:#fbbf24">🎁 +35 보너스</td><td style="color:#fbbf24">${pu>=63?'+35':'0'}</td><td style="color:#fbbf24">${au>=63?'+35':'0'}</td>`;
  tbody.appendChild(bTr);
  const tTr=document.createElement('tr');
  tTr.style.cssText='border-top:2px solid rgba(167,139,250,.4);font-weight:700;';
  tTr.innerHTML=`<td style="color:#c4b5fd">합 계</td><td style="color:#c4b5fd">${pt}</td><td style="color:#c4b5fd">${at}</td>`;
  tbody.appendChild(tTr);
}

document.getElementById('btn-play-again').addEventListener('click', ()=>{
  selectedAbility=null;
  document.querySelectorAll('.ability-choice-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById('btn-confirm-ability').disabled=true;
  showScreen('screen-title');
  createBgDice('bg-dice-wrap');
});

// ══════════════════════════════════════════
//  멀티플레이 Socket.io
// ══════════════════════════════════════════
function initMulti() {
  socket = io();

  socket.on('roomCreated', (code) => {
    document.getElementById('multi-state-main').classList.add('hidden');
    document.getElementById('multi-state-wait').classList.remove('hidden');
    document.getElementById('room-code-big').textContent = code;
  });

  socket.on('playerJoined', ({ players }) => {
    document.getElementById('multi-state-wait').classList.add('hidden');
    document.getElementById('multi-state-ability').classList.remove('hidden');
  });

  socket.on('joinError', (msg) => { alert(msg); });

  socket.on('opponentReady', () => {
    document.getElementById('multi-opponent-status').classList.add('hidden');
    document.getElementById('multi-opponent-ready').classList.remove('hidden');
  });

  socket.on('gameStart', ({ players, firstTurn }) => {
    opponentName = players[myPlayerIndex===0?1:0].name;
    abilitySystem.type = players[myPlayerIndex].ability;
    abilitySystem.usesLeft = 2;
    abilitySystem.usedThisTurn = false;
    isMyTurn = myPlayerIndex===firstTurn;
    document.getElementById('label-ai').textContent = opponentName;
    startGame();
    if (!isMyTurn) {
      btnRoll.disabled = true;
      phaseEl.textContent = `${opponentName}의 턴...`;
    }
  });

  socket.on('opponentRoll', ({ values }) => {
    values.forEach((v,i) => { diceMeshes[i].userData.value=v; });
  });

  socket.on('opponentKeep', ({ idx, kept }) => {
    diceMeshes[idx].userData.kept=kept;
    diceMeshes[idx].userData.outline.visible=kept;
  });

  socket.on('scoreUpdate', ({ playerIndex, cat, score }) => {
    if (playerIndex!==myPlayerIndex) {
      game.aiScores[cat]=score;
      updateScoreCard(game.playerScores,game.aiScores,[],false,0,null);
    }
  });

  socket.on('nextTurn', ({ turn, round }) => {
    game.round=round;
    isMyTurn=turn===myPlayerIndex;
    if (isMyTurn) {
      startPlayerTurn();
    } else {
      btnRoll.disabled=true;
      phaseEl.textContent=`${opponentName}의 턴...`;
      phaseEl.className='phase-msg ai-turn';
      resetDice();
    }
  });

  socket.on('opponentLeft', () => {
    alert('상대방이 나갔어요!');
    location.reload();
  });
}

// 멀티플레이 버튼 이벤트
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const btnMultiReady = document.getElementById('btn-multi-ready');

if (btnCreateRoom) {
  btnCreateRoom.addEventListener('click', () => {
    myPlayerIndex=0;
    initMulti();
    socket.emit('createRoom', game.playerName);
    createBgDice('bg-dice-wrap4');
  });
}

if (btnJoinRoom) {
  btnJoinRoom.addEventListener('click', () => {
    const code=document.getElementById('input-room-code').value.toUpperCase();
    if (!code) { alert('방 코드를 입력하세요!'); return; }
    myPlayerIndex=1;
    initMulti();
    socket.emit('joinRoom', { roomCode:code, playerName:game.playerName });
    createBgDice('bg-dice-wrap4');
    document.getElementById('multi-state-main').classList.add('hidden');
    document.getElementById('multi-state-ability').classList.remove('hidden');
  });
}

document.querySelectorAll('#multi-choice-sniper, #multi-choice-double').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#multi-choice-sniper, #multi-choice-double')
      .forEach(c=>c.classList.remove('selected'));
    card.classList.add('selected');
    multiSelectedAbility=card.dataset.ability;
    if (btnMultiReady) btnMultiReady.disabled=false;
  });
});

if (btnMultiReady) {
  btnMultiReady.addEventListener('click', () => {
    if (!multiSelectedAbility) return;
    socket.emit('readyToStart', { ability:multiSelectedAbility });
    btnMultiReady.disabled=true;
    btnMultiReady.textContent='상대방 기다리는 중...';
  });
}
// ══════════════════════════════════════════
//  도움말
// ══════════════════════════════════════════
function openHelp() {
  const modal = document.getElementById('help-modal');
  if (modal) modal.classList.remove('hidden');
}
function closeHelp() {
  const modal = document.getElementById('help-modal');
  if (modal) modal.classList.add('hidden');
}

document.addEventListener('click', (e) => {
  if (e.target.id === 'help-close') closeHelp();
  if (e.target.id === 'help-modal') closeHelp();
  if (e.target.id === 'btn-help') openHelp();
  if (e.target.id === 'btn-help-ingame') openHelp();
});

showScreen('screen-title');