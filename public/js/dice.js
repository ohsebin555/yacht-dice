// =============================================
//  dice.js v9
//  ✅ 겹침 버그 수정 (rollIdx 실제 인덱스 사용)
//  ✅ 주사위 간격 넓힘
//  ✅ 빠른 정착, 오름차순 정렬 복귀
// =============================================

const wrapper = document.getElementById('dice-canvas-wrapper');
const W = wrapper.clientWidth  || 800;
const H = wrapper.clientHeight || 480;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xC09848);

const camera = new THREE.PerspectiveCamera(44, W / H, 0.1, 100);
camera.position.set(0, 16, 5);
camera.lookAt(new THREE.Vector3(0, 0, 0));

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
wrapper.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.78));
const sun = new THREE.DirectionalLight(0xffffff, 0.7);
sun.position.set(3, 14, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const tableMesh = new THREE.Mesh(
  new THREE.BoxGeometry(50, 0.3, 40),
  new THREE.MeshPhongMaterial({ color: 0xB8862A })
);
tableMesh.position.y = -0.9;
tableMesh.receiveShadow = true;
scene.add(tableMesh);

for (let z = -14; z <= 14; z += 1.6) {
  const g = new THREE.Mesh(
    new THREE.BoxGeometry(50, 0.01, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xA07520, transparent: true, opacity: 0.28 })
  );
  g.position.set(0, -0.74, z);
  scene.add(g);
}

const TW       = 9.0;
const TD       = 9.0;
const TWH      = TW / 2;
const TDH      = TD / 2;
const WT       = 0.6;
const WH       = 1.2;
const OFT      = 0.5;
const FELT_TOP = 0.1;

const KEEP_Z          = -(TDH - 1.1);
const KZ_HALF         = 1.0;
const SLOT_SP         = TW / 5;
const SLOT_X0         = -(SLOT_SP * 2);
const ROLL_ZONE_Z_MIN = 0.5;
const ROLL_ZONE_Z_MAX = 3.0;
const ZONE_DIVIDER_Z  = KEEP_Z + KZ_HALF + 0.3;

const felt = new THREE.Mesh(
  new THREE.BoxGeometry(TW, 0.1, TD),
  new THREE.MeshPhongMaterial({ color: 0x7C0F0F, shininess: 4 })
);
felt.receiveShadow = true;
scene.add(felt);

const keepBg = new THREE.Mesh(
  new THREE.BoxGeometry(TW, 0.12, KZ_HALF * 2),
  new THREE.MeshPhongMaterial({ color: 0x141414 })
);
keepBg.position.set(0, 0.06, KEEP_Z);
scene.add(keepBg);

for (let i = 0; i < 5; i++) {
  const sb = new THREE.Mesh(
    new THREE.BoxGeometry(SLOT_SP - 0.15, 0.11, KZ_HALF * 2 - 0.2),
    new THREE.MeshPhongMaterial({ color: 0x222222 })
  );
  sb.position.set(SLOT_X0 + i * SLOT_SP, 0.055, KEEP_Z);
  scene.add(sb);
}

for (let i = 0; i <= 5; i++) {
  const div = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.16, KZ_HALF * 2),
    new THREE.MeshBasicMaterial({ color: 0xCCAA00, transparent: true, opacity: 0.7 })
  );
  div.position.set(SLOT_X0 - SLOT_SP / 2 + i * SLOT_SP, 0.08, KEEP_Z);
  scene.add(div);
}

const sep = new THREE.Mesh(
  new THREE.BoxGeometry(TW, 0.06, 0.07),
  new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.65 })
);
sep.position.set(0, 0.1, KEEP_Z + KZ_HALF);
scene.add(sep);

const iMat = new THREE.MeshPhongMaterial({ color: 0x1E1E1E, shininess: 25 });
[
  [TW+WT*2, WH, WT,   0,          WH/2-0.05,  TDH+WT/2],
  [TW+WT*2, WH, WT,   0,          WH/2-0.05, -TDH-WT/2],
  [WT, WH, TD+WT*2,   TWH+WT/2,   WH/2-0.05,  0],
  [WT, WH, TD+WT*2,  -TWH-WT/2,   WH/2-0.05,  0],
].forEach(([w,h,d,x,y,z]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), iMat);
  m.position.set(x,y,z); m.castShadow=true; scene.add(m);
});

