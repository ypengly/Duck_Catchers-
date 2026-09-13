/* ============================================================
   DUCK ROAD — a 3D endless road-crossing arcade game
   Original characters/art/sounds. Built with Three.js primitives.
   ============================================================ */

'use strict';

/* ---------------------------------------------------------
   CONSTANTS
--------------------------------------------------------- */
const COL_WIDTH   = 2;     // spacing between columns (left/right)
const ROW_DEPTH   = 2;     // spacing between rows (forward/back)
const COL_MIN     = -4;
const COL_MAX     = 4;
const LANE_HALF   = 15;    // how far off-screen vehicles/logs travel before wrapping
const ROWS_AHEAD  = 26;    // how many rows to keep generated ahead of the player
const ROWS_BEHIND = 6;     // how many rows to keep behind the player before culling
const MOVE_TIME   = 0.14;  // seconds for one grid step tween

/* ---------------------------------------------------------
   DUCK SKINS
--------------------------------------------------------- */
const DUCK_SKINS = [
  { id:'classic', name:'Classic Duck', emoji:'🦆', price:0,    body:0xFFD34D, beak:0xFF8C1A, free:true  },
  { id:'yellow',  name:'Yellow Duck',  emoji:'🐤', price:150,  body:0xFFE066, beak:0xFF9F1A },
  { id:'brown',   name:'Brown Duck',   emoji:'🦆', price:250,  body:0x9C6B3E, beak:0x5B3A1E },
  { id:'black',   name:'Black Duck',   emoji:'🦆', price:350,  body:0x2B2B2E, beak:0xE8A93B },
  { id:'white',   name:'White Duck',   emoji:'🦆', price:350,  body:0xF7F7F2, beak:0xFF9F1A },
  { id:'baby',    name:'Baby Duck',    emoji:'🥚', price:200,  body:0xFFF0A8, beak:0xFFB238, small:true },
  { id:'king',    name:'King Duck',    emoji:'👑', price:1200, body:0xF3D46B, beak:0xFF8C1A, hat:'crown' },
  { id:'cool',    name:'Cool Duck',    emoji:'🕶️', price:800,  body:0x5FC9E8, beak:0xFF8C1A, hat:'shades' },
  { id:'ninja',   name:'Ninja Duck',   emoji:'🥷', price:2000, body:0x33363B, beak:0xB3372C, hat:'headband' },
  { id:'cowboy',  name:'Cowboy Duck',  emoji:'🤠', price:900,  body:0xD9A15B, beak:0x8B4513, hat:'cowboy' },
  { id:'super',   name:'Super Duck',   emoji:'🦸', price:1500, body:0xE84B4B, beak:0xFFD34D, hat:'cape' },
  { id:'chef',    name:'Chef Duck',    emoji:'👨‍🍳', price:700,  body:0xF7F0E3, beak:0xFF8C1A, hat:'chef' },
  { id:'fancy',   name:'Fancy Duck',   emoji:'🎩', price:1000, body:0xE9DCC9, beak:0xFF8C1A, hat:'tophat' },
];

const ACHIEVEMENTS = [
  { id:'roads10',   icon:'🏆', name:'Road Warrior',   desc:'Cross 10 roads',            check: s => s.roadsCrossed >= 10 },
  { id:'bread100',  icon:'🍞', name:'Snack Time',      desc:'Collect 100 bread',         check: s => s.totalBread >= 100 },
  { id:'bread1000', icon:'🍞', name:'Bread Baron',     desc:'Collect 1,000 bread',       check: s => s.totalBread >= 1000 },
  { id:'km1',       icon:'🚩', name:'First Kilometer', desc:'Travel 1 kilometer total',  check: s => s.totalDistance >= 1000 },
  { id:'km5',       icon:'🏁', name:'Long Hauler',     desc:'Travel 5 kilometers total', check: s => s.totalDistance >= 5000 },
  { id:'avoid50',   icon:'💨', name:'Near Miss Pro',   desc:'Avoid 50 cars closely',     check: s => s.nearMisses >= 50 },
  { id:'rail10',    icon:'🚆', name:'Track Star',      desc:'Cross 10 railway tracks',   check: s => s.railsCrossed >= 10 },
  { id:'survive5',  icon:'⏱️', name:'Survivor',        desc:'Survive 5 minutes',         check: s => s.longestRunTime >= 300 },
  { id:'ducks5',    icon:'🦆', name:'Flock Starter',   desc:'Unlock 5 ducks',            check: s => s.ducksUnlocked >= 5 },
  { id:'ducksAll',  icon:'👑', name:'Whole Flock',     desc:'Unlock every duck',         check: s => s.ducksUnlocked >= DUCK_SKINS.length },
];

/* ---------------------------------------------------------
   SAVE SYSTEM  (js/saveSystem.js equivalent)
--------------------------------------------------------- */
const SaveSystem = {
  KEY: 'duckRoadSave_v1',
  data: null,
  defaults(){
    return {
      bestScore: 0,
      totalBread: 0,
      unlockedDucks: ['classic'],
      selectedDuck: 'classic',
      achievements: {},
      settings: { music:true, sound:true, shake:true },
      stats: { roadsCrossed:0, railsCrossed:0, totalBread:0, totalDistance:0, nearMisses:0, longestRunTime:0, ducksUnlocked:1 },
      owned: { trail:false, luckyStart:false },
      equipped: { trail:false, luckyStart:false }
    };
  },
  load(){
    try{
      const raw = localStorage.getItem(this.KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        this.data = Object.assign(this.defaults(), parsed);
        // deep-merge nested objects so new fields aren't lost
        this.data.settings = Object.assign(this.defaults().settings, parsed.settings || {});
        this.data.stats = Object.assign(this.defaults().stats, parsed.stats || {});
        this.data.owned = Object.assign(this.defaults().owned, parsed.owned || {});
        this.data.equipped = Object.assign(this.defaults().equipped, parsed.equipped || {});
      } else {
        this.data = this.defaults();
      }
    }catch(e){
      console.warn('Save load failed, using defaults', e);
      this.data = this.defaults();
    }
    return this.data;
  },
  save(){
    try{ localStorage.setItem(this.KEY, JSON.stringify(this.data)); }
    catch(e){ console.warn('Save failed', e); }
  },
  reset(){
    this.data = this.defaults();
    this.save();
  }
};

/* ---------------------------------------------------------
   AUDIO SYSTEM (js/audio.js equivalent)
   Procedural WebAudio beeps so the game works with zero asset
   files. Swap in real files later by pointing SOUND_URLS at
   /assets/audio/*.mp3 and this system will use them instead.
--------------------------------------------------------- */
const Audio_ = {
  ctx:null,
  musicOn:true, soundOn:true,
  musicGain:null,
  musicNodes:[],
  init(){
    try{
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }catch(e){ this.ctx = null; }
  },
  resume(){ if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  tone(freq, dur, type='sine', vol=0.18, delay=0){
    if(!this.ctx || !this.soundOn) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0+0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(t0); osc.stop(t0+dur+0.02);
  },
  sweep(f1,f2,dur,type='sine',vol=0.2){
    if(!this.ctx || !this.soundOn) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f2,1), t0+dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(t0); osc.stop(t0+dur+0.02);
  },
  step(){ this.tone(220+Math.random()*40, 0.05, 'square', 0.05); },
  bread(){ this.tone(880,0.08,'triangle',0.16); this.tone(1320,0.09,'triangle',0.13,0.05); },
  hit(){ this.sweep(220,60,0.35,'sawtooth',0.22); },
  splash(){ this.sweep(500,120,0.4,'sine',0.18); },
  powerup(){ this.tone(660,0.09,'square',0.15); this.tone(880,0.09,'square',0.15,0.08); this.tone(1100,0.12,'square',0.15,0.16); },
  achievement(){ this.tone(523,0.12,'triangle',0.18); this.tone(659,0.12,'triangle',0.18,0.1); this.tone(784,0.2,'triangle',0.2,0.2); },
  gameover(){ this.sweep(400,80,0.9,'sawtooth',0.2); },
  bell(){ this.tone(1400,0.15,'sine',0.15); this.tone(1400,0.15,'sine',0.12,0.25); },
  horn(){ this.tone(180,0.3,'sawtooth',0.12); },
  startMusicLoop(){
    if(!this.ctx || !this.musicOn) return;
    this.stopMusicLoop();
    const notes = [392,440,523,440,392,349,392,523];
    let i = 0;
    this.musicTimer = setInterval(()=>{
      if(!this.musicOn) return;
      this.tone(notes[i % notes.length], 0.35, 'sine', 0.05);
      i++;
    }, 420);
  },
  stopMusicLoop(){ if(this.musicTimer){ clearInterval(this.musicTimer); this.musicTimer = null; } }
};

/* ---------------------------------------------------------
   THREE.JS SCENE SETUP
--------------------------------------------------------- */
let scene, camera, renderer, hemiLight, sunLight;
let clock;

function initScene(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd3f4);
  scene.fog = new THREE.Fog(0x8fd3f4, 26, 62);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 200);

  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-container').appendChild(renderer.domElement);

  hemiLight = new THREE.HemisphereLight(0xffffff, 0x4a7c3c, 0.9);
  scene.add(hemiLight);

  sunLight = new THREE.DirectionalLight(0xfff3d6, 1.0);
  sunLight.position.set(-10, 18, 8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024,1024);
  sunLight.shadow.camera.left = -20;
  sunLight.shadow.camera.right = 20;
  sunLight.shadow.camera.top = 20;
  sunLight.shadow.camera.bottom = -20;
  sunLight.shadow.camera.far = 60;
  scene.add(sunLight);
  scene.add(sunLight.target);

  clock = new THREE.Clock();

  window.addEventListener('resize', onResize);
}
function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/* ---------------------------------------------------------
   MESH FACTORIES  (procedural primitives — no external assets)
--------------------------------------------------------- */
const MAT_CACHE = {};
function mat(color, opts={}){
  const key = color+JSON.stringify(opts);
  if(!MAT_CACHE[key]) MAT_CACHE[key] = new THREE.MeshStandardMaterial(Object.assign({color, roughness:0.75, metalness:0.05}, opts));
  return MAT_CACHE[key];
}

function buildDuck(skin){
  const g = new THREE.Group();
  const scale = skin.small ? 0.6 : 1.0;
  const bodyMat = mat(skin.body);
  const beakMat = mat(skin.beak, {roughness:0.5});

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42,16,14), bodyMat);
  body.scale.set(1,0.85,1.25);
  body.position.y = 0.42;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26,14,12), bodyMat);
  head.position.set(0,0.86,0.32);
  head.castShadow = true;
  g.add(head);
  g.userData.head = head;

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.11,0.26,10), beakMat);
  beak.rotation.x = Math.PI/2;
  beak.position.set(0,0.83,0.58);
  g.add(beak);

  const eyeGeo = new THREE.SphereGeometry(0.045,8,8);
  const eyeMat = mat(0x222222, {roughness:0.3});
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.11,0.93,0.5); g.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.11,0.93,0.5); g.add(eyeR);

  const wingGeo = new THREE.SphereGeometry(0.2,10,8);
  const wingMatM = mat(skin.body, {roughness:0.9});
  const wingL = new THREE.Mesh(wingGeo, wingMatM); wingL.scale.set(0.5,0.9,1); wingL.position.set(-0.4,0.42,-0.02); wingL.castShadow=true; g.add(wingL);
  const wingR = new THREE.Mesh(wingGeo, wingMatM); wingR.scale.set(0.5,0.9,1); wingR.position.set(0.4,0.42,-0.02); wingR.castShadow=true; g.add(wingR);
  g.userData.wingL = wingL; g.userData.wingR = wingR;

  const footGeo = new THREE.BoxGeometry(0.14,0.05,0.22);
  const footMat = mat(0xFF8C1A);
  const footL = new THREE.Mesh(footGeo, footMat); footL.position.set(-0.16,0.05,0.02); g.add(footL);
  const footR = new THREE.Mesh(footGeo, footMat); footR.position.set(0.16,0.05,0.02); g.add(footR);
  g.userData.footL = footL; g.userData.footR = footR;

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14,0.3,8), bodyMat);
  tail.rotation.x = -Math.PI/2.4;
  tail.position.set(0,0.55,-0.55);
  g.add(tail);

  // accessories
  if(skin.hat === 'crown'){
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.22,0.16,8), mat(0xFFD34D,{metalness:0.6,roughness:0.3}));
    crown.position.set(0,1.12,0.3); g.add(crown);
  } else if(skin.hat === 'shades'){
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.07,0.05), mat(0x111111,{roughness:0.2}));
    bar.position.set(0,0.94,0.56); g.add(bar);
  } else if(skin.hat === 'cowboy'){
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.04,14), mat(0x8B5A2B));
    brim.position.set(0,1.02,0.3); g.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,0.2,10), mat(0x8B5A2B));
    top.position.set(0,1.14,0.3); g.add(top);
  } else if(skin.hat === 'cape'){
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.5,0.04), mat(0x2255CC));
    cape.position.set(0,0.4,-0.32); g.add(cape);
  } else if(skin.hat === 'chef'){
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.16,0.32,12), mat(0xffffff));
    hat.position.set(0,1.15,0.28); g.add(hat);
  } else if(skin.hat === 'tophat'){
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.24,0.03,14), mat(0x1a1a1a));
    brim.position.set(0,1.0,0.3); g.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.26,14), mat(0x1a1a1a));
    top.position.set(0,1.15,0.3); g.add(top);
  } else if(skin.hat === 'headband'){
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.23,0.03,8,16), mat(0x992222));
    band.rotation.x = Math.PI/2; band.position.set(0,0.98,0.32); g.add(band);
  }

  g.scale.setScalar(scale);
  g.traverse(o => { if(o.isMesh) o.receiveShadow = false; });
  return g;
}

function buildVehicle(kind){
  const g = new THREE.Group();
  const colors = [0xE84B4B,0x4B7BE8,0xF2C230,0x4BE87E,0xE8934B,0x9B59B6,0x1ABC9C];
  const c = colors[Math.floor(Math.random()*colors.length)];
  let len = 1.4, wid = 0.9, hei = 0.6;
  if(kind === 'truck'){ len = 2.6; wid = 1.0; hei = 0.9; }
  else if(kind === 'bus'){ len = 3.2; wid = 1.05; hei = 1.1; }
  else if(kind === 'van'){ len = 2.0; wid = 1.0; hei = 0.85; }
  else if(kind === 'tractor'){ len = 1.8; wid = 0.9; hei = 0.95; }
  else if(kind === 'moto'){ len = 1.0; wid = 0.45; hei = 0.55; }

  const bodyM = mat(c, {roughness:0.4, metalness:0.3});
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, hei*0.6, wid), bodyM);
  body.position.y = hei*0.5;
  body.castShadow = true;
  g.add(body);

  if(kind !== 'moto'){
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(len*0.45, hei*0.5, wid*0.92), mat(0xDFF3FF,{transparent:true,opacity:0.55,roughness:0.1}));
    cabin.position.set(len*0.12, hei*0.85, 0);
    g.add(cabin);
  }
  const wheelGeo = new THREE.CylinderGeometry(hei*0.22,hei*0.22,wid*1.02,10);
  const wheelMat = mat(0x1a1a1a, {roughness:0.9});
  [[-len*0.32],[len*0.32]].forEach(([x])=>{
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI/2;
    wheel.position.set(x, hei*0.22, 0);
    g.add(wheel);
  });
  g.userData.length = len; g.userData.width = wid;
  return g;
}

function buildTrainSegment(idx, color){
  const g = new THREE.Group();
  const len = 3.4, wid = 1.5, hei = 1.6;
  const body = new THREE.Mesh(new THREE.BoxGeometry(len,hei,wid), mat(color, {roughness:0.4, metalness:0.4}));
  body.position.y = hei/2 + 0.15;
  body.castShadow = true;
  g.add(body);
  if(idx === 0){
    const nose = new THREE.Mesh(new THREE.ConeGeometry(hei*0.55,1.0,10), mat(color,{roughness:0.4}));
    nose.rotation.z = -Math.PI/2;
    nose.position.set(len/2+0.4, hei/2+0.15, 0);
    g.add(nose);
  }
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(len*1.01,0.25,wid*1.02), mat(0xFFFFFF));
  stripe.position.y = hei*0.4;
  g.add(stripe);
  g.userData.length = len; g.userData.width = wid;
  return g;
}

function buildTree(big){
  const g = new THREE.Group();
  const trunkH = big ? 1.6 : 1.0;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,trunkH,8), mat(0x7A5230));
  trunk.position.y = trunkH/2; trunk.castShadow = true;
  g.add(trunk);
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(big?0.85:0.55,10,8), mat(big?0x3E8E4F:0x4FAE5C));
  leaves.position.y = trunkH + (big?0.55:0.35);
  leaves.castShadow = true;
  leaves.scale.set(1,1.1,1);
  g.add(leaves);
  return g;
}

function buildRock(){
  const g = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3+Math.random()*0.2,0), mat(0x8C8C86,{roughness:0.95}));
  g.rotation.set(Math.random(),Math.random(),Math.random());
  g.castShadow = true;
  return g;
}

function buildHouse(){
  const g = new THREE.Group();
  const wallColor = [0xF4E3C1,0xE8C9A0,0xD9E4DC,0xF0D6D6][Math.floor(Math.random()*4)];
  const w = 1.6+Math.random()*0.6, d=1.4, h=1.2;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat(wallColor));
  walls.position.y = h/2; walls.castShadow = true;
  g.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(w*0.85,0.9,4), mat(0xA34A3A));
  roof.rotation.y = Math.PI/4;
  roof.position.y = h + 0.45;
  roof.castShadow = true;
  g.add(roof);
  return g;
}

function buildFence(len){
  const g = new THREE.Group();
  const postMat = mat(0xCBB58A);
  const n = Math.max(2, Math.round(len/0.5));
  for(let i=0;i<=n;i++){
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.5,0.08), postMat);
    post.position.set(-len/2 + i*(len/n), 0.25, 0);
    g.add(post);
  }
  const rail1 = new THREE.Mesh(new THREE.BoxGeometry(len,0.06,0.06), postMat);
  rail1.position.y = 0.38; g.add(rail1);
  const rail2 = rail1.clone(); rail2.position.y = 0.18; g.add(rail2);
  return g;
}

function buildBread(){
  const g = new THREE.Group();
  const loaf = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.14,0.22,4,8) : new THREE.SphereGeometry(0.18,10,8), mat(0xE0A05A));
  loaf.rotation.z = Math.PI/2;
  loaf.position.y = 0.35;
  loaf.castShadow = true;
  g.add(loaf);
  return g;
}

function buildPowerupMesh(type){
  const colors = { shield:0x4AA8FF, magnet:0xE84B4B, speed:0xFFD34D, life:0xFF6FA0, fly:0x6FE8D8, slow:0xB07CE8 };
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28,0), mat(colors[type]||0xffffff, {emissive:colors[type]||0x222222, emissiveIntensity:0.4, metalness:0.3, roughness:0.3}));
  core.position.y = 0.5;
  core.castShadow = true;
  g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42,0.035,8,20), mat(0xffffff,{emissive:0xffffff,emissiveIntensity:0.3}));
  ring.rotation.x = Math.PI/2.2;
  ring.position.y = 0.5;
  g.add(ring);
  g.userData.core = core; g.userData.ring = ring;
  return g;
}

/* ---------------------------------------------------------
   WORLD / PROCEDURAL ROW GENERATION (js/environment.js,
   js/traffic.js, js/trains.js, js/obstacles.js, js/collectibles.js)
--------------------------------------------------------- */
const HAZARD_TYPES = ['road','river','rail'];
const SAFE_TYPES = ['grass','village','forest'];
const VEHICLE_KINDS = ['car','car','truck','van','bus','tractor','moto'];

class World {
  constructor(){
    this.rows = new Map();       // rowIndex -> row data
    this.group = new THREE.Group();
    scene.add(this.group);
    this.zoneQueue = [];         // upcoming {type,length}
    this.lastHazard = null;
    this.generatedUpTo = -1;
    this.difficulty = 0;
    this.bindGeneratedRows = 0;
  }

  reset(){
    for(const row of this.rows.values()) this.group.remove(row.mesh);
    this.rows.clear();
    this.zoneQueue = [];
    this.lastHazard = null;
    this.generatedUpTo = -1;
    this.difficulty = 0;
    // guarantee a safe start
    for(let i=0;i<5;i++) this.zoneQueue.push({type:'grass', rowsLeft:1});
    this.ensureGenerated(ROWS_AHEAD);
  }

  setDifficulty(distRows){
    this.difficulty = Math.min(1, distRows/50);
  }

  pickNextZoneType(){
    const roll = Math.random();
    let pool;
    if(this.lastHazard){
      // force a safe buffer after a hazardous zone sometimes
      pool = Math.random() < 0.4 ? SAFE_TYPES : HAZARD_TYPES.filter(t=>t!==this.lastHazard).concat(SAFE_TYPES);
    } else {
      pool = roll < 0.55 ? HAZARD_TYPES : SAFE_TYPES;
    }
    const type = pool[Math.floor(Math.random()*pool.length)];
    return type;
  }

  nextZone(){
    if(this.zoneQueue.length === 0){
      const type = this.pickNextZoneType();
      const isHazard = HAZARD_TYPES.includes(type);
      const length = isHazard ? (3 + Math.floor(Math.random()*4)) : (2 + Math.floor(Math.random()*4));
      if(isHazard) this.lastHazard = type;
      for(let i=0;i<length;i++) this.zoneQueue.push({type});
    }
    return this.zoneQueue.shift().type;
  }

  ensureGenerated(targetRow){
    while(this.generatedUpTo < targetRow){
      this.generatedUpTo++;
      this.generateRow(this.generatedUpTo);
    }
  }

  cullBehind(minRow){
    for(const [idx,row] of this.rows){
      if(idx < minRow){
        this.group.remove(row.mesh);
        disposeGroup(row.mesh);
        this.rows.delete(idx);
      }
    }
  }

  generateRow(index){
    const type = index < 3 ? 'grass' : this.nextZone();
    const z = -index*ROW_DEPTH;
    const mesh = new THREE.Group();
    mesh.position.z = z;
    const row = { index, type, z, mesh, vehicles:[], logs:[], breads:[], powerup:null,
                  dir: Math.random()<0.5?1:-1, speed: 3, trainTimer: 2+Math.random()*3,
                  trainActive:false, trainWarn:false, trainDir:1, trainMeshes:[], trainX:0 };

    const groundColor = {
      grass:0x6FBF5E, village:0x7ECB6B, forest:0x4C8E52, road:0x555559, river:0x2E7FB8, rail:0x8C8368
    }[type];
    const ground = new THREE.Mesh(new THREE.BoxGeometry(COL_WIDTH*(COL_MAX-COL_MIN+3), 0.4, ROW_DEPTH), mat(groundColor));
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    mesh.add(ground);

    if(type === 'road'){
      this.decorateRoad(row, mesh);
    } else if(type === 'river'){
      this.decorateRiver(row, mesh);
    } else if(type === 'rail'){
      this.decorateRail(row, mesh);
    } else {
      this.decorateSafe(row, mesh, type);
    }

    // bread placement
    if(Math.random() < (type==='rail' ? 0.15 : 0.55)){
      const n = type==='road'||type==='rail' ? 1 : (1+Math.floor(Math.random()*2));
      const usedCols = new Set();
      for(let i=0;i<n;i++){
        let col = COL_MIN + Math.floor(Math.random()*(COL_MAX-COL_MIN+1));
        if(usedCols.has(col)) continue;
        usedCols.add(col);
        const bread = buildBread();
        bread.position.x = col*COL_WIDTH;
        bread.position.y = 0.15;
        mesh.add(bread);
        row.breads.push({ mesh:bread, col, collected:false, bobT: Math.random()*Math.PI*2 });
      }
    }

    // rare power-up
    if(Math.random() < 0.05){
      const types = ['shield','magnet','speed','life','fly','slow'];
      const ptype = types[Math.floor(Math.random()*types.length)];
      const pu = buildPowerupMesh(ptype);
      const col = COL_MIN + Math.floor(Math.random()*(COL_MAX-COL_MIN+1));
      pu.position.x = col*COL_WIDTH;
      mesh.add(pu);
      row.powerup = { mesh:pu, type:ptype, col, collected:false };
    }

    this.group.add(mesh);
    this.rows.set(index, row);
  }

  decorateSafe(row, mesh, type){
    const decoCols = [];
    for(let c=COL_MIN-2;c<=COL_MAX+2;c++){
      if(c>=COL_MIN-1 && c<=COL_MAX+1 && Math.random()<0.7) continue; // keep path mostly clear
      decoCols.push(c);
    }
    decoCols.forEach(c=>{
      if(Math.random() < 0.35){
        let deco;
        const r = Math.random();
        if(type === 'forest') deco = r<0.7 ? buildTree(true) : buildRock();
        else if(type === 'village') deco = r<0.5 ? buildHouse() : (r<0.8 ? buildFence(COL_WIDTH*0.9) : buildTree(false));
        else deco = r<0.6 ? buildTree(false) : buildFence(COL_WIDTH*0.9);
        deco.position.x = c*COL_WIDTH;
        deco.position.z = (Math.random()-0.5)*0.6;
        mesh.add(deco);
      }
    });
    if(type === 'forest' && Math.random()<0.3){
      row.foggy = true;
    }
  }

  decorateRoad(row, mesh){
    // lane markings
    for(let c=COL_MIN;c<=COL_MAX;c+=1){
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.02,0.12), mat(0xF2E9C9));
      dash.position.set(c*COL_WIDTH+1, 0.01, 0);
      mesh.add(dash);
    }
    row.speed = (2.2 + Math.random()*1.3) * (1 + this.difficulty*0.9);
    row.dir = Math.random()<0.5 ? 1 : -1;
    const density = 0.55 + this.difficulty*0.35;
    const gap = THREE.MathUtils.lerp(9, 5, this.difficulty) / density;
    let x = -LANE_HALF + Math.random()*gap;
    while(x < LANE_HALF){
      const kind = VEHICLE_KINDS[Math.floor(Math.random()*VEHICLE_KINDS.length)];
      const veh = buildVehicle(kind);
      veh.position.set(x, 0, 0);
      if(row.dir < 0) veh.rotation.y = Math.PI;
      mesh.add(veh);
      row.vehicles.push({ mesh:veh, x, length: veh.userData.length });
      x += gap * (0.8+Math.random()*0.5);
    }
  }

  decorateRiver(row, mesh){
    row.speed = (1.3+Math.random()*0.9) * (1+this.difficulty*0.6);
    row.dir = Math.random()<0.5 ? 1 : -1;
    let x = -LANE_HALF;
    while(x < LANE_HALF){
      const len = 1.6 + Math.random()*1.6;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,len,10), mat(0x8A5A34));
      log.rotation.z = Math.PI/2;
      log.position.set(x,0.05,0);
      log.castShadow = true;
      mesh.add(log);
      row.logs.push({ mesh:log, x, length:len });
      const gap = THREE.MathUtils.lerp(1.0, 2.0, Math.random()) + this.difficulty*0.4;
      x += len + gap;
    }
    // ripples decoration
    for(let i=0;i<3;i++){
      const ripple = new THREE.Mesh(new THREE.RingGeometry(0.3,0.4,12), mat(0xBFE6FF,{transparent:true,opacity:0.35}));
      ripple.rotation.x = -Math.PI/2;
      ripple.position.set((Math.random()-0.5)*LANE_HALF*1.6, 0.02, (Math.random()-0.5)*0.6);
      mesh.add(ripple);
    }
  }

  decorateRail(row, mesh){
    for(let c=COL_MIN-1;c<=COL_MAX+1;c++){
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.06,1.2), mat(0x5A4632));
      tie.position.set(c*COL_WIDTH,0.03,0);
      mesh.add(tie);
    }
    [-0.3,0.3].forEach(offset=>{
      const rail = new THREE.Mesh(new THREE.BoxGeometry(COL_WIDTH*(COL_MAX-COL_MIN+2),0.08,0.08), mat(0x999999,{metalness:0.7,roughness:0.3}));
      rail.position.set(0,0.08,offset);
      mesh.add(rail);
    });
    // warning light posts at both ends
    [COL_MIN-1.5, COL_MAX+1.5].forEach(cx=>{
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1.4,8), mat(0x3a3a3a));
      post.position.set(cx*COL_WIDTH,0.7,0.9);
      mesh.add(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8), new THREE.MeshStandardMaterial({color:0x550000, emissive:0x550000, emissiveIntensity:0.6}));
      lamp.position.set(cx*COL_WIDTH,1.4,0.9);
      mesh.add(lamp);
      row.warnLamps = row.warnLamps || [];
      row.warnLamps.push(lamp);
    });
    row.trainTimer = 2.5 + Math.random()*3.5 - this.difficulty*1.2;
    row.trainSpeed = (7+Math.random()*3) * (1+this.difficulty*0.5);
  }
}

function disposeGroup(group){
  group.traverse(o=>{
    if(o.isMesh){
      if(o.geometry) o.geometry.dispose();
    }
  });
}

/* ---------------------------------------------------------
   PLAYER (js/player.js)
--------------------------------------------------------- */
class Player {
  constructor(){
    this.group = new THREE.Group();
    scene.add(this.group);
    this.col = 0;
    this.row = 0;
    this.x = 0; this.z = 0; this.y = 0;
    this.targetX = 0; this.targetZ = 0;
    this.moving = false;
    this.moveT = 0;
    this.startX = 0; this.startZ = 0;
    this.facing = 0; // radians
    this.targetFacing = 0;
    this.state = 'idle'; // idle, moving, falling, hit, celebrating, flying
    this.stateT = 0;
    this.alive = true;
    this.invuln = 0;
    this.riverGrace = 0;
    this.bobT = Math.random()*10;
    this.setSkin(SaveSystem.data.selectedDuck);
  }

  setSkin(id){
    const skin = DUCK_SKINS.find(d=>d.id===id) || DUCK_SKINS[0];
    if(this.mesh) { this.group.remove(this.mesh); disposeGroup(this.mesh); }
    this.mesh = buildDuck(skin);
    this.group.add(this.mesh);
    this.skin = skin;
  }

  reset(){
    this.col = 0; this.row = 0;
    this.x = 0; this.z = 0;
    this.targetX = 0; this.targetZ = 0;
    this.moving = false; this.moveT = 0;
    this.facing = 0; this.targetFacing = 0;
    this.state = 'idle'; this.stateT = 0;
    this.alive = true; this.invuln = 1.0;
    this.riverGrace = 0.4;
    this.group.position.set(0,0,0);
    this.group.rotation.y = 0;
  }

  tryMove(dCol, dRow){
    if(this.moving || !this.alive || this.state==='falling' || this.state==='hit') return false;
    const newCol = THREE.MathUtils.clamp(this.col + dCol, COL_MIN, COL_MAX);
    const newRow = Math.max(0, this.row + dRow);
    if(newCol === this.col && newRow === this.row) return false;
    this.col = newCol;
    this.row = newRow;
    this.startX = this.x; this.startZ = this.z;
    this.targetX = this.col*COL_WIDTH;
    this.targetZ = -this.row*ROW_DEPTH;
    this.moving = true;
    this.moveT = 0;
    if(dRow > 0) this.targetFacing = 0;
    else if(dRow < 0) this.targetFacing = Math.PI;
    else if(dCol > 0) this.targetFacing = -Math.PI/2;
    else if(dCol < 0) this.targetFacing = Math.PI/2;
    this.riverGrace = 0.35;
    Audio_.step();
    return true;
  }

  update(dt, game){
    this.bobT += dt*6;
    if(this.invuln > 0) this.invuln -= dt;
    if(this.riverGrace > 0) this.riverGrace -= dt;

    if(this.moving){
      this.moveT += dt/MOVE_TIME;
      const t = Math.min(1, this.moveT);
      const ease = 1 - Math.pow(1-t,3);
      this.x = THREE.MathUtils.lerp(this.startX, this.targetX, ease);
      this.z = THREE.MathUtils.lerp(this.startZ, this.targetZ, ease);
      this.y = Math.sin(t*Math.PI) * 0.35;
      if(t >= 1){ this.moving = false; this.y = 0; }
    } else {
      this.y = Math.sin(this.bobT*0.5)*0.02;
    }

    // facing lerp (shortest path)
    let diff = this.targetFacing - this.facing;
    while(diff > Math.PI) diff -= Math.PI*2;
    while(diff < -Math.PI) diff += Math.PI*2;
    this.facing += diff * Math.min(1, dt*12);

    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.facing;

    // idle animation: gentle waddle + wing flap while moving
    if(this.mesh.userData.wingL){
      const flap = this.moving ? Math.sin(this.bobT*2)*0.5 : Math.sin(this.bobT*0.5)*0.08;
      this.mesh.userData.wingL.rotation.z = 0.3+flap;
      this.mesh.userData.wingR.rotation.z = -0.3-flap;
    }
    if(this.mesh.userData.head){
      this.mesh.userData.head.rotation.y = Math.sin(this.bobT*0.35)*0.15;
    }

    // state animations
    if(this.state === 'hit'){
      this.stateT += dt;
      this.group.rotation.z = Math.sin(this.stateT*40)*0.3*Math.max(0,1-this.stateT*2);
      if(this.stateT > 0.5){ this.state='idle'; this.group.rotation.z = 0; }
    } else if(this.state === 'falling'){
      this.stateT += dt;
      this.group.position.y -= dt*2.2*this.stateT;
      this.group.rotation.x += dt*6;
      this.mesh.scale.setScalar(Math.max(0.2, 1-this.stateT*1.2));
      if(this.stateT > 1.0 && game.lives > 0){
        this.row = Math.max(0, this.row-1);
        this.z = -this.row*ROW_DEPTH;
        this.x = this.col*COL_WIDTH;
        this.targetX = this.x; this.targetZ = this.z;
        this.startX = this.x; this.startZ = this.z;
        this.moving = false;
        this.group.position.set(this.x, 0, this.z);
        this.group.rotation.set(0, this.facing, 0);
        this.mesh.scale.setScalar(1);
        this.state = 'idle'; this.stateT = 0;
        this.invuln = 1.0;
        this.riverGrace = 0.6;
      }
    } else if(this.state === 'celebrating'){
      this.stateT += dt;
      this.group.position.y += Math.abs(Math.sin(this.stateT*10))*0.4;
      this.group.rotation.y += dt*8;
      if(this.stateT > 1.1){ this.state = 'idle'; this.stateT = 0; this.group.rotation.y = this.facing; }
    }

    if(game.powerUps.flyT > 0){
      this.group.position.y += 1.1 + Math.sin(this.bobT)*0.08;
    }
  }

  hit(){
    if(this.invuln > 0 || !this.alive) return;
    this.state = 'hit'; this.stateT = 0;
    this.invuln = 1.2;
  }

  fall(){
    if(this.invuln > 0 || !this.alive) return;
    this.state = 'falling'; this.stateT = 0;
    this.invuln = 1.2;
  }

  celebrate(){
    this.state = 'celebrating'; this.stateT = 0;
  }
}

/* ---------------------------------------------------------
   WEATHER (js/weather.js)
--------------------------------------------------------- */
const WEATHER_STATES = [
  { id:'sunny',  sky:0x8fd3f4, fog:0x8fd3f4, fogNear:26, fogFar:62, sun:0xfff3d6, sunI:1.0, hemi:0.9, rain:false, night:false },
  { id:'cloudy', sky:0xB9C6C8, fog:0xB9C6C8, fogNear:20, fogFar:50, sun:0xe8e8e8, sunI:0.7, hemi:0.7, rain:false, night:false },
  { id:'rain',   sky:0x6E7B82, fog:0x6E7B82, fogNear:14, fogFar:40, sun:0xcfd8dc, sunI:0.55, hemi:0.55, rain:true,  night:false },
  { id:'fog',    sky:0xCDD9D6, fog:0xCDD9D6, fogNear:8,  fogFar:26, sun:0xdfe8e6, sunI:0.5, hemi:0.6, rain:false, night:false },
  { id:'sunset', sky:0xF2A65A, fog:0xE8875A, fogNear:22, fogFar:56, sun:0xFF9E5E, sunI:0.85, hemi:0.6, rain:false, night:false },
  { id:'night',  sky:0x0E1A33, fog:0x0E1A33, fogNear:14, fogFar:40, sun:0x8899DD, sunI:0.25, hemi:0.25, rain:false, night:true },
];

class Weather {
  constructor(){
    this.current = WEATHER_STATES[0];
    this.target = WEATHER_STATES[0];
    this.blend = 1;
    this.timer = 20 + Math.random()*20;
    this.rainSystem = this.buildRain();
    this.streetLights = [];
  }
  buildRain(){
    const count = 600;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count*3);
    for(let i=0;i<count;i++){
      positions[i*3] = (Math.random()-0.5)*30;
      positions[i*3+1] = Math.random()*20;
      positions[i*3+2] = (Math.random()-0.5)*40 - 10;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
    const mat_ = new THREE.PointsMaterial({ color:0xAECBEA, size:0.12, transparent:true, opacity:0 });
    const pts = new THREE.Points(geo, mat_);
    scene.add(pts);
    return pts;
  }
  update(dt, playerZ){
    this.timer -= dt;
    if(this.timer <= 0){
      this.current = this.target;
      let next = WEATHER_STATES[Math.floor(Math.random()*WEATHER_STATES.length)];
      let tries = 0;
      while(next.id === this.current.id && tries < 5){ next = WEATHER_STATES[Math.floor(Math.random()*WEATHER_STATES.length)]; tries++; }
      this.target = next;
      this.blend = 0;
      this.timer = 35 + Math.random()*30;
    }
    if(this.blend < 1){
      this.blend = Math.min(1, this.blend + dt*0.25);
      const c1 = new THREE.Color(this.current.sky), c2 = new THREE.Color(this.target.sky);
      const sky = c1.clone().lerp(c2, this.blend);
      scene.background = sky;
      const f1 = new THREE.Color(this.current.fog), f2 = new THREE.Color(this.target.fog);
      scene.fog.color = f1.clone().lerp(f2, this.blend);
      scene.fog.near = THREE.MathUtils.lerp(this.current.fogNear, this.target.fogNear, this.blend);
      scene.fog.far = THREE.MathUtils.lerp(this.current.fogFar, this.target.fogFar, this.blend);
      sunLight.color = new THREE.Color(this.current.sun).lerp(new THREE.Color(this.target.sun), this.blend);
      sunLight.intensity = THREE.MathUtils.lerp(this.current.sunI, this.target.sunI, this.blend);
      hemiLight.intensity = THREE.MathUtils.lerp(this.current.hemi, this.target.hemi, this.blend);
      this.rainSystem.material.opacity = THREE.MathUtils.lerp(this.current.rain?0.6:0, this.target.rain?0.6:0, this.blend);
    }
    const isRaining = this.rainSystem.material.opacity > 0.05;
    if(isRaining){
      const pos = this.rainSystem.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){
        let y = pos.getY(i) - dt*14;
        if(y < 0){ y = 18; }
        pos.setY(i,y);
      }
      pos.needsUpdate = true;
      this.rainSystem.position.set(0,0,playerZ-6);
    }
  }
}

/* ---------------------------------------------------------
   PARTICLE BURST (simple collect / hit feedback)
--------------------------------------------------------- */
function spawnBurst(position, color, count=10){
  const geo = new THREE.SphereGeometry(0.05,6,6);
  const m = mat(color, {emissive:color, emissiveIntensity:0.6});
  const group = new THREE.Group();
  const parts = [];
  for(let i=0;i<count;i++){
    const p = new THREE.Mesh(geo, m);
    p.position.copy(position);
    const ang = Math.random()*Math.PI*2;
    const speed = 1.5+Math.random()*2;
    parts.push({ mesh:p, vx:Math.cos(ang)*speed, vy:2+Math.random()*2, vz:Math.sin(ang)*speed, life:0.6+Math.random()*0.3 });
    group.add(p);
  }
  scene.add(group);
  group.userData.parts = parts;
  group.userData.age = 0;
  ACTIVE_BURSTS.push(group);
}
const ACTIVE_BURSTS = [];
function updateBursts(dt){
  for(let i=ACTIVE_BURSTS.length-1;i>=0;i--){
    const g = ACTIVE_BURSTS[i];
    g.userData.age += dt;
    let allDead = true;
    g.userData.parts.forEach(p=>{
      if(p.life > 0){
        p.life -= dt;
        p.vy -= dt*6;
        p.mesh.position.x += p.vx*dt;
        p.mesh.position.y += p.vy*dt;
        p.mesh.position.z += p.vz*dt;
        p.mesh.scale.setScalar(Math.max(0,p.life));
        allDead = false;
      }
    });
    if(allDead){ scene.remove(g); disposeGroup(g); ACTIVE_BURSTS.splice(i,1); }
  }
}

/* ---------------------------------------------------------
   MAIN GAME CONTROLLER (js/game.js + js/ui.js + js/powerups.js
   + js/shop.js glue)
--------------------------------------------------------- */
class Game {
  constructor(){
    this.state = 'boot'; // boot, menu, playing, paused, gameover
    this.world = new World();
    this.player = new Player();
    this.weather = new Weather();
    this.camOffset = new THREE.Vector3(0, 6.2, 7.4);
    this.camShake = 0;
    this.resetRunStats();
    this.toastQueue = [];
    this.toastTimer = 0;
    this.newAchToShow = [];
    this.paused = false;
    this.bindInput();
    this.bindUI();
    this.applySettingsToUI();
  }

  resetRunStats(){
    this.score = 0;
    this.bread = 0;
    this.lives = 3;
    this.maxRowReached = 0;
    this.roadsCrossedRun = 0;
    this.railsCrossedRun = 0;
    this.nearMissesRun = 0;
    this.runTime = 0;
    this.powerUps = { shield:false, magnetT:0, speedT:0, flyT:0, slowT:0 };
  }

  /* ---------------- INPUT ---------------- */
  bindInput(){
    window.addEventListener('keydown', e=>{
      if(this.state !== 'playing') return;
      const k = e.key.toLowerCase();
      if(k==='w' || k==='arrowup') this.player.tryMove(0,1);
      else if(k==='s' || k==='arrowdown') this.player.tryMove(0,-1);
      else if(k==='a' || k==='arrowleft') this.player.tryMove(-1,0);
      else if(k==='d' || k==='arrowright') this.player.tryMove(1,0);
      else if(k==='escape') this.togglePause();
    });

    const cvs = ()=>renderer.domElement;
    let touchStart = null;
    const container = document.getElementById('game-container');
    container.addEventListener('touchstart', e=>{
      if(this.state !== 'playing') return;
      const t = e.changedTouches[0];
      touchStart = { x:t.clientX, y:t.clientY, t:performance.now() };
    }, {passive:true});
    container.addEventListener('touchend', e=>{
      if(this.state !== 'playing' || !touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      const THRESH = 24;
      if(Math.max(adx,ady) < THRESH){ touchStart = null; return; }
      if(adx > ady){ this.player.tryMove(dx>0?1:-1, 0); }
      else { this.player.tryMove(0, dy<0?1:-1); }
      touchStart = null;
    }, {passive:true});

    // on-screen dpad
    const dpad = { up:[0,1], down:[0,-1], left:[-1,0], right:[1,0] };
    ['up','down','left','right'].forEach(dir=>{
      const el = document.getElementById('tc-'+dir);
      const fire = (ev)=>{ ev.preventDefault(); if(this.state==='playing') this.player.tryMove(dpad[dir][0], dpad[dir][1]); };
      el.addEventListener('touchstart', fire, {passive:false});
      el.addEventListener('mousedown', fire);
    });
  }

  /* ---------------- UI WIRING ---------------- */
  showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
    if(id) document.getElementById(id).classList.remove('hidden');
  }

  bindUI(){
    document.getElementById('btn-play').addEventListener('click', ()=>{ Audio_.resume(); this.startRun(); });
    document.getElementById('btn-ducks').addEventListener('click', ()=>{ this.openDucks(); });
    document.getElementById('ducks-back').addEventListener('click', ()=>{ this.showScreen('screen-start'); this.refreshStartStats(); });
    document.getElementById('btn-shop').addEventListener('click', ()=>{ this.openShop(); });
    document.getElementById('shop-back').addEventListener('click', ()=>{ this.showScreen('screen-start'); this.refreshStartStats(); });
    document.getElementById('btn-achievements').addEventListener('click', ()=>{ this.openAchievements(); });
    document.getElementById('ach-back').addEventListener('click', ()=>{ this.showScreen('screen-start'); });
    document.getElementById('btn-settings').addEventListener('click', ()=>{ this.showScreen('screen-settings'); });
    document.getElementById('settings-back').addEventListener('click', ()=>{ this.showScreen('screen-start'); this.refreshStartStats(); });
    document.getElementById('btn-reset-save').addEventListener('click', ()=>{
      if(confirm('Reset all progress? This cannot be undone.')){ SaveSystem.reset(); this.applySettingsToUI(); this.refreshStartStats(); }
    });
    document.getElementById('btn-again').addEventListener('click', ()=>{ this.startRun(); });
    document.getElementById('btn-go-ducks').addEventListener('click', ()=>{ this.openDucks(); });
    document.getElementById('btn-go-home').addEventListener('click', ()=>{ this.showScreen('screen-start'); this.refreshStartStats(); });

    ['toggle-music','toggle-sound','toggle-shake'].forEach(id=>{
      document.getElementById(id).addEventListener('click', ()=>{
        const key = id.replace('toggle-','');
        SaveSystem.data.settings[key] = !SaveSystem.data.settings[key];
        SaveSystem.save();
        this.applySettingsToUI();
      });
    });

    document.getElementById('pause-btn').addEventListener('click', ()=>this.togglePause());
    document.getElementById('mute-btn').addEventListener('click', ()=>{
      SaveSystem.data.settings.sound = !SaveSystem.data.settings.sound;
      SaveSystem.save();
      this.applySettingsToUI();
    });
  }

  applySettingsToUI(){
    const s = SaveSystem.data.settings;
    Audio_.musicOn = s.music; Audio_.soundOn = s.sound;
    document.getElementById('toggle-music').classList.toggle('on', s.music);
    document.getElementById('toggle-sound').classList.toggle('on', s.sound);
    document.getElementById('toggle-shake').classList.toggle('on', s.shake);
    document.getElementById('mute-btn').textContent = s.sound ? '🔊' : '🔇';
    if(s.music) Audio_.startMusicLoop(); else Audio_.stopMusicLoop();
  }

  refreshStartStats(){
    document.getElementById('start-bread').textContent = SaveSystem.data.totalBread;
    document.getElementById('start-best').textContent = SaveSystem.data.bestScore;
  }

  openDucks(){
    const grid = document.getElementById('duck-grid');
    grid.innerHTML = '';
    DUCK_SKINS.forEach(skin=>{
      const unlocked = SaveSystem.data.unlockedDucks.includes(skin.id);
      const selected = SaveSystem.data.selectedDuck === skin.id;
      const card = document.createElement('div');
      card.className = 'duck-card' + (selected?' selected':'') + (unlocked?'':' locked');
      card.innerHTML = `<span class="duck-emoji">${skin.emoji}</span>
        <div class="duck-name">${skin.name}</div>
        <div class="duck-price">${unlocked ? (selected?'Selected':'Tap to select') : '🍞 '+skin.price}</div>`;
      card.addEventListener('click', ()=>{
        if(unlocked){
          SaveSystem.data.selectedDuck = skin.id;
          SaveSystem.save();
          this.player.setSkin(skin.id);
          this.openDucks();
        } else {
          if(SaveSystem.data.totalBread >= skin.price){
            SaveSystem.data.totalBread -= skin.price;
            SaveSystem.data.unlockedDucks.push(skin.id);
            SaveSystem.data.stats.ducksUnlocked = SaveSystem.data.unlockedDucks.length;
            SaveSystem.save();
            Audio_.powerup();
            this.checkAchievements();
            this.openDucks();
          } else {
            this.showToast("Not enough bread! 🍞 Need " + (skin.price - SaveSystem.data.totalBread) + " more");
          }
        }
      });
      grid.appendChild(card);
    });
    this.showScreen('screen-ducks');
  }

  openShop(){
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    const addRow = (name, desc, price, owned, onBuy)=>{
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `<div class="info"><b>${name}</b><span>${desc}</span></div>`;
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-small';
      btn.textContent = owned ? 'OWNED' : '🍞 ' + price;
      if(owned) btn.disabled = true;
      btn.addEventListener('click', onBuy);
      row.appendChild(btn);
      list.appendChild(row);
    };
    addRow('✨ Sparkle Trail', 'Leave a shimmering trail while you run', 500, SaveSystem.data.owned.trail, ()=>{
      if(SaveSystem.data.owned.trail) return;
      if(SaveSystem.data.totalBread >= 500){
        SaveSystem.data.totalBread -= 500; SaveSystem.data.owned.trail = true; SaveSystem.data.equipped.trail = true;
        SaveSystem.save(); Audio_.powerup(); this.openShop();
      } else this.showToast('Not enough bread! 🍞');
    });
    addRow('🛡️ Lucky Start', 'Begin every run with a free shield', 800, SaveSystem.data.owned.luckyStart, ()=>{
      if(SaveSystem.data.owned.luckyStart) return;
      if(SaveSystem.data.totalBread >= 800){
        SaveSystem.data.totalBread -= 800; SaveSystem.data.owned.luckyStart = true; SaveSystem.data.equipped.luckyStart = true;
        SaveSystem.save(); Audio_.powerup(); this.openShop();
      } else this.showToast('Not enough bread! 🍞');
    });
    DUCK_SKINS.filter(s=>!SaveSystem.data.unlockedDucks.includes(s.id)).forEach(skin=>{
      addRow(skin.emoji + ' ' + skin.name, 'Unlock this duck', skin.price, false, ()=>{
        if(SaveSystem.data.totalBread >= skin.price){
          SaveSystem.data.totalBread -= skin.price;
          SaveSystem.data.unlockedDucks.push(skin.id);
          SaveSystem.data.stats.ducksUnlocked = SaveSystem.data.unlockedDucks.length;
          SaveSystem.save(); Audio_.powerup(); this.checkAchievements();
          this.openShop();
        } else this.showToast('Not enough bread! 🍞');
      });
    });
    this.showScreen('screen-shop');
  }

  openAchievements(){
    const list = document.getElementById('ach-list');
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(a=>{
      const done = !!SaveSystem.data.achievements[a.id];
      const row = document.createElement('div');
      row.className = 'ach-row' + (done?' done':'');
      row.innerHTML = `<div class="ach-icon">${done?a.icon:'🔒'}</div><div class="ach-text"><b>${a.name}</b><span>${a.desc}</span></div>`;
      list.appendChild(row);
    });
    this.showScreen('screen-achievements');
  }

  checkAchievements(){
    const s = SaveSystem.data.stats;
    ACHIEVEMENTS.forEach(a=>{
      if(!SaveSystem.data.achievements[a.id] && a.check(s)){
        SaveSystem.data.achievements[a.id] = true;
        this.showToast('🏆 Achievement: ' + a.name);
        Audio_.achievement();
        if(this.state === 'playing' && this.player.state === 'idle') this.player.celebrate();
      }
    });
    SaveSystem.save();
  }

  showToast(text){
    this.toastQueue.push(text);
  }

  togglePause(){
    if(this.state !== 'playing' && this.state !== 'paused') return;
    this.paused = !this.paused;
    document.getElementById('pause-btn').textContent = this.paused ? '▶ RESUME' : '⏸ PAUSE';
  }

  /* ---------------- RUN LIFECYCLE ---------------- */
  startRun(){
    this.resetRunStats();
    if(SaveSystem.data.equipped.luckyStart) this.powerUps.shield = true;
    this.world.reset();
    this.player.reset();
    this.player.setSkin(SaveSystem.data.selectedDuck);
    this.state = 'playing';
    this.paused = false;
    document.getElementById('pause-btn').textContent = '⏸ PAUSE';
    this.showScreen(null);
    document.getElementById('hud').classList.remove('hidden');
    this.updateHUD();
  }

  endRun(){
    this.state = 'gameover';
    document.getElementById('hud').classList.add('hidden');
    const distanceM = Math.round(this.maxRowReached * 1.2);
    SaveSystem.data.stats.longestRunTime = Math.max(SaveSystem.data.stats.longestRunTime, this.runTime);
    SaveSystem.data.stats.totalDistance += distanceM;
    if(this.score > SaveSystem.data.bestScore) SaveSystem.data.bestScore = this.score;
    SaveSystem.save();
    this.checkAchievements();

    document.getElementById('go-score').textContent = this.score.toLocaleString();
    document.getElementById('go-distance').textContent = distanceM + 'm';
    document.getElementById('go-bread').textContent = this.bread;
    document.getElementById('go-best').textContent = SaveSystem.data.bestScore.toLocaleString();
    Audio_.gameover();
    this.showScreen('screen-gameover');
  }

  loseLife(){
    this.lives--;
    this.updateHUD();
    if(this.lives <= 0){
      setTimeout(()=>this.endRun(), 550);
    }
  }

  onHitObstacle(){
    if(this.powerUps.shield){ this.powerUps.shield = false; this.showToast('🛡️ Shield absorbed the hit!'); this.updatePowerupBar(); this.shakeCam(0.3); return; }
    if(this.powerUps.flyT > 0) return;
    if(this.player.invuln > 0) return;
    this.player.hit();
    Audio_.hit();
    this.shakeCam(0.4);
    this.loseLife();
  }

  onFallInWater(){
    if(this.powerUps.shield){ this.powerUps.shield = false; this.showToast('🛡️ Shield saved you from the water!'); this.updatePowerupBar(); return; }
    if(this.powerUps.flyT > 0) return;
    if(this.player.invuln > 0) return;
    this.player.fall();
    Audio_.splash();
    this.loseLife();
  }

  shakeCam(amount){
    if(SaveSystem.data.settings.shake) this.camShake = Math.max(this.camShake, amount);
  }

  /* ---------------- PER-FRAME UPDATE ---------------- */
  updateHUD(){
    document.getElementById('hud-hearts').textContent = '❤️'.repeat(Math.max(0,this.lives)) + '🖤'.repeat(Math.max(0,3-this.lives));
    document.getElementById('hud-score').textContent = 'SCORE: ' + this.score.toLocaleString();
    document.getElementById('hud-distance').textContent = 'DISTANCE: ' + Math.round(this.maxRowReached*1.2) + 'm';
    document.getElementById('hud-bread').textContent = '🍞 BREAD: ' + this.bread;
  }

  updatePowerupBar(){
    const bar = document.getElementById('powerup-bar');
    bar.innerHTML = '';
    const defs = [
      ['shield','🛡️', this.powerUps.shield ? 'ON' : null],
      ['magnet','🧲', this.powerUps.magnetT>0 ? Math.ceil(this.powerUps.magnetT)+'s' : null],
      ['speed','⚡', this.powerUps.speedT>0 ? Math.ceil(this.powerUps.speedT)+'s' : null],
      ['fly','🪽', this.powerUps.flyT>0 ? Math.ceil(this.powerUps.flyT)+'s' : null],
      ['slow','🐌', this.powerUps.slowT>0 ? Math.ceil(this.powerUps.slowT)+'s' : null],
    ];
    defs.forEach(([key,icon,val])=>{
      if(val){
        const chip = document.createElement('div');
        chip.className = 'powerup-chip';
        chip.innerHTML = `${icon}<small>${val}</small>`;
        bar.appendChild(chip);
      }
    });
  }

  activatePowerup(type){
    Audio_.powerup();
    if(type === 'shield'){ this.powerUps.shield = true; this.showToast('🛡️ Shield ready!'); }
    else if(type === 'magnet'){ this.powerUps.magnetT = 8; this.showToast('🧲 Bread Magnet!'); }
    else if(type === 'speed'){ this.powerUps.speedT = 6; this.showToast('⚡ Speed boost!'); }
    else if(type === 'life'){ this.lives = Math.min(5,this.lives+1); this.showToast('❤️ Extra life!'); this.updateHUD(); }
    else if(type === 'fly'){ this.powerUps.flyT = 6; this.showToast('🪽 Flying over danger!'); }
    else if(type === 'slow'){ this.powerUps.slowT = 7; this.showToast('🐌 Time slowed!'); }
    this.updatePowerupBar();
  }

  update(dt){
    updateBursts(dt);
    this.weather.update(dt, this.player.z);

    const isMenuIdle = this.state !== 'playing';
    const slowFactorAmbient = 1;

    // keep the world alive in the background even on menu screens
    // (cars keep driving past so the start menu feels alive)
    const aheadRow0 = Math.ceil(-this.player.z/ROW_DEPTH) + ROWS_AHEAD;
    this.world.setDifficulty(this.maxRowReached);
    this.world.ensureGenerated(aheadRow0);
    if(!isMenuIdle) this.world.cullBehind(this.player.row - ROWS_BEHIND);
    for(const row of this.world.rows.values()){
      this.updateRow(row, dt, isMenuIdle ? slowFactorAmbient : (this.powerUps.slowT>0?0.4:1));
    }

    if(isMenuIdle || this.paused){
      this.render();
      return;
    }

    this.runTime += dt;

    // power-up timers
    let dirty = false;
    ['magnetT','speedT','flyT','slowT'].forEach(k=>{
      if(this.powerUps[k] > 0){ this.powerUps[k] = Math.max(0, this.powerUps[k]-dt); dirty = true; }
    });
    if(dirty) this.updatePowerupBar();
    const speedMult = this.powerUps.speedT > 0 ? 1.7 : 1;

    // player update (custom dt for speed boost on movement tween)
    const playerDt = dt;
    if(this.player.moving) this.player.moveT += dt*(speedMult-1)/MOVE_TIME; // extra catch-up when boosted
    this.player.update(playerDt, this);

    // track new max row + category counters
    if(this.player.row > this.maxRowReached){
      for(let r=this.maxRowReached+1; r<=this.player.row; r++){
        const row = this.world.rows.get(r);
        if(row){
          if(row.type === 'road'){ this.roadsCrossedRun++; SaveSystem.data.stats.roadsCrossed++; this.score += 15; }
          else if(row.type === 'rail'){ this.railsCrossedRun++; SaveSystem.data.stats.railsCrossed++; this.score += 25; }
          else this.score += 8;
        }
      }
      this.maxRowReached = this.player.row;
      this.checkAchievements();
    }

    // train warning banner
    let trainWarningActive = false;
    for(const row of this.world.rows.values()){
      if(row.trainWarn) trainWarningActive = true;
    }
    document.getElementById('train-warning').classList.toggle('show', trainWarningActive);

    // collectibles
    this.updateCollectibles();

    // hazard collision for the row(s) near the player
    this.checkHazards();

    this.updateHUD();

    // camera follow
    this.updateCamera(dt);

    // toast display
    this.updateToast(dt);

    this.render();
  }

  updateRow(row, dt, slowFactor){
    if(row.type === 'road'){
      row.vehicles.forEach(v=>{
        v.x += row.dir * row.speed * slowFactor * dt;
        if(row.dir > 0 && v.x > LANE_HALF) v.x = -LANE_HALF;
        if(row.dir < 0 && v.x < -LANE_HALF) v.x = LANE_HALF;
        v.mesh.position.x = v.x;
      });
    } else if(row.type === 'river'){
      row.logs.forEach(l=>{
        l.x += row.dir * row.speed * slowFactor * dt;
        if(row.dir > 0 && l.x > LANE_HALF) l.x = -LANE_HALF;
        if(row.dir < 0 && l.x < -LANE_HALF) l.x = LANE_HALF;
        l.mesh.position.x = l.x;
      });
    } else if(row.type === 'rail'){
      if(row.trainActive){
        row.trainT += dt;
        const dur = row.trainDuration;
        const t = row.trainT/dur;
        const startX = row.trainDir>0 ? -LANE_HALF-4 : LANE_HALF+4;
        const endX = row.trainDir>0 ? LANE_HALF+4 : -LANE_HALF-4;
        const headX = THREE.MathUtils.lerp(startX,endX,Math.min(1,t));
        row.trainMeshes.forEach((seg,i)=>{
          seg.position.x = headX - row.trainDir*i*3.6;
        });
        if(t >= 1){
          row.trainActive = false;
          row.trainMeshes.forEach(seg=>row.mesh.remove(seg));
          row.trainMeshes = [];
          row.trainTimer = 4 + Math.random()*4 - this.world.difficulty*1.5;
        }
      } else if(row.trainWarn){
        row.trainWarnT -= dt;
        const flashOn = Math.floor(row.trainWarnT*6)%2===0;
        if(row.warnLamps) row.warnLamps.forEach(l=>{ l.material.emissiveIntensity = flashOn?1.2:0.1; l.material.color.set(flashOn?0xff2222:0x550000); });
        if(row.trainWarnBellT===undefined) row.trainWarnBellT = 0;
        row.trainWarnBellT -= dt;
        if(row.trainWarnBellT <= 0){ Audio_.bell(); row.trainWarnBellT = 0.5; }
        if(row.trainWarnT <= 0){
          row.trainWarn = false;
          row.trainActive = true;
          row.trainT = 0;
          row.trainDir = Math.random()<0.5?1:-1;
          const segCount = 3+Math.floor(Math.random()*3);
          const color = [0xE84B4B,0x3F7BD6,0x2FAE60,0xE8A23F][Math.floor(Math.random()*4)];
          row.trainDuration = (segCount*3.6+LANE_HALF*2+8) / row.trainSpeed;
          for(let i=0;i<segCount;i++){
            const seg = buildTrainSegment(i,color);
            row.mesh.add(seg);
            row.trainMeshes.push(seg);
          }
        }
      } else {
        row.trainTimer -= dt*slowFactor;
        if(row.trainTimer <= 0){
          row.trainWarn = true;
          row.trainWarnT = 1.6;
        }
      }
    }
    // bread bob animation
    row.breads.forEach(b=>{
      if(!b.collected){ b.bobT += dt*4; b.mesh.position.y = 0.15 + Math.sin(b.bobT)*0.06; b.mesh.rotation.y += dt*1.5; }
    });
    if(row.powerup && !row.powerup.collected){
      row.powerup.mesh.userData.core.rotation.y += dt*2;
      row.powerup.mesh.userData.ring.rotation.z += dt*1.5;
      row.powerup.mesh.position.y = Math.sin(performance.now()*0.003)*0.1;
    }
  }

  updateCollectibles(){
    const p = this.player;
    const magnetR = this.powerUps.magnetT > 0 ? 2.6 : 0.55;
    for(let r=p.row-1; r<=p.row+1; r++){
      const row = this.world.rows.get(r);
      if(!row) continue;
      row.breads.forEach(b=>{
        if(b.collected) return;
        const bx = b.col*COL_WIDTH, bz = row.z;
        const dx = bx-p.x, dz = bz-p.z;
        if(dx*dx+dz*dz < magnetR*magnetR){
          b.collected = true;
          row.mesh.remove(b.mesh);
          this.bread++;
          SaveSystem.data.totalBread++;
          SaveSystem.data.stats.totalBread++;
          this.score += 5;
          Audio_.bread();
          spawnBurst(new THREE.Vector3(bx,0.3,bz), 0xFFC94D, 8);
          this.checkAchievements();
        }
      });
      if(row.powerup && !row.powerup.collected){
        const pu = row.powerup;
        const bx = pu.col*COL_WIDTH, bz = row.z;
        const dx = bx-p.x, dz = bz-p.z;
        if(dx*dx+dz*dz < 0.6*0.6){
          pu.collected = true;
          row.mesh.remove(pu.mesh);
          this.activatePowerup(pu.type);
          spawnBurst(new THREE.Vector3(bx,0.4,bz), 0xffffff, 12);
        }
      }
    }
  }

  checkHazards(){
    const p = this.player;
    if(p.state === 'falling' || !p.alive) return;
    const effRow = Math.round(-p.z/ROW_DEPTH);
    const row = this.world.rows.get(effRow);
    if(!row) return;

    if(row.type === 'road'){
      row.vehicles.forEach(v=>{
        const halfLen = v.length/2 + 0.32;
        const dx = Math.abs(v.x - p.x);
        if(dx < halfLen){
          this.onHitObstacle();
        } else if(dx < halfLen + 0.9 && !v.missCounted){
          v.missCounted = true;
          this.nearMissesRun++;
          SaveSystem.data.stats.nearMisses++;
          this.score += 2;
          this.checkAchievements();
        } else if(dx > halfLen + 1.6){
          v.missCounted = false;
        }
      });
    } else if(row.type === 'river'){
      if(!p.moving && p.riverGrace <= 0){
        let onLog = false;
        for(const l of row.logs){
          if(Math.abs(l.x - p.x) < l.length/2 + 0.28){ onLog = true; break; }
        }
        if(!onLog) this.onFallInWater();
      }
    } else if(row.type === 'rail'){
      if(row.trainActive){
        for(const seg of row.trainMeshes){
          const halfLen = (seg.userData.length||3.4)/2 + 0.32;
          if(Math.abs(seg.position.x - p.x) < halfLen){ this.onHitObstacle(); break; }
        }
      }
    }
  }

  updateCamera(dt){
    const p = this.player;
    const desired = new THREE.Vector3(p.x*0.35, this.camOffset.y, p.z + this.camOffset.z);
    camera.position.lerp(desired, Math.min(1,dt*5));
    if(this.camShake > 0){
      this.camShake = Math.max(0, this.camShake - dt*1.5);
      camera.position.x += (Math.random()-0.5)*this.camShake;
      camera.position.y += (Math.random()-0.5)*this.camShake;
    }
    const lookAt = new THREE.Vector3(p.x*0.5, 0.6, p.z - 3);
    camera.lookAt(lookAt);
    sunLight.target.position.set(p.x, 0, p.z);
  }

  updateToast(dt){
    const el = document.getElementById('toast');
    if(this.toastTimer > 0){
      this.toastTimer -= dt;
      if(this.toastTimer <= 0) el.classList.remove('show');
    } else if(this.toastQueue.length){
      el.textContent = this.toastQueue.shift();
      el.classList.add('show');
      this.toastTimer = 2.2;
    }
  }

  render(){
    renderer.render(scene, camera);
  }
}

/* ---------------------------------------------------------
   BOOTSTRAP
--------------------------------------------------------- */
let GAME = null;

function boot(){
  SaveSystem.load();
  Audio_.init();
  initScene();
  camera.position.set(0, 6.2, 7.4);
  camera.lookAt(0,0.6,-3);

  GAME = new Game();
  GAME.refreshStartStats();
  GAME.applySettingsToUI();
  GAME.state = 'menu';

  document.getElementById('loading').classList.add('hidden');
  GAME.showScreen('screen-start');

  function loop(){
    const dt = Math.min(0.05, clock.getDelta());
    GAME.update(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

window.addEventListener('load', boot);