const OF   = TWH + WT;
const oMat = new THREE.MeshPhongMaterial({ color: 0x4A4A4A, shininess: 60 });
[
  [TW+WT*2+OFT*2, 0.7, OFT,  0,          0.3,  OF+OFT/2],
  [TW+WT*2+OFT*2, 0.7, OFT,  0,          0.3, -OF-OFT/2],
  [OFT, 0.7, TD+WT*2+OFT*2,  OF+OFT/2,  0.3,  0],
  [OFT, 0.7, TD+WT*2+OFT*2, -OF+OFT/2,  0.3,  0],
].forEach(([w,h,d,x,y,z]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), oMat);
  m.position.set(x,y,z); scene.add(m);
});

const cMat = new THREE.MeshPhongMaterial({ color: 0x3A3A3A });
[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz]) => {
  const c = new THREE.Mesh(new THREE.BoxGeometry(OFT,0.85,OFT), cMat);
  c.position.set(sx*(OF+OFT/2), 0.37, sz*(OF+OFT/2));
  scene.add(c);
});

// ── 텍스처 ──
function createFaceTexture(number) {
  const SIZE = 256;
  const cv   = document.createElement('canvas');
  cv.width   = SIZE; cv.height = SIZE;
  const ctx  = cv.getContext('2d');
  const R    = 34;

  ctx.fillStyle = '#F4F4F4';
  ctx.beginPath();
  ctx.moveTo(R,2); ctx.lineTo(SIZE-R,2);
  ctx.quadraticCurveTo(SIZE-2,2,SIZE-2,R);
  ctx.lineTo(SIZE-2,SIZE-R);
  ctx.quadraticCurveTo(SIZE-2,SIZE-2,SIZE-R,SIZE-2);
  ctx.lineTo(R,SIZE-2);
  ctx.quadraticCurveTo(2,SIZE-2,2,SIZE-R);
  ctx.lineTo(2,R);
  ctx.quadraticCurveTo(2,2,R,2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#D0D0D0'; ctx.lineWidth=3; ctx.stroke();

  const dotMap = {
    1:[[.5,.5]],
    2:[[.28,.28],[.72,.72]],
    3:[[.28,.28],[.5,.5],[.72,.72]],
    4:[[.28,.28],[.72,.28],[.28,.72],[.72,.72]],
    5:[[.28,.28],[.72,.28],[.5,.5],[.28,.72],[.72,.72]],
    6:[[.28,.2],[.72,.2],[.28,.5],[.72,.5],[.28,.8],[.72,.8]],
  };

  ctx.fillStyle = (number===1) ? '#CC1111' : '#1A1A3E';
  const DR = SIZE * 0.092;
  (dotMap[number]||[]).forEach(([px,py]) => {
    ctx.shadowColor='rgba(0,0,0,0.28)'; ctx.shadowBlur=5;
    ctx.shadowOffsetX=2; ctx.shadowOffsetY=2;
    ctx.beginPath(); ctx.arc(px*SIZE,py*SIZE,DR,0,Math.PI*2); ctx.fill();
  });
  ctx.shadowColor='transparent';
  return new THREE.CanvasTexture(cv);
}

const FACE_VALUES = [3, 4, 1, 6, 2, 5];

const TARGET_ROTS = {
  1: new THREE.Euler(0,           0,           0),
  2: new THREE.Euler(-Math.PI/2,  0,           0),
  3: new THREE.Euler(0,           0,  Math.PI/2),
  4: new THREE.Euler(0,           0, -Math.PI/2),
  5: new THREE.Euler( Math.PI/2,  0,           0),
  6: new THREE.Euler( Math.PI,    0,           0),
};

function createDieMesh(index) {
  const geo  = new THREE.BoxGeometry(1.42, 1.42, 1.42);
  const mats = FACE_VALUES.map(v =>
    new THREE.MeshPhongMaterial({ map: createFaceTexture(v), shininess: 22 })
  );
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow=true; mesh.receiveShadow=true;

  const outline = new THREE.Mesh(
    new THREE.BoxGeometry(1.68,1.68,1.68),
    new THREE.MeshBasicMaterial({ color: 0xFFD700, side: THREE.BackSide })
  );
  outline.visible = false;
  mesh.add(outline);
  mesh.userData = { index, value:1, kept:false, outline };
  return mesh;
}

const DIE_HALF  = 0.71;
const FLOOR_Y   = FELT_TOP + DIE_HALF;
const DISPLAY_Y = FLOOR_Y + 0.9;
const ACTIVE_Y  = DISPLAY_Y;
const KEPT_Y    = DISPLAY_Y;

// ✅ 간격 넓힘
const INIT_X = [-3.6, -1.8, 0, 1.8, 3.6];
const INIT_Z = 2.0;

const KEEP_SLOT_X = [
  SLOT_X0,
  SLOT_X0 + SLOT_SP,
  SLOT_X0 + SLOT_SP*2,
  SLOT_X0 + SLOT_SP*3,
  SLOT_X0 + SLOT_SP*4,
];

const diceMeshes = [];
for (let i = 0; i < 5; i++) {
  const die = createDieMesh(i);
  die.position.set(INIT_X[i], DISPLAY_Y, INIT_Z);
  scene.add(die);
  diceMeshes.push(die);
}

// ── Cannon.js ──
const world = new CANNON.World();
world.gravity.set(0, -40, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 20;

const phyDiceMat   = new CANNON.Material('dice');
const phyGroundMat = new CANNON.Material('ground');
const phyWallMat   = new CANNON.Material('wall');

world.addContactMaterial(new CANNON.ContactMaterial(phyDiceMat, phyGroundMat, {
  friction: 0.45, restitution: 0.25
}));
world.addContactMaterial(new CANNON.ContactMaterial(phyDiceMat, phyDiceMat, {
  friction: 0.3, restitution: 0.2
}));
world.addContactMaterial(new CANNON.ContactMaterial(phyDiceMat, phyWallMat, {
  friction: 0.2, restitution: 0.25
}));

const groundBody = new CANNON.Body({ mass:0, material: phyGroundMat });
groundBody.addShape(new CANNON.Plane());
groundBody.position.set(0, FELT_TOP, 0);
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
world.addBody(groundBody);

function addPhysicsWall(px, py, pz, ax, ay, az, angle, mat) {
  const b = new CANNON.Body({ mass:0, material: mat||phyGroundMat });
  b.addShape(new CANNON.Plane());
  b.position.set(px, py, pz);
  b.quaternion.setFromAxisAngle(new CANNON.Vec3(ax, ay, az), angle);
  world.addBody(b);
}
addPhysicsWall( TWH, 0.6, 0,   0,1,0, -Math.PI/2);
addPhysicsWall(-TWH, 0.6, 0,   0,1,0,  Math.PI/2);
addPhysicsWall(0, 0.6,  TDH,   0,1,0,  Math.PI);
addPhysicsWall(0, 0.6, -TDH,   0,1,0,  0);

const dividerBody = new CANNON.Body({ mass:0, material: phyWallMat });
dividerBody.addShape(new CANNON.Box(new CANNON.Vec3(TWH, 0.8, 0.05)));
dividerBody.position.set(0, FELT_TOP + 0.8, ZONE_DIVIDER_Z);
world.addBody(dividerBody);

const diceBodies = [];
for (let i = 0; i < 5; i++) {
  const body = new CANNON.Body({
    mass: 1,
    material: phyDiceMat,
    linearDamping:  0.55,
    angularDamping: 0.65,
  });
  body.addShape(new CANNON.Box(new CANNON.Vec3(DIE_HALF, DIE_HALF, DIE_HALF)));
  body.position.set(INIT_X[i], DISPLAY_Y, INIT_Z);
  body.type = CANNON.Body.STATIC;
  world.addBody(body);
  diceBodies.push(body);
}

function getFaceUp(body) {
  const faces = [
    { vec: new CANNON.Vec3( 1, 0, 0), value: 3 },
    { vec: new CANNON.Vec3(-1, 0, 0), value: 4 },
    { vec: new CANNON.Vec3( 0, 1, 0), value: 1 },
    { vec: new CANNON.Vec3( 0,-1, 0), value: 6 },
    { vec: new CANNON.Vec3( 0, 0, 1), value: 2 },
    { vec: new CANNON.Vec3( 0, 0,-1), value: 5 },
  ];
  const up = new CANNON.Vec3(0, 1, 0);
  let best = -Infinity, result = 1;
  faces.forEach(({ vec, value }) => {
    const dot = body.quaternion.vmult(vec).dot(up);
    if (dot > best) { best = dot; result = value; }
  });
  return result;
}

function smoothMoveDie(idx, tx, ty, tz, targetEuler, duration) {
  const die       = diceMeshes[idx];
  const startPos  = die.position.clone();
  const startQuat = die.quaternion.clone();
  const endQuat   = new THREE.Quaternion().setFromEuler(targetEuler);
  const startTime = performance.now();

  function frame(now) {
    const t    = Math.min((now - startTime) / duration, 1.0);
    const ease = 1 - Math.pow(1 - t, 3);

    die.position.set(
      startPos.x + (tx - startPos.x) * ease,
      startPos.y + (ty - startPos.y) * ease,
      startPos.z + (tz - startPos.z) * ease
    );
    die.quaternion.slerpQuaternions(startQuat, endQuat, ease);

    if (t < 1.0) requestAnimationFrame(frame);
    else {
      die.position.set(tx, ty, tz);
      die.quaternion.copy(endQuat);
    }
  }
  requestAnimationFrame(frame);
}

let isRolling   = false;
let canInteract = false;

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

renderer.domElement.addEventListener('click', e => {
  if (!canInteract || isRolling) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(diceMeshes, true);
  if (!hits.length) return;
  let obj = hits[0].object;
  while (obj && !diceMeshes.includes(obj)) obj = obj.parent;
  if (obj) toggleKeep(obj.userData.index);
});

function toggleKeep(idx) {
  if (diceMeshes[idx].userData.sniped) return;
  const die = diceMeshes[idx];
  const body = diceBodies[idx];
  die.userData.kept = !die.userData.kept;
  die.userData.outline.visible = die.userData.kept;

  // 멀티플레이면 킵 상태 상대방에게 전송
  if (typeof socket !== 'undefined' && socket && socket.connected) {
    socket.emit('keepChange', { idx, kept: die.userData.kept });
  }
  body.type = CANNON.Body.STATIC;
  body.velocity.setZero();
  body.angularVelocity.setZero();

  const targetEuler = TARGET_ROTS[die.userData.value] || TARGET_ROTS[1];

  // ✅ 킵/해제할 때 딸깍 소리
  try { if (typeof SFX !== 'undefined') SFX.playKeep(); } catch (e) {}

  if (die.userData.kept) {
    const tx = KEEP_SLOT_X[idx];
    body.position.set(tx, FLOOR_Y, KEEP_Z);
    smoothMoveDie(idx, tx, DISPLAY_Y, KEEP_Z, targetEuler, 320);
  } else {
    // 킵 해제: 굴림 구역 주사위 전체 재정렬
    const freeIndices = diceMeshes
      .map((d, i) => ({ i, kept: d.userData.kept, value: d.userData.value }))
      .filter(d => !d.kept)
      .map(d => d.i);

    const sortedFree  = [...freeIndices].sort(
      (a, b) => diceMeshes[a].userData.value - diceMeshes[b].userData.value
    );
    const N           = sortedFree.length;
    const startOffset = Math.floor((5 - N) / 2);

    sortedFree.forEach((dieIdx, k) => {
      const targetX = INIT_X[startOffset + k];
      const d       = diceMeshes[dieIdx];
      const euler   = TARGET_ROTS[d.userData.value] || TARGET_ROTS[1];
      diceBodies[dieIdx].position.set(targetX, FLOOR_Y, INIT_Z);
      smoothMoveDie(dieIdx, targetX, DISPLAY_Y, INIT_Z, euler, 380);
    });
  }
}
// ✅ 겹침 방지 — rollIdx 실제 인덱스 사용
function getSafeStartPos(rollIdx, localIdx, keptIndices) {
  const minDist = 2.2;
  let sx, sz, safe;
  let attempts = 0;

  do {
    sx   = (Math.random() - 0.5) * (TW - 3.0);
    sz   = ROLL_ZONE_Z_MIN + Math.random() * (ROLL_ZONE_Z_MAX - ROLL_ZONE_Z_MIN);
    safe = true;

    // 킵된 주사위와 충돌 체크
    for (const ki of keptIndices) {
      const dx = sx - KEEP_SLOT_X[ki];
      const dz = sz - KEEP_Z;
      if (Math.sqrt(dx*dx + dz*dz) < minDist) { safe=false; break; }
    }

    // ✅ 이미 배치된 굴림 주사위와 충돌 체크 (실제 인덱스)
    if (safe) {
      for (let j = 0; j < localIdx; j++) {
        const prevIdx = rollIdx[j]; // ✅ 핵심 수정
        const bx = diceBodies[prevIdx].position.x;
        const bz = diceBodies[prevIdx].position.z;
        const dx = sx - bx;
        const dz = sz - bz;
        if (Math.sqrt(dx*dx + dz*dz) < minDist) { safe=false; break; }
      }
    }
    attempts++;
  } while (!safe && attempts < 50);

  return { sx, sz };
}

let settleTimer    = null;
let physicsRunning = false;

function rollDice(keptIndices, callback) {
  if (isRolling) return;
  isRolling      = true;
  physicsRunning = true;
  canInteract    = false;

  if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }

  const rollIdx = [0,1,2,3,4].filter(i => !keptIndices.includes(i));

  // ✅ getSafeStartPos에 rollIdx 전달
  rollIdx.forEach((i, localIdx) => {
    const body = diceBodies[i];
    const die  = diceMeshes[i];
    const { sx, sz } = getSafeStartPos(rollIdx, localIdx, keptIndices);

    body.type = CANNON.Body.DYNAMIC;
    body.mass = 1;
    body.updateMassProperties();
    body.position.set(sx, FLOOR_Y + 1.5, sz);

    body.velocity.set(
      (Math.random() - 0.5) * 4,
      12 + Math.random() * 5,
      (Math.random() - 0.5) * 3
    );
    body.angularVelocity.set(
      (Math.random() - 0.5) * 26,
      (Math.random() - 0.5) * 26,
      (Math.random() - 0.5) * 26
    );

    die.position.set(sx, FLOOR_Y + 1.5, sz);
  });

  let checkCount = 0;
  const MAX_CHECKS = 120;

  function checkSettled() {
    checkCount++;

    const allSettled = rollIdx.every(i => {
      const body = diceBodies[i];
      return (
        body.velocity.length()        < 0.5 &&
        body.angularVelocity.length() < 0.5 &&
        body.position.y                < FLOOR_Y + 0.8
      );
    });

    if (allSettled || checkCount >= MAX_CHECKS) {
      physicsRunning = false;

      const values = diceMeshes.map((die, i) => {
        if (keptIndices.includes(i)) return die.userData.value;
        const v = getFaceUp(diceBodies[i]);
        die.userData.value = v;
        return v;
      });

      rollIdx.forEach(i => {
        const body = diceBodies[i];
        body.type = CANNON.Body.STATIC;
        body.velocity.setZero();
        body.angularVelocity.setZero();
      });

      returnToLineSorted(rollIdx, values, keptIndices, callback);

    } else {
      settleTimer = setTimeout(checkSettled, 40);
    }
  }

  settleTimer = setTimeout(checkSettled, 500);
}

function returnToLineSorted(rollIdx, values, keptIndices, callback) {
  const DURATION    = 600;
  const N           = rollIdx.length;
  const sortedByVal = [...rollIdx].sort((a, b) => values[a] - values[b]);
  const startOffset = Math.floor((5 - N) / 2);
  const assignedX   = {};

  sortedByVal.forEach((dieIdx, k) => {
    assignedX[dieIdx] = INIT_X[startOffset + k];
  });

  const startStates = rollIdx.map(i => ({
    px:   diceMeshes[i].position.x,
    py:   diceMeshes[i].position.y,
    pz:   diceMeshes[i].position.z,
    quat: diceMeshes[i].quaternion.clone(),
  }));

  const targetStates = rollIdx.map(i => ({
    px:   assignedX[i],
    py:   DISPLAY_Y,
    pz:   INIT_Z,
    quat: new THREE.Quaternion().setFromEuler(TARGET_ROTS[values[i]] || TARGET_ROTS[1]),
  }));

  const startTime = performance.now();
  const tmpQ      = new THREE.Quaternion();

  function frame(now) {
    const t    = Math.min((now - startTime) / DURATION, 1.0);
    const ease = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

    rollIdx.forEach((i, idx) => {
      const die  = diceMeshes[i];
      const s    = startStates[idx];
      const tgt  = targetStates[idx];
      const arcY = Math.sin(t * Math.PI) * 1.0;

      die.position.set(
        s.px + (tgt.px - s.px) * ease,
        s.py + (tgt.py - s.py) * ease + arcY * (1 - ease * 0.8),
        s.pz + (tgt.pz - s.pz) * ease
      );
      tmpQ.slerpQuaternions(s.quat, tgt.quat, ease);
      die.quaternion.copy(tmpQ);
    });

    if (t < 1.0) {
      requestAnimationFrame(frame);
    } else {
      rollIdx.forEach((i, idx) => {
        const die = diceMeshes[i];
        const tgt = targetStates[idx];
        die.position.set(tgt.px, tgt.py, tgt.pz);
        die.quaternion.copy(tgt.quat);
        diceBodies[i].position.set(tgt.px, FLOOR_Y, tgt.pz);
      });

      isRolling   = false;
      canInteract = true;
      callback(values);
    }
  }

  requestAnimationFrame(frame);
}

function rollDiceAI(keptIndices, callback) {
  rollDice(keptIndices, callback);
}

function resetDice() {
  if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
  isRolling      = false;
  physicsRunning = false;
  canInteract    = false;

  diceMeshes.forEach((die, i) => {
    die.userData.kept  = false;
    die.userData.value = 1;
    die.userData.outline.visible = false;

    const body = diceBodies[i];
    body.type  = CANNON.Body.STATIC;
    body.velocity.setZero();
    body.angularVelocity.setZero();
    body.position.set(INIT_X[i], DISPLAY_Y, INIT_Z);
    body.quaternion.set(0,0,0,1);

    smoothMoveDie(i, INIT_X[i], DISPLAY_Y, INIT_Z, TARGET_ROTS[1], 350);
  });
}

function setCanInteract(v) {
  canInteract = v;
  renderer.domElement.style.cursor = v ? 'pointer' : 'default';
}

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now=performance.now();
  const delta=Math.min((now-lastTime)/1000,0.05);
  lastTime=now;

  if (physicsRunning) {
    world.step(1/60,delta,10);
    diceMeshes.forEach((die,i) => {
      if (die.userData.kept) return;
      const body=diceBodies[i];
      if (body.type!==CANNON.Body.DYNAMIC) return;
      die.position.set(body.position.x,body.position.y,body.position.z);
      die.quaternion.set(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w);
    });
  }

  // 항상 전송 (물리엔진 + smoothMoveDie 포함)
  if (typeof socket !== 'undefined' && socket && socket.connected &&
      typeof game !== 'undefined' && game.isPlayerTurn) {
    const diceState = diceMeshes.map(die => ({
      px: die.position.x, py: die.position.y, pz: die.position.z,
      qx: die.quaternion.x, qy: die.quaternion.y,
      qz: die.quaternion.z, qw: die.quaternion.w,
      kept: die.userData.kept,
      value: die.userData.value,
      sniped: die.userData.sniped || false,
    }));
    socket.emit('diceState', diceState);
  }

  renderer.render(scene,camera);
}
animate();

window.addEventListener('resize', () => {
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});