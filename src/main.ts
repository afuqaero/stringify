import * as THREE from 'three';
import { input } from './inputManager';
import { inject } from '@vercel/analytics';
import { saveSong, getSongList, getSongData, deleteSong } from './libraryManager';

// Initialize Vercel Analytics
inject();

// Screen Elements
const screenTitle = document.getElementById('screen-title')!;
const screenHub = document.getElementById('screen-hub')!;
const screenCalib = document.getElementById('screen-calib')!;
const screenPause = document.getElementById('screen-pause')!;
const appContainer = document.getElementById('app')!;

// Menu Choice Selection Panels
const hubChoiceSelect = document.getElementById('hub-choice-select')!;
const cardChoicePlay = document.getElementById('card-choice-play')!;
const cardChoiceRecord = document.getElementById('card-choice-record')!;

// Config Setup Cards
const hubLoading = document.getElementById('hub-loading')!;
const hubPlayConfig = document.getElementById('hub-play-config')!;
const hubRecordConfig = document.getElementById('hub-record-config')!;

// Config Form Elements
let difficultySelectPlayValue = 'medium';
let difficultySelectRecordValue = 'medium';
const chartUpload = document.getElementById('chart-upload') as HTMLInputElement;
const audioUploadPlay = document.getElementById('audio-upload-play') as HTMLInputElement;
const audioUploadRecord = document.getElementById('audio-upload-record') as HTMLInputElement;
const audioUploadPlayLabel = document.getElementById('audio-upload-play-label')!;

// Buttons
const btnStartGame = document.getElementById('btn-start-game')!;
const btnCalibPlay = document.getElementById('btn-calib-play')!;
const btnCalibRecord = document.getElementById('btn-calib-record')!;
const btnPlayBack = document.getElementById('btn-play-back')!;
const btnRecordBack = document.getElementById('btn-record-back')!;
const btnCalibDone = document.getElementById('btn-calib-done')!;

// Game HUD Elements
const gameHeader = document.getElementById('game-header')!;
const recordIndicator = document.getElementById('record-indicator')!;
const topHud = document.getElementById('top-hud')!;
const hudSongVal = document.getElementById('hud-song-val')!;
const hudLanesVal = document.getElementById('hud-lanes-val')!;
const hudNotesVal = document.getElementById('hud-notes-val')!;

const statsHud = document.getElementById('stats-hud')!;
const hudScoreVal = document.getElementById('hud-score-val')!;
const hudAccuracyVal = document.getElementById('hud-accuracy-val')!;

const floatingCombo = document.getElementById('floating-combo')!;
const floatingComboVal = document.getElementById('floating-combo-val')!;

const floatingStarPower = document.getElementById('floating-star-power')!;

const starPowerMeterContainer = document.getElementById('star-power-meter-container')!;
const spMeterBar = document.getElementById('sp-meter-bar')!;
const spMeterStatus = document.getElementById('sp-meter-status')!;

// Hamburger menu
const hamburgerBtn = document.getElementById('hamburger-btn') as HTMLButtonElement;
const hamburgerMenu = document.getElementById('hamburger-menu')!;
const btnHamResume = document.getElementById('btn-ham-resume')!;
const btnHamExport = document.getElementById('btn-ham-export')!;
const btnHamReset = document.getElementById('btn-ham-reset')!;
const btnHamExit = document.getElementById('btn-ham-exit')!;

// Countdown overlay
const countdownOverlay = document.getElementById('countdown-overlay')!;
const countdownNumber = document.getElementById('countdown-number')!;

// Pause menu buttons
const btnResume = document.getElementById('btn-resume')!;
const btnQuit = document.getElementById('btn-quit')!;
const btnExportChart = document.getElementById('btn-export-chart')!;

// Complete screen elements
const screenComplete = document.getElementById('screen-complete')!;
const completeStars = document.getElementById('complete-stars')!;
const btnCompleteAgain = document.getElementById('btn-complete-again')!;
const btnCompleteQuit = document.getElementById('btn-complete-quit')!;

type GameState = 'TITLE' | 'HUB' | 'CALIBRATE' | 'PLAY' | 'PAUSED' | 'COMPLETE' | 'INTRO';
const GameState = {
  TITLE: 'TITLE' as GameState,
  HUB: 'HUB' as GameState,
  CALIBRATE: 'CALIBRATE' as GameState,
  PLAY: 'PLAY' as GameState,
  PAUSED: 'PAUSED' as GameState,
  COMPLETE: 'COMPLETE' as GameState,
  INTRO: 'INTRO' as GameState,
};
let currentState = GameState.TITLE;

// Background Music
const BG_TRACKS = [
  '/Blacktop Fever.mp3',
  '/Bleach Stained Hoodie.mp3',
  '/Break the Chain.mp3',
  '/Burned CD Heart.mp3',
  '/Glass In My Pocket.mp3',
  '/Mirrorball Rebel.mp3',
  '/Neon Kiss.mp3',
];
const pickRandomTrack = () => BG_TRACKS[Math.floor(Math.random() * BG_TRACKS.length)];
const bgMusic = document.getElementById('bg-music') as HTMLAudioElement;
if (bgMusic) {
  bgMusic.src = pickRandomTrack();
  bgMusic.volume = 0.4; // 40% volume

  bgMusic.addEventListener('ended', () => {
    bgMusic.src = pickRandomTrack();
    bgMusic.play().catch(() => {});
  });
}

function triggerBgMusic(play: boolean) {
  if (!bgMusic) return;
  if (play) {
    if (bgMusic.paused) {
      // Force reload the audio track to prevent browser from dropping the suspended audio buffer
      // after a long gameplay session.
      bgMusic.src = pickRandomTrack();
      bgMusic.volume = 0.4;
      bgMusic.play().catch(() => {});
    }
  } else {
    bgMusic.pause();
  }
}

function duckMusicVolume() {
  if (mainTrackGainNode && audioContext) {
    mainTrackGainNode.gain.cancelScheduledValues(audioContext.currentTime);
    mainTrackGainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
  }
}

function restoreMusicVolume() {
  if (mainTrackGainNode && audioContext) {
    const target = isStarPowerActive ? 0.65 : 1.0;
    mainTrackGainNode.gain.cancelScheduledValues(audioContext.currentTime);
    mainTrackGainNode.gain.linearRampToValueAtTime(target, audioContext.currentTime + 0.1);
  }
}

// Game State variables
let audioContext: AudioContext;
let audioSource: AudioBufferSourceNode | null = null;
let mainTrackGainNode: GainNode | null = null;
let currentBuffer: AudioBuffer | null = null;
let lastLoadedBuffer: AudioBuffer | null = null;
let missAudioBuffer: AudioBuffer | null = null;
let applauseAudioBuffer: AudioBuffer | null = null;
let starPowerAudioBuffer: AudioBuffer | null = null;
let isPlaying = false;
let startTime = 0;
let pausedOffset = 0;
let score = 0;
let combo = 0;
let totalHits = 0;
let totalNotesProcessed = 0;
let currentNumLanes = 4;
let currentNoteSpeed = 14;
let currentSongName = "Custom Track";
let introAnimationStartTime = 0;

// Star Power State
let isStarPowerReady = false;
let isStarPowerActive = false;
let starPowerTimer = 0;
let nextStarPowerThreshold = 60;
let fireParticles: { mesh: THREE.Mesh, life: number, maxLife: number, velocity: THREE.Vector3, initialScale: number }[] = [];
let activeLightning: { mesh: THREE.Mesh, life: number }[] = [];

// Calibration parameters tracking
let calibDifficultySource: 'play' | 'record' = 'play';

// HTML escape helper — prevents XSS when inserting user-supplied strings into innerHTML
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Custom in-game toast notifications helper
function showNotification(message: string, isError: boolean = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;

  const icon = isError ? 'fa-triangle-exclamation' : 'fa-circle-check';
  const color = isError ? 'var(--primary)' : 'var(--accent)';

  // Use DOM methods instead of innerHTML so message content can never execute as HTML
  const iconEl = document.createElement('i');
  iconEl.className = `fa-solid ${icon}`;
  iconEl.style.color = color;

  const textEl = document.createElement('span');
  textEl.textContent = message;

  toast.appendChild(iconEl);
  toast.appendChild(textEl);
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Mode & Recording State
let isRecordingMode = false;
let recordedNotes: { time: number, lane: number, duration?: number }[] = [];
let loadedCustomChart: { time: number, lane: number, duration?: number }[] | null = null;

// Track hold start times and visual sustain groups during recording
const recordingPressStartTimes: number[] = [-1, -1, -1, -1, -1];
const recordingVisualSustains: (THREE.Group | null)[] = [null, null, null, null, null];

// Config constants
const RECEPTOR_Z = 5;
const SPAWN_Z = -50;
const LANE_WIDTH = 1.2;

// Colors matching Stringify neon aesthetics (Green, Red, Yellow, Blue, Orange)
const COLORS = [0x2cd5a0, 0xff527b, 0xffc83b, 0x3ca2f4, 0xff781f];

// Three.js Setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b0c16, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3.5, 9.5);
camera.lookAt(0, 0.2, 1);

// Adjust camera Field of View to fit outer lanes horizontally in portrait mobile viewports
function updateCameraFov() {
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect < 1.0) {
    camera.fov = 60 + (1.0 - aspect) * 52;
  } else {
    camera.fov = 60;
  }
  camera.updateProjectionMatrix();
}

updateCameraFov();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
appContainer.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  updateCameraFov();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(0, 10, 5);
scene.add(dirLight);

// Scene Objects arrays
let track: THREE.Mesh | null = null;
let separators: THREE.Mesh[] = [];
let receptors: THREE.Group[] = [];
let highwayBars: THREE.Mesh[] = [];
let fireEdges: THREE.Mesh[] = [];

// Active sustain notes being held during playback
const activeSustains: (NoteData | null)[] = [null, null, null, null, null];

// Canvas Drawing Helper for Receptors
function drawReceptorCanvas(ctx: CanvasRenderingContext2D, colorHex: number, letter: string, isPressed: boolean) {
  ctx.clearRect(0, 0, 512, 512);
  
  const colorStr = '#' + colorHex.toString(16).padStart(6, '0');
  
  // Outer Glow
  ctx.shadowColor = colorStr;
  ctx.shadowBlur = isPressed ? 88 : 48;
  
  // Base Circle
  ctx.fillStyle = isPressed ? '#ffffff' : colorStr;
  ctx.beginPath();
  ctx.arc(256, 256, 208, 0, Math.PI * 2);
  ctx.fill();
  
  // Reset shadow
  ctx.shadowBlur = 0;
  
  // Inner color disk
  ctx.fillStyle = colorStr;
  ctx.beginPath();
  ctx.arc(256, 256, 184, 0, Math.PI * 2);
  ctx.fill();
  
  // Accent Inner Ring
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 176, 0, Math.PI * 2);
  ctx.stroke();
  
  // Key Binding Label Text
  ctx.fillStyle = '#0b0c16';
  ctx.font = '900 192px "Nunito", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter.toUpperCase(), 256, 256);
}

function generateScene(numLanes: number) {
  currentNumLanes = numLanes;
  input.numLanes = numLanes;
  
  // Set floating combo position dynamically — clearly outside the highway border
  // Easy (3): 290px, Medium (4): 360px, Hard (5): 430px
  // On mobile, CSS media query handles positioning instead
  if (window.innerWidth > 768) {
    const offset = 290 + (numLanes - 3) * 70;
    floatingCombo.style.left = `calc(50% + ${offset}px)`;
    floatingCombo.style.top = '';
  } else {
    floatingCombo.style.left = '';
    floatingCombo.style.top = '';
  }
  
  // Clear old objects — dispose geometry + material to prevent GPU memory leaks
  if (track) {
    scene.remove(track);
    track.geometry.dispose();
    (track.material as THREE.Material).dispose();
  }
  separators.forEach(s => {
    scene.remove(s);
    s.geometry.dispose();
    (s.material as THREE.Material).dispose();
  });
  receptors.forEach(r => {
    scene.remove(r);
    const cInfo = (r as any).canvasInfo;
    if (cInfo?.texture) cInfo.texture.dispose();
    r.traverse(child => {
      const m = child as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
  });
  highwayBars.forEach(b => {
    scene.remove(b);
    b.geometry.dispose();
    (b.material as THREE.Material).dispose();
  });
  separators = [];
  receptors = [];
  highwayBars = [];

  // Track Fretboard
  const trackGeometry = new THREE.PlaneGeometry(LANE_WIDTH * numLanes, Math.abs(SPAWN_Z) + RECEPTOR_Z + 10);
  const trackMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x0c0f24, 
    roughness: 0.8, 
    metalness: 0.1,
    transparent: true,
    opacity: 0.65
  });
  track = new THREE.Mesh(trackGeometry, trackMaterial);
  track.rotation.x = -Math.PI / 2;
  track.position.z = (SPAWN_Z + RECEPTOR_Z) / 2;
  scene.add(track);

  const startX = -((numLanes - 1) / 2) * LANE_WIDTH;

  // Track Left Border (Standard Blue)
  const leftBorderGeo = new THREE.PlaneGeometry(0.06, Math.abs(SPAWN_Z) + RECEPTOR_Z + 10);
  const leftBorderMat = new THREE.MeshBasicMaterial({ color: 0x3ca2f4, transparent: true, opacity: 0.7 });
  const leftBorder = new THREE.Mesh(leftBorderGeo, leftBorderMat);
  leftBorder.rotation.x = -Math.PI / 2;
  leftBorder.position.set(startX - LANE_WIDTH / 2, 0.012, track.position.z);
  scene.add(leftBorder);
  separators.push(leftBorder);

  // Track Right Border (Standard Blue)
  const rightBorderGeo = new THREE.PlaneGeometry(0.06, Math.abs(SPAWN_Z) + RECEPTOR_Z + 10);
  const rightBorderMat = new THREE.MeshBasicMaterial({ color: 0x3ca2f4, transparent: true, opacity: 0.7 });
  const rightBorder = new THREE.Mesh(rightBorderGeo, rightBorderMat);
  rightBorder.rotation.x = -Math.PI / 2;
  rightBorder.position.set(startX + numLanes * LANE_WIDTH - LANE_WIDTH / 2, 0.012, track.position.z);
  scene.add(rightBorder);
  separators.push(rightBorder);
  
  // Fire Edges (Invisible normally)
  fireEdges.forEach(f => {
    scene.remove(f);
    f.geometry.dispose();
    (f.material as THREE.Material).dispose();
  });
  fireEdges = [];
  
  const fireLeftGeo = new THREE.PlaneGeometry(0.4, Math.abs(SPAWN_Z) + RECEPTOR_Z + 10);
  const fireMat = new THREE.MeshStandardMaterial({ 
    color: 0x111111, 
    emissive: 0x000000, 
    transparent: true, 
    opacity: 0.0 
  });
  const fireLeft = new THREE.Mesh(fireLeftGeo, fireMat);
  fireLeft.rotation.x = -Math.PI / 2;
  fireLeft.position.set(startX - LANE_WIDTH / 2 - 0.15, 0.013, track.position.z);
  scene.add(fireLeft);
  fireEdges.push(fireLeft);
  
  const fireRightGeo = new THREE.PlaneGeometry(0.4, Math.abs(SPAWN_Z) + RECEPTOR_Z + 10);
  const fireRight = new THREE.Mesh(fireRightGeo, fireMat.clone());
  fireRight.rotation.x = -Math.PI / 2;
  fireRight.position.set(startX + numLanes * LANE_WIDTH - LANE_WIDTH / 2 + 0.15, 0.013, track.position.z);
  scene.add(fireRight);
  fireEdges.push(fireRight);

  // Center Lane Lines (colored neon trails)
  for (let i = 0; i < numLanes; i++) {
    const laneLineGeo = new THREE.PlaneGeometry(0.04, Math.abs(SPAWN_Z) + RECEPTOR_Z + 10);
    const color = COLORS[i % COLORS.length];
    const laneLineMat = new THREE.MeshStandardMaterial({ 
      color: color, 
      emissive: color, 
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.35
    });
    const laneLine = new THREE.Mesh(laneLineGeo, laneLineMat);
    laneLine.rotation.x = -Math.PI / 2;
    laneLine.position.set(startX + i * LANE_WIDTH, 0.01, track.position.z);
    scene.add(laneLine);
    separators.push(laneLine);
  }

  // Scrolling Highway Grid Lines
  const numBars = 12;
  const barGeo = new THREE.PlaneGeometry(LANE_WIDTH * numLanes, 0.04);
  const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 });
  for (let i = 0; i < numBars; i++) {
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.rotation.x = -Math.PI / 2;
    const ratio = i / numBars;
    bar.position.set(0, 0.008, SPAWN_Z + ratio * (RECEPTOR_Z + 5 - SPAWN_Z));
    scene.add(bar);
    highwayBars.push(bar);
  }

  // Receptors
  for (let i = 0; i < numLanes; i++) {
    const group = new THREE.Group();
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const keyBind = input.bindings[i]?.kb || '?';
    const color = COLORS[i % COLORS.length];
    
    drawReceptorCanvas(ctx, color, keyBind, false);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    
    const geometry = new THREE.PlaneGeometry(1.0, 1.0);
    const material = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true, 
      opacity: 0.95,
      depthWrite: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.02;
    
    group.add(mesh);
    group.position.set(startX + i * LANE_WIDTH, 0.05, isRecordingMode ? -40 : RECEPTOR_Z);
    
    scene.add(group);
    receptors.push(group);
    
    (group as any).canvasInfo = {
      canvas,
      ctx,
      texture,
      color,
      key: keyBind
    };
  }
}

// Initial default scene
generateScene(4);

// Notes Interface & Geometry
interface NoteData {
  time: number;
  lane: number;
  duration?: number;
  group: THREE.Group;
  hit: boolean;
  animating: boolean;
  scale: number;
}
let activeNotes: NoteData[] = [];

function createNoteGeometry(color: number) {
  const group = new THREE.Group();
  
  // Glowing outer circular disk
  const noteGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 32);
  const noteMat = new THREE.MeshStandardMaterial({ 
    color: color, 
    emissive: color, 
    emissiveIntensity: 0.85, 
    transparent: true, 
    opacity: 0.95 
  });
  const noteMesh = new THREE.Mesh(noteGeo, noteMat);
  noteMesh.position.y = 0.04;
  
  // White glowing core cylinder
  const innerGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32);
  const innerMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    emissive: 0xffffff, 
    emissiveIntensity: 0.5, 
    transparent: true, 
    opacity: 0.95 
  });
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  innerMesh.position.y = 0.045;

  group.add(noteMesh);
  group.add(innerMesh);
  return group;
}

function updateNoteColor(obj: THREE.Object3D, hex: number) {
  obj.children.forEach(child => {
    if (child instanceof THREE.Group || child.type === 'Group') {
      updateNoteColor(child, hex);
    }
    const mesh = child as THREE.Mesh;
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        const mat = m as THREE.MeshStandardMaterial;
        if (mat.color && mat.emissive) {
          // Ignore the white core and the grey dropped sustain tail
          if (mat.color.getHex() !== 0xffffff && mat.color.getHex() !== 0x555555) {
            mat.color.setHex(hex);
            mat.emissive.setHex(hex);
          }
        }
      });
    }
  });
}

// Create a complete sustain note geometry with note head and tail trail
function createSustainNoteGeometry(color: number, duration: number) {
  const group = new THREE.Group();
  
  // Note Head
  const head = createNoteGeometry(color);
  group.add(head);
  
  if (duration && duration > 0.15) {
    const tailLength = duration * currentNoteSpeed;
    const tailGeo = new THREE.BoxGeometry(0.3, 0.04, tailLength);
    const tailMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.6,
      roughness: 0.5
    });
    const tailMesh = new THREE.Mesh(tailGeo, tailMat);
    tailMesh.position.set(0, 0.04, -tailLength / 2);
    group.add(tailMesh);
    
    // Note End Cap
    const capGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.06, 16);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.8
    });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.set(0, 0.04, -tailLength);
    group.add(capMesh);
  }
  
  return group;
}

// Sets glow state on a sustain note group (all MeshStandardMaterial children)
function setSustainGlow(group: THREE.Group, glowing: boolean) {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat && mat.emissive !== undefined) {
        // Boost emissive intensity and increase opacity to make the active hold state extremely clear
        mat.emissiveIntensity = glowing ? 6.0 : (mat.color.getHex() === 0xffffff ? 0.5 : 0.6);
        mat.opacity = glowing ? 1.0 : (mat.color.getHex() === 0x555555 ? 0.35 : 0.6);
      }
    }
  });
}

// Particles System
interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}
const particles: Particle[] = [];
const particleGeo = new THREE.SphereGeometry(0.04, 6, 6);

function spawnParticles(position: THREE.Vector3, color: number) {
  const particleCount = 25;
  for (let i = 0; i < particleCount; i++) {
    let sparkColor = color;
    const rand = Math.random();
    // Keep sparks matching the lane color that is pressed, with white hot highlights
    if (rand > 0.65) {
      sparkColor = 0xffffff; // white hot spark
    }
    
    const mat = new THREE.MeshBasicMaterial({ 
      color: sparkColor,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    
    const mesh = new THREE.Mesh(particleGeo, mat);
    mesh.position.copy(position);
    mesh.position.x += (Math.random() - 0.5) * 0.25;
    mesh.position.y += 0.1 + Math.random() * 0.15;
    mesh.position.z += (Math.random() - 0.5) * 0.25;
    
    // Vary initial scale for organic variation
    const initialScale = 0.6 + Math.random() * 1.4;
    mesh.scale.setScalar(initialScale);
    scene.add(mesh);
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 11,
      (Math.random() * 7) + 5,
      (Math.random() - 0.5) * 11
    );
    
    particles.push({ mesh, velocity, life: 1.0 });
    (mesh as any).initialScale = initialScale;
  }
}

// Sanitize custom chart upload to prevent Prototype Pollution and JSON injection attacks
function sanitizeChart(rawData: any): { time: number, lane: number, duration?: number }[] {
  // If data is wrapped in a root object like { notes: [...] }
  let data = rawData;
  if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
    if (Array.isArray(rawData.notes)) {
      data = rawData.notes;
    }
  }

  if (!Array.isArray(data)) {
    throw new Error("Invalid chart format: Chart must be a JSON array of notes.");
  }

  const sanitized: { time: number, lane: number, duration?: number }[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      // Create a completely clean object with no prototype inheritance
      const cleanNote: any = Object.create(null);

      // Enforce strong typing and parse values strictly
      const t = Number(item.time);
      const l = parseInt(item.lane, 10);

      // Time must be a valid positive number
      if (isNaN(t) || t < 0) continue;
      cleanNote.time = t;

      // Lane must be a valid lane index between 0 and 4
      if (isNaN(l) || l < 0 || l > 4) continue;
      cleanNote.lane = l;

      // Handle optional duration (must be a valid positive number)
      if (item.duration !== undefined) {
        const d = Number(item.duration);
        if (!isNaN(d) && d > 0) {
          cleanNote.duration = d;
        }
      }

      sanitized.push(cleanNote);
    }
  }

  // Sort notes strictly by timestamp to avoid gameplay synchronization skips
  return sanitized.sort((a, b) => a.time - b.time);
}

// Removed JSON Custom Chart Upload listener

// Update UI state
function switchState(newState: GameState) {
  const shouldPlayBgMusic = (newState === GameState.TITLE || newState === GameState.HUB);
  triggerBgMusic(shouldPlayBgMusic);
  currentState = newState;
  screenTitle.classList.add('hidden');
  screenHub.classList.add('hidden');
  screenCalib.classList.add('hidden');
  screenPause.classList.add('hidden');
  screenComplete.classList.add('hidden');
  gameHeader.classList.add('hidden');
  topHud.classList.add('hidden');
  statsHud.classList.add('hidden');
  floatingCombo.style.opacity = '0';
  recordIndicator.classList.add('hidden');
  starPowerMeterContainer.classList.add('hidden');
  hamburgerBtn.style.display = 'none';
  hamburgerMenu.classList.remove('open');
  hamburgerBtn.classList.remove('open');

  if (newState === GameState.TITLE) screenTitle.classList.remove('hidden');
  if (newState === GameState.HUB) {
    screenHub.classList.remove('hidden');
    
    hubChoiceSelect.classList.remove('hidden');
    hubPlayConfig.classList.add('hidden');
    hubRecordConfig.classList.add('hidden');
    hubLoading.classList.add('hidden');
    screenHub.style.display = 'flex';
    
    // NO triggerBgMusic(true) here!
    
    renderLibrary();
    loadedCustomChart = null;
  }
  if (newState === GameState.CALIBRATE) {
    populateCalibrationUI();
    screenCalib.classList.remove('hidden');
  }
  if (newState === GameState.PAUSED) {
    triggerBgMusic(false); // Explicitly ensure background music is off
    if (bgMusic) bgMusic.pause(); // Double safeguard
    
    screenPause.classList.remove('hidden');
    gameHeader.classList.remove('hidden');
    topHud.classList.remove('hidden');
    statsHud.classList.remove('hidden');
    hamburgerBtn.style.display = 'flex';
    if (isRecordingMode) {
      recordIndicator.classList.remove('hidden');
      btnExportChart.classList.remove('hidden');
    } else {
      btnExportChart.classList.add('hidden');
    }
  }
  if (newState === GameState.PLAY || newState === GameState.INTRO) {
    gameHeader.classList.remove('hidden');
    topHud.classList.remove('hidden');
    statsHud.classList.remove('hidden');
    hamburgerBtn.style.display = 'flex';
    if (combo > 0) {
      floatingCombo.style.opacity = '1';
    }
    if (isRecordingMode) {
      recordIndicator.classList.remove('hidden');
      btnHamExport.classList.remove('hidden');
    } else {
      btnHamExport.classList.add('hidden');
    }
  }
  if (newState === GameState.COMPLETE) {
    screenComplete.classList.remove('hidden');
  }
}

// Custom select dropdown setup
function setupCustomSelect(containerId: string, triggerId: string, onSelect: (val: string) => void) {
  const container = document.getElementById(containerId)!;
  const trigger = document.getElementById(triggerId)!;
  const optionsList = container.querySelector('.custom-options-list')!;
  const options = container.querySelectorAll('.custom-option');
  
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close other dropdowns
    document.querySelectorAll('.custom-select-container').forEach(c => {
      if (c.id !== containerId) {
        c.classList.remove('open');
        c.querySelector('.custom-options-list')?.classList.add('hidden');
      }
    });
    // Toggle current
    container.classList.toggle('open');
    optionsList.classList.toggle('hidden');
  });
  
  options.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = (opt as HTMLElement).dataset.value || 'medium';
      
      // Update text
      trigger.innerText = (opt as HTMLElement).innerText;
      
      // Update class
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      
      // Close list
      container.classList.remove('open');
      optionsList.classList.add('hidden');
      
      onSelect(val);
    });
  });
}

// Initialize Custom Selects
setupCustomSelect('difficulty-select-play-container', 'difficulty-select-play-trigger', (val) => {
  difficultySelectPlayValue = val;
});
setupCustomSelect('difficulty-select-record-container', 'difficulty-select-record-trigger', (val) => {
  difficultySelectRecordValue = val;
});

// Close all custom select dropdowns on window click
window.addEventListener('click', () => {
  document.querySelectorAll('.custom-select-container').forEach(c => {
    c.classList.remove('open');
    c.querySelector('.custom-options-list')?.classList.add('hidden');
  });
});

// Choice Panel Clicks
cardChoicePlay.addEventListener('click', () => {
  const guideModal = document.getElementById('play-guide-modal')!;
  guideModal.classList.remove('hidden');
  
  const card = guideModal.querySelector('.card');
  if (card) {
    card.classList.remove('card-popup');
    void (card as HTMLElement).offsetWidth; // trigger reflow
    card.classList.add('card-popup');
  }
});

document.getElementById('btn-close-guide')?.addEventListener('click', () => {
  document.getElementById('play-guide-modal')?.classList.add('hidden');
  hubChoiceSelect.classList.add('hidden');
  hubPlayConfig.classList.remove('hidden');
});

document.getElementById('btn-goto-record')?.addEventListener('click', () => {
  document.getElementById('play-guide-modal')?.classList.add('hidden');
  hubChoiceSelect.classList.add('hidden');
  hubRecordConfig.classList.remove('hidden');
});

document.getElementById('btn-cancel-guide')?.addEventListener('click', () => {
  document.getElementById('play-guide-modal')?.classList.add('hidden');
});


cardChoiceRecord.addEventListener('click', () => {
  hubChoiceSelect.classList.add('hidden');
  hubRecordConfig.classList.remove('hidden');
});

// Back Buttons Clicks
btnPlayBack.addEventListener('click', () => {
  hubPlayConfig.classList.add('hidden');
  hubChoiceSelect.classList.remove('hidden');
  
  // Clear any loaded chart
  loadedCustomChart = null;
});
btnRecordBack.addEventListener('click', () => {
  hubRecordConfig.classList.add('hidden');
  hubChoiceSelect.classList.remove('hidden');
});

// HUD Controls Events
document.getElementById('btn-start-game')?.addEventListener('click', () => switchState(GameState.HUB));

// Also handle touchstart anywhere on title screen for mobile
screenTitle.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (currentState === GameState.TITLE) switchState(GameState.HUB);
}, { passive: false });

// Backup: explicit space key listener
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && currentState === GameState.TITLE) {
    e.preventDefault();
    switchState(GameState.HUB);
  }
});

// Calibration Button clicks mapping
btnCalibPlay.addEventListener('click', () => {
  calibDifficultySource = 'play';
  switchState(GameState.CALIBRATE);
});
btnCalibRecord.addEventListener('click', () => {
  calibDifficultySource = 'record';
  switchState(GameState.CALIBRATE);
});
btnCalibDone.addEventListener('click', () => {
  switchState(GameState.HUB);
  hubChoiceSelect.classList.add('hidden');
  if (calibDifficultySource === 'play') {
    hubPlayConfig.classList.remove('hidden');
  } else {
    hubRecordConfig.classList.remove('hidden');
  }
});

// Countdown then resume
function startCountdownThenResume(isNewSong = false) {
  let count = 3;
  countdownOverlay.classList.add('active');
  countdownNumber.textContent = String(count);
  
  if (isNewSong) {
    switchState(GameState.INTRO);
    introAnimationStartTime = performance.now();
    playPowerUpSound();
    
    // Set initial scales to 0 for intro animation
    if (track) track.scale.z = 0.001;
    separators.forEach(sep => sep.scale.z = 0.001);
    highwayBars.forEach(bar => bar.scale.x = 0.001);
    receptors.forEach(rec => rec.scale.setScalar(0.001));
  }
  
  // Force reflow to restart animation each tick
  function tick() {
    countdownNumber.style.animation = 'none';
    void countdownNumber.offsetWidth; // reflow
    countdownNumber.style.animation = '';
    countdownNumber.textContent = count === 0 ? 'GO!' : String(count);
    if (count === 0) {
      setTimeout(() => {
        countdownOverlay.classList.remove('active');
        switchState(GameState.PLAY);
        playAudio();
      }, 700);
    } else {
      count--;
      setTimeout(tick, 900);
    }
  }
  tick();
}

// Hamburger toggle
hamburgerBtn.addEventListener('click', () => {
  hamburgerBtn.classList.toggle('open');
  hamburgerMenu.classList.toggle('open');
});

// Hamburger menu actions
btnHamResume.addEventListener('click', () => {
  hamburgerMenu.classList.remove('open');
  hamburgerBtn.classList.remove('open');
  if (currentState === GameState.PLAY) {
    pauseAudio();
    switchState(GameState.PAUSED);
  } else if (currentState === GameState.PAUSED) {
    startCountdownThenResume(false);
  }
});

btnHamExport.addEventListener('click', () => {
  hamburgerMenu.classList.remove('open');
  hamburgerBtn.classList.remove('open');
  handleExportChart();
});

btnHamReset.addEventListener('click', () => {
  hamburgerMenu.classList.remove('open');
  hamburgerBtn.classList.remove('open');
  restartGame();
});

btnHamExit.addEventListener('click', () => {
  stopAudio();
  switchState(GameState.HUB);
});

// Close hamburger when clicking outside
document.addEventListener('click', (e) => {
  if (!hamburgerBtn.contains(e.target as Node) && !hamburgerMenu.contains(e.target as Node)) {
    hamburgerMenu.classList.remove('open');
    hamburgerBtn.classList.remove('open');
  }
});

// Old pause screen resume/quit (keep for compatibility)
btnResume.addEventListener('click', () => {
  startCountdownThenResume(false);
});
btnQuit.addEventListener('click', () => {
  stopAudio();
  switchState(GameState.HUB);
});

function showCompleteScreen() {
  if (isPlaying && audioSource) {
    try {
      audioSource.stop();
    } catch (e) {
      // Audio already ended naturally
    }
    audioSource = null;
  }
  isPlaying = false;

  const titleSub = screenComplete.querySelector('.menu-subtitle') as HTMLElement;
  const titleH2 = screenComplete.querySelector('h2') as HTMLElement;
  const statsSummary = document.getElementById('complete-stats-summary') as HTMLElement;
  const exportBtn = document.getElementById('btn-complete-export')!;
  const againBtn = document.getElementById('btn-complete-again')!;
  
  // Clear stars container
  completeStars.innerHTML = '';

  if (isRecordingMode) {
    // Custom Record Complete Layout
    if (titleSub) titleSub.innerText = "RECORD COMPLETE";
    if (titleH2) titleH2.innerText = "Recording Finished";
    completeStars.style.display = 'none';
    
    if (statsSummary) {
      statsSummary.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 1.15rem; padding: 5px 0;">
          <span style="color: var(--text-muted);">Total Recorded Notes:</span>
          <span style="font-weight: 900; color: var(--accent);">${recordedNotes.length}</span>
        </div>
      `;
    }
    
    exportBtn.style.display = 'block';
    againBtn.innerText = "Record Again";
  } else {
    // Standard Play Complete Layout
    if (titleSub) titleSub.innerText = "CONGRATULATIONS";
    if (titleH2) titleH2.innerText = "Song Complete";
    completeStars.style.display = 'block';
    
    const missed = Math.max(0, totalNotesProcessed - totalHits);
    const acc = totalNotesProcessed === 0 ? 100 : Math.round((totalHits / totalNotesProcessed) * 100);
    const finalScore = Math.round(score);
    
    const prevBest = parseInt(localStorage.getItem(`best_score_${currentSongName}`) || '0', 10);
    let bestToDisplay = prevBest;
    let isNewBest = false;
    
    if (finalScore > prevBest && finalScore > 0) {
      isNewBest = true;
      bestToDisplay = finalScore;
      localStorage.setItem(`best_score_${currentSongName}`, finalScore.toString());
    }
    
    if (statsSummary) {
      statsSummary.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.15rem;">
          <span style="color: var(--text-muted);">Final Score:</span>
          <span id="complete-score" style="font-weight: 900; color: #ffffff;">${finalScore}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.15rem;">
          <span style="color: var(--text-muted);">Best Score:</span>
          <span id="complete-best-score" style="font-weight: 900; color: var(--accent);">${bestToDisplay}</span>
        </div>
        ${isNewBest ? '<div style="color: var(--accent); font-weight: 900; font-size: 1rem; margin-bottom: 10px; text-align: right; text-transform: uppercase;"><i class="fa-solid fa-crown"></i> New Best Score!</div>' : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.15rem;">
          <span style="color: var(--text-muted);">Accuracy:</span>
          <span id="complete-accuracy" style="font-weight: 900; color: #ffffff;">${acc}%</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.15rem;">
          <span style="color: var(--text-muted);">Notes Missed:</span>
          <span id="complete-missed" style="font-weight: 900; color: var(--primary);">${missed}</span>
        </div>
      `;
    }
    
    exportBtn.style.display = 'none';
    againBtn.innerText = "Play Again";

    // Play Mode star calculations & popping
    let stars = 1;
    if (acc >= 98) stars = 5;
    else if (acc >= 90) stars = 4;
    else if (acc >= 75) stars = 3;
    else if (acc >= 60) stars = 2;

    const currentHighScore = parseInt(localStorage.getItem(`highscore_${currentSongName}`) || '0', 10);
    if (score > currentHighScore) {
      localStorage.setItem(`highscore_${currentSongName}`, Math.round(score).toString());
      localStorage.setItem(`stars_${currentSongName}`, stars.toString());
    }

    for (let s = 0; s < stars; s++) {
      setTimeout(() => {
        if (currentState !== GameState.COMPLETE) return;
        const span = document.createElement('span');
        span.className = 'star-pop';
        span.innerText = '⭐';
        playStarPopSound(s);
        completeStars.appendChild(span);
      }, s * 220);
    }
  }

  switchState(GameState.COMPLETE);
  
  // Apply card pop animation
  const completeCard = screenComplete.querySelector('.card');
  if (completeCard) {
    completeCard.classList.remove('card-popup');
    void (completeCard as HTMLElement).offsetWidth; // trigger reflow
    completeCard.classList.add('card-popup');
  }
}

function restartGame() {
  stopAudio();
  currentBuffer = lastLoadedBuffer;
  if (isRecordingMode) recordedNotes = []; // reset recording on restart
  
  const numLanes = currentNumLanes;
  generateScene(numLanes);
  
  const startX = -((numLanes - 1) / 2) * LANE_WIDTH;
  
  if (isRecordingMode) {
    activeNotes = [];
  } else {
    // Reload original notes
    const chartNotes = loadedCustomChart || [];
    activeNotes = chartNotes.map(n => {
      const safeLane = Math.max(0, Math.min(numLanes - 1, typeof n.lane === 'number' ? n.lane : 0));
      const safeTime = typeof n.time === 'number' ? n.time : 0;
      const group = createSustainNoteGeometry(COLORS[safeLane % COLORS.length], n.duration || 0);
      group.position.set(startX + safeLane * LANE_WIDTH, 0.05, SPAWN_Z);
      return { 
        time: safeTime, 
        lane: safeLane, 
        duration: n.duration || 0, 
        group, 
        hit: false, 
        animating: false, 
        scale: 1 
      };
    });
  }
  
  score = 0;
  combo = 0;
  totalHits = 0;
  totalNotesProcessed = 0;
  pausedOffset = 0;
  
  hudSongVal.innerText = currentSongName;
  hudLanesVal.innerText = numLanes.toString();
  hudNotesVal.innerText = isRecordingMode ? "Tap to Record" : activeNotes.length.toString();
  
  hudScoreVal.innerText = "0";
  updateComboUI();
  hudAccuracyVal.innerText = "100%";
  
  startCountdownThenResume(true);
}

btnCompleteAgain.addEventListener('click', restartGame);
btnCompleteQuit.addEventListener('click', () => {
  stopAudio();
  switchState(GameState.HUB);
});

document.getElementById('btn-complete-export')?.addEventListener('click', handleExportChart);

function handleExportChart() {
  if (recordedNotes.length === 0) {
    showNotification("No notes recorded to export yet!", true);
    return;
  }
  recordedNotes.sort((a, b) => a.time - b.time);
  
  try {
    localStorage.setItem(`chart_${currentSongName}`, JSON.stringify(recordedNotes));
    showNotification("Chart saved locally!", false);
  } catch(e) {}
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recordedNotes, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `${currentSongName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_chart.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

btnExportChart.addEventListener('click', handleExportChart);
btnHamExport.addEventListener('click', handleExportChart);

let activeCalibLane = -1;

function getGamepadButtonLabel(btnIndex: number, gamepadId?: string): string {
  const isPlayStation = gamepadId && (
    gamepadId.toLowerCase().includes('sony') || 
    gamepadId.toLowerCase().includes('playstation') || 
    gamepadId.toLowerCase().includes('dual')
  );

  const mappings: Record<number, { xbox: string, ps: string }> = {
    0: { xbox: 'A', ps: '✕ (Cross)' },
    1: { xbox: 'B', ps: '◯ (Circle)' },
    2: { xbox: 'X', ps: '☐ (Square)' },
    3: { xbox: 'Y', ps: '△ (Triangle)' },
    4: { xbox: 'LB', ps: 'L1' },
    5: { xbox: 'RB', ps: 'R1' },
    6: { xbox: 'LT', ps: 'L2' },
    7: { xbox: 'RT', ps: 'R2' },
    8: { xbox: 'View', ps: 'Share' },
    9: { xbox: 'Menu', ps: 'Options' },
    10: { xbox: 'LS Click', ps: 'L3' },
    11: { xbox: 'RS Click', ps: 'R3' },
    12: { xbox: 'D-Pad Up', ps: 'D-Pad Up' },
    13: { xbox: 'D-Pad Down', ps: 'D-Pad Down' },
    14: { xbox: 'D-Pad Left', ps: 'D-Pad Left' },
    15: { xbox: 'D-Pad Right', ps: 'D-Pad Right' },
  };

  const map = mappings[btnIndex];
  if (!map) return `Button ${btnIndex}`;
  return isPlayStation ? map.ps : map.xbox;
}

function populateCalibrationUI() {
  const container = document.getElementById('calib-lanes')!;
  const statusEl = document.getElementById('gamepad-status')!;
  container.innerHTML = '';
  
  // Gamepad status detection
  if (input.gamepadId) {
    const isPlayStation = input.gamepadId.toLowerCase().includes('sony') || 
                        input.gamepadId.toLowerCase().includes('playstation') || 
                        input.gamepadId.toLowerCase().includes('dual');
    statusEl.innerHTML = `<i class="fa-solid fa-gamepad"></i> Connected: ${isPlayStation ? 'PlayStation Controller' : 'Xbox Controller'}`;
  } else {
    statusEl.innerHTML = `<i class="fa-solid fa-gamepad" style="opacity: 0.5;"></i> No Gamepad Connected (Press any button to connect)`;
  }
  
  const difficulty = calibDifficultySource === 'play' ? difficultySelectPlayValue : difficultySelectRecordValue;
  let numLanes = 4;
  if (difficulty === 'easy') numLanes = 3;
  if (difficulty === 'medium') numLanes = 4;
  if (difficulty === 'hard') numLanes = 5;
  if (difficulty === 'expert') numLanes = 5;
  
  const laneNames = ['Pink', 'Gold', 'Teal', 'Blue', 'Purple'];

  for (let i = 0; i < numLanes; i++) {
    const div = document.createElement('div');
    div.className = 'lane-calib';
    div.dataset.lane = i.toString();
    const bind = input.bindings[i];
    if (bind) {
      const gpLabel = getGamepadButtonLabel(bind.gp, input.gamepadId);
      div.innerHTML = `Lane ${i+1} (${laneNames[i % laneNames.length]}) <span class="bind">Key ${bind.kb.toUpperCase()} / GP ${gpLabel}</span>`;
    }
    
    div.addEventListener('click', () => {
      document.querySelectorAll('.lane-calib').forEach(e => e.classList.remove('active'));
      div.classList.add('active');
      activeCalibLane = i;
    });
    
    container.appendChild(div);
  }
}

function handleCalibrationInput() {
  if (activeCalibLane === -1) return;
  const justPressed = input.getAnyJustPressed();
  if (justPressed) {
    if (justPressed.type === 'kb') {
      if (input.bindings[activeCalibLane]) {
        input.bindings[activeCalibLane].kb = justPressed.key;
      }
    }
    if (justPressed.type === 'gp') {
      if (input.bindings[activeCalibLane]) {
        input.bindings[activeCalibLane].gp = justPressed.btn;
      }
    }
    
    populateCalibrationUI();
    activeCalibLane = -1;
  }
}

function playAudio() {
  if (!currentBuffer) return;
  audioSource = audioContext.createBufferSource();
  audioSource.buffer = currentBuffer;
  
  mainTrackGainNode = audioContext.createGain();
  mainTrackGainNode.gain.value = isStarPowerActive ? 0.65 : 1.0;
  
  audioSource.connect(mainTrackGainNode);
  mainTrackGainNode.connect(audioContext.destination);
  
  if (pausedOffset === 0) {
    startTime = audioContext.currentTime + 2; 
    audioSource.start(startTime);
  } else {
    startTime = audioContext.currentTime - pausedOffset;
    audioSource.start(0, pausedOffset);
  }
  isPlaying = true;
}

function pauseAudio() {
  if (!isPlaying || !audioSource) return;
  audioSource.stop();
  audioSource = null;
  pausedOffset = audioContext.currentTime - startTime;
  isPlaying = false;
}

function updateComboUI() {
  floatingComboVal.innerText = combo.toString();
  if (combo > 0) {
    floatingCombo.style.opacity = '1';
    
    // Cycle text color through neon color list
    const colorHex = COLORS[combo % COLORS.length];
    const colorStr = '#' + colorHex.toString(16).padStart(6, '0');
    floatingCombo.style.color = colorStr;
    
    // Trigger CSS pop animation by toggling class
    floatingCombo.classList.remove('combo-pop');
    void floatingCombo.offsetWidth; // trigger reflow
    floatingCombo.classList.add('combo-pop');
  } else {
    floatingCombo.style.opacity = '0';
    floatingCombo.classList.remove('combo-pop');
    
    if (!isStarPowerActive) {
      nextStarPowerThreshold = 60;
      isStarPowerReady = false;
      floatingStarPower.classList.remove('active');
    }
  }

  updateStarPowerMeterUI();
}

function updateStarPowerMeterUI() {
  if (currentState !== GameState.PLAY && currentState !== GameState.INTRO) {
    starPowerMeterContainer.classList.add('hidden');
    starPowerMeterContainer.classList.remove('active');
    return;
  }

  starPowerMeterContainer.classList.remove('hidden');
  starPowerMeterContainer.classList.add('active');

  if (isStarPowerActive) {
    starPowerMeterContainer.classList.remove('ready');
    starPowerMeterContainer.classList.add('active-mode');
    const pct = Math.max(0, Math.min(100, Math.round((starPowerTimer / 10) * 100)));
    spMeterBar.style.width = `${pct}%`;
    spMeterStatus.innerText = `ACTIVE (${Math.ceil(starPowerTimer)}s)`;
    spMeterStatus.style.color = '#ff5500';
  } else if (isStarPowerReady) {
    starPowerMeterContainer.classList.add('ready');
    starPowerMeterContainer.classList.remove('active-mode');
    spMeterBar.style.width = '100%';
    spMeterStatus.innerText = 'READY [SPACE]';
    spMeterStatus.style.color = 'var(--accent)';
  } else {
    starPowerMeterContainer.classList.remove('ready', 'active-mode');
    const pct = nextStarPowerThreshold === 0 ? 0 : Math.min(100, Math.round((combo / nextStarPowerThreshold) * 100));
    spMeterBar.style.width = `${pct}%`;
    spMeterStatus.innerText = `${pct}%`;
    spMeterStatus.style.color = 'var(--text-muted)';
  }
}

function stopAudio() {
  if (isPlaying && audioSource) {
    try {
      audioSource.stop();
    } catch (e) {
      // Audio already ended naturally
    }
    audioSource = null;
  }
  isPlaying = false;
  currentBuffer = null;
  activeNotes.forEach(n => scene.remove(n.group));
  activeNotes = [];
  score = 0;
  combo = 0;
  totalHits = 0;
  totalNotesProcessed = 0;
  pausedOffset = 0;
  
  recordingPressStartTimes.fill(-1);
  recordingVisualSustains.fill(null);
  activeSustains.fill(null);
  
  // Reset Star Power
  isStarPowerReady = false;
  isStarPowerActive = false;
  starPowerTimer = 0;
  nextStarPowerThreshold = 60;
  floatingStarPower.classList.remove('active');
  
  hudScoreVal.innerText = score.toString();
  updateComboUI();
  hudAccuracyVal.innerText = "100%";
}

function updateAccuracy() {
  if (totalNotesProcessed === 0) {
    hudAccuracyVal.innerText = "100%";
  } else {
    const accuracy = Math.round((totalHits / totalNotesProcessed) * 100);
    hudAccuracyVal.innerText = `${accuracy}%`;
  }
}

function checkHit(lane: number) {
  if (!isPlaying) return;
  const currentTime = audioContext.currentTime - startTime;
  const earlyWindow = 0.12;  // Can hit up to 120ms before note arrives
  const lateWindow  = 0.10;  // Can hit up to 100ms after note arrives — no snapping past-notes

  for (let i = 0; i < activeNotes.length; i++) {
    const note = activeNotes[i];
    if (!note.hit && note.lane === lane) {
      const timeDiff = currentTime - note.time; // positive = note already passed receptor
      if (timeDiff >= -earlyWindow && timeDiff <= lateWindow) {
        note.hit = true;
        restoreMusicVolume();
        
        // Snap the note's group position directly to the receptor's X/Y/Z position
        note.group.position.set(receptors[lane].position.x, receptors[lane].position.y, RECEPTOR_Z);
        
        const multiplier = isStarPowerActive ? 2 : 1;
        
        if (note.duration && note.duration > 0.15) {
          activeSustains[lane] = note;
          score += 15 * multiplier;
          combo++;
          hudScoreVal.innerText = Math.round(score).toString();
          updateComboUI();
        } else {
          note.animating = true;
          score += (10 + (combo * 2)) * multiplier;
          combo++;
          totalHits++;
          totalNotesProcessed++;
          
          hudScoreVal.innerText = Math.round(score).toString();
          updateComboUI();
          updateAccuracy();
        }
        
        if (!isStarPowerActive && combo >= nextStarPowerThreshold && !isStarPowerReady) {
          isStarPowerReady = true;
          floatingStarPower.classList.add('active');
          setTimeout(() => {
            floatingStarPower.classList.remove('active');
          }, 3000);
        }
        
        spawnParticles(receptors[lane].position, COLORS[lane % COLORS.length]);
        
        const flash = new THREE.PointLight(COLORS[lane % COLORS.length], 4, 6);
        flash.position.copy(receptors[lane].position);
        flash.position.y += 0.2;
        scene.add(flash);
        setTimeout(() => scene.remove(flash), 100);
        return;
      }
    }
  }
  
  playMissSound();
  combo = 0;
  updateComboUI();
}

// Single core song upload handler
async function handleSongStart(songName: string, arrayBuffer: ArrayBuffer, selectedMode: 'play' | 'chart', difficulty: string) {
  // Turn off background music immediately when loading starts
  triggerBgMusic(false);
  
  // Show Loading card
  hubPlayConfig.classList.add('hidden');
  hubRecordConfig.classList.add('hidden');
  hubLoading.classList.remove('hidden');
  
  try {
    isRecordingMode = selectedMode === 'chart';
    recordedNotes = [];
    recordingPressStartTimes.fill(-1);
    recordingVisualSustains.fill(null);
    activeSustains.fill(null);
    
    // Set Speed (Faster speed profiles)
    if (difficulty === 'easy') currentNoteSpeed = 15;
    else if (difficulty === 'medium') currentNoteSpeed = 20;
    else if (difficulty === 'hard') currentNoteSpeed = 25;
    else currentNoteSpeed = 20;

    // Track Name
    currentSongName = songName;
    
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    let chartNotes: { time: number, lane: number, duration?: number }[] = [];
    let numLanes = 4;
    
    if (difficulty === 'easy') numLanes = 3;
    if (difficulty === 'medium') numLanes = 4;
    if (difficulty === 'hard') numLanes = 5;
    if (difficulty === 'expert') numLanes = 5;

    // Play Mode vs Record Mode loading branches
    if (isRecordingMode) {
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
      currentBuffer = decodedBuffer;
      lastLoadedBuffer = decodedBuffer;
      localStorage.setItem(`duration_${currentSongName}`, decodedBuffer.duration.toString());
    } else {
      if (!loadedCustomChart) {
        throw new Error("No chart loaded. Please record a chart for this song first.");
      }
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
      currentBuffer = decodedBuffer;
      lastLoadedBuffer = decodedBuffer;
      chartNotes = loadedCustomChart;
      localStorage.setItem(`duration_${currentSongName}`, decodedBuffer.duration.toString());
    }

    generateScene(numLanes);
    activeNotes.forEach(n => scene.remove(n.group));
    
    const startX = -((numLanes - 1) / 2) * LANE_WIDTH;
    
    if (isRecordingMode) {
      activeNotes = [];
    } else {
      activeNotes = chartNotes.map(n => {
        const safeLane = Math.max(0, Math.min(numLanes - 1, typeof n.lane === 'number' ? n.lane : 0));
        const safeTime = typeof n.time === 'number' ? n.time : 0;
        const group = createSustainNoteGeometry(COLORS[safeLane % COLORS.length], n.duration || 0);
        group.position.set(startX + safeLane * LANE_WIDTH, 0.05, SPAWN_Z);
        return { 
          time: safeTime, 
          lane: safeLane, 
          duration: n.duration || 0, 
          group, 
          hit: false, 
          animating: false, 
          scale: 1 
        };
      });
    }
    
    score = 0;
    combo = 0;
    totalHits = 0;
    totalNotesProcessed = 0;
    pausedOffset = 0;
    
    // Populate HUD HTML Elements
    hudSongVal.innerText = currentSongName;
    hudLanesVal.innerText = numLanes.toString();
    hudNotesVal.innerText = isRecordingMode ? "Tap to Record" : chartNotes.length.toString();
    
    hudScoreVal.innerText = "0";
    updateComboUI();
    hudAccuracyVal.innerText = "100%";
    
    // Reset Hub displays
    startCountdownThenResume(true);
    
  } catch (err: any) {
    console.error(err);
    showNotification(err?.message || "Error loading song! Please ensure the file is valid.", true);
    switchState(GameState.HUB);
  }
}

// Connect Upload Controls Listeners
audioUploadPlay.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const songName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  
  const arrayBuffer = await file.arrayBuffer();
  await saveSong(songName, arrayBuffer.slice(0)); // Save to IndexedDB Library
  renderLibrary();

  if (loadedCustomChart) {
    localStorage.setItem(`chart_${songName}`, JSON.stringify(loadedCustomChart));
  } else {
    try {
      const savedChartStr = localStorage.getItem(`chart_${songName}`);
      if (savedChartStr) {
        loadedCustomChart = sanitizeChart(JSON.parse(savedChartStr));
        showNotification("Loaded previously saved chart!");
      }
    } catch(err) {
      showNotification("Saved chart data is corrupted and was skipped.", true);
    }
  }

  if (!loadedCustomChart) {
    showNotification("Song added! Switch to Record Mode to create a chart for it.", false);
    audioUploadPlay.value = '';
    return;
  }

  await handleSongStart(songName, arrayBuffer, 'play', difficultySelectPlayValue);
  audioUploadPlay.value = '';
});

audioUploadRecord.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const songName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const arrayBuffer = await file.arrayBuffer();
  await saveSong(songName, arrayBuffer.slice(0)); // Save to IndexedDB Library
  renderLibrary();

  await handleSongStart(songName, arrayBuffer, 'chart', difficultySelectRecordValue);
  audioUploadRecord.value = '';
});

async function renderLibrary() {
  const songs = await getSongList();
  const playContainer = document.getElementById('play-library-container');
  const recordContainer = document.getElementById('record-library-container');
  if (!playContainer || !recordContainer) return;

  const buildLibraryHTML = (mode: 'play' | 'chart') => {
    if (songs.length === 0) return '<div style="color:var(--text-muted); font-size:0.9rem; text-align:center; margin:10px 0;">No songs in library</div>';
    return songs.map(song => {
      const highscore = localStorage.getItem(`highscore_${song}`) || '0';
      const starsNum = parseInt(localStorage.getItem(`stars_${song}`) || '0', 10);
      const durationSec = parseFloat(localStorage.getItem(`duration_${song}`) || '0');
      
      let durationStr = '--:--';
      if (durationSec > 0) {
        const mins = Math.floor(durationSec / 60);
        const secs = Math.floor(durationSec % 60).toString().padStart(2, '0');
        durationStr = `${mins}:${secs}`;
      }
      
      const starsStr = starsNum > 0 ? '⭐'.repeat(starsNum) : '<span style="opacity:0.2">⭐⭐⭐⭐⭐</span>';

      const hasChart = !!localStorage.getItem(`chart_${song}`);
      const chartIcon = hasChart ? '<i class="fa-solid fa-file-circle-check" style="color:var(--accent)" title="Chart Ready"></i>' : '<i class="fa-solid fa-file-circle-xmark" style="color:#f43f5e" title="No Chart"></i>';

      const eSong = escapeHtml(song); // escape once, reuse everywhere
      return `
      <div class="library-item gh-style">
        <div class="gh-left">
          <div class="gh-title" title="${eSong}">${eSong}</div>
          <div class="gh-sub">LENGTH: ${durationStr} &nbsp; ${chartIcon}</div>
        </div>
        <div class="gh-dots"></div>
        <div class="gh-right">
          <div class="gh-stars">${starsStr}</div>
          <div class="gh-score">${parseInt(highscore).toLocaleString()}</div>
        </div>
        <div class="lib-actions">
          ${mode === 'play' ? `
          <label class="lib-action-btn" title="Upload JSON Chart" style="cursor:pointer; margin-bottom:0;">
            <i class="fa-solid fa-file-arrow-up"></i>
            <input type="file" class="lib-upload-json" data-song="${eSong}" accept=".json" style="display:none;" />
          </label>
          ` : ''}
          <button class="lib-action-btn lib-play-btn" data-song="${eSong}" data-mode="${mode}" title="${mode === 'play' ? 'Play' : 'Record'}"><i class="fa-solid fa-${mode === 'play' ? 'play' : 'circle-dot'}"></i></button>
          <button class="lib-action-btn lib-del-btn" data-song="${eSong}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      `;
    }).join('');
  };

  playContainer.innerHTML = buildLibraryHTML('play');
  recordContainer.innerHTML = buildLibraryHTML('chart');

  // Add event listeners
  document.querySelectorAll('.lib-play-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const songName = target.dataset.song!;
      const mode = target.dataset.mode as 'play' | 'chart';
      const difficulty = mode === 'play' ? difficultySelectPlayValue : difficultySelectRecordValue;
      
      const arrayBuffer = await getSongData(songName);
      if (!arrayBuffer) {
        showNotification("Failed to load song from library.", true);
        return;
      }
      
      if (mode === 'play') {
        if (loadedCustomChart) {
          // Bind manually uploaded chart to this song in localStorage permanently
          localStorage.setItem(`chart_${songName}`, JSON.stringify(loadedCustomChart));
        } else {
          try {
            const savedChartStr = localStorage.getItem(`chart_${songName}`);
            if (savedChartStr) {
              loadedCustomChart = sanitizeChart(JSON.parse(savedChartStr));
            }
          } catch(err) {
            showNotification("Saved chart data is corrupted and was skipped.", true);
          }
        }
        
        if (!loadedCustomChart) {
          showNotification("Please record a chart for this music first.", true);
          return;
        }
      }

      await handleSongStart(songName, arrayBuffer.slice(0), mode, difficulty);
    });
  });

  document.querySelectorAll('.lib-upload-json').forEach(input => {
    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const songName = target.dataset.song!;
      const file = target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const sanitized = sanitizeChart(data);
        localStorage.setItem(`chart_${songName}`, JSON.stringify(sanitized));
        showNotification(`Chart saved for ${songName}!`);
        renderLibrary();
      } catch (err: any) {
        showNotification(err?.message || "Invalid JSON format.", true);
      } finally {
        target.value = '';
      }
    });
  });

  document.querySelectorAll('.lib-del-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const songName = target.dataset.song!;
      const confirmed = await showConfirmModal("Delete Song", `Are you sure you want to delete '${songName}' from your library?`);
      if (confirmed) {
        await deleteSong(songName);
        renderLibrary();
      }
    });
  });
}


let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Intro Animation Logic
  if (introAnimationStartTime > 0) {
    const introDuration = 2500; // 2.5s
    const elapsed = now - introAnimationStartTime;
    
    // 1. Highway slowly comes into view (0 to 1000ms)
    const highwayProgress = Math.max(0, Math.min(1.0, elapsed / 1000));
    const highwayEase = 1 - Math.pow(1 - highwayProgress, 3); // cubic ease out

    if (track) {
      track.scale.z = Math.max(0.001, highwayEase);
      track.position.z = -50 + (50 * highwayEase);
    }
    separators.forEach(sep => {
      sep.scale.z = Math.max(0.001, highwayEase);
    });
    highwayBars.forEach(bar => {
      bar.scale.x = Math.max(0.001, highwayEase);
    });
    
    // 2. Keys jumping from left to right (Starts at 800ms)
    const keysElapsed = Math.max(0, elapsed - 800);
    
    receptors.forEach((rec, i) => {
      const delay = i * 150; // 150ms delay per lane
      const t = Math.max(0, keysElapsed - delay) / 1000.0; // local time in seconds
      
      let jumpY = 0;
      let scale = 0.001;
      
      if (t > 0) {
        scale = Math.min(1.0, t / 0.2); // Scale pops in over 0.2s
        
        // Jump twice: each jump takes 0.35s (total 0.7s)
        if (t < 0.7) {
          jumpY = Math.abs(Math.sin(t * Math.PI / 0.35)) * 0.6; // jump height 0.6
        }
      }
      
      rec.scale.setScalar(scale);
      rec.position.y = 0.05 + jumpY;
    });

    if (elapsed >= introDuration) {
      introAnimationStartTime = 0; // done
      receptors.forEach(rec => {
        rec.scale.setScalar(1.0);
        rec.position.y = 0.05;
      });
    }
  }

  // Star Power trigger and visual logic
  if (input.keysDown.has(' ') && !input.prevKeysDown.has(' ') && isStarPowerReady && !isStarPowerActive && isPlaying && currentState === GameState.PLAY) {
    isStarPowerReady = false;
    isStarPowerActive = true;
    starPowerTimer = 10;
    nextStarPowerThreshold = combo + 70;
    playStarPowerSound();
    
    floatingStarPower.classList.remove('active');
    
    activeNotes.forEach(n => {
       updateNoteColor(n.group, 0xff5500); // Fiery orange
    });
  }
  
  if (isStarPowerActive) {
    starPowerTimer -= dt;
    updateStarPowerMeterUI();
    if (starPowerTimer <= 0) {
      isStarPowerActive = false;
      
      if (track) {
         (track.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
         (track.material as THREE.MeshStandardMaterial).color.setHex(0x0c0f24);
      }
      
      // Revert visual effects
      fireEdges.forEach(f => {
        (f.material as THREE.MeshStandardMaterial).opacity = 0;
        (f.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
      });
      
      activeNotes.forEach(n => {
         updateNoteColor(n.group, COLORS[n.lane % COLORS.length]);
      });
      
      // Restore music volume
      if (mainTrackGainNode && audioContext) {
        mainTrackGainNode.gain.cancelScheduledValues(audioContext.currentTime);
        mainTrackGainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + 1.0);
      }
    } else {
      if (track) {
         (track.material as THREE.MeshStandardMaterial).emissive.setHex(0x331100);
         (track.material as THREE.MeshStandardMaterial).color.setHex(0x331100);
      }
      
      // Intense fire red glow for outer edges ONLY, with flickering
      const fireRed = new THREE.Color(0xff3300);
      const flicker = 8.0 + Math.random() * 4.0; 
      
      fireEdges.forEach(f => {
        (f.material as THREE.MeshStandardMaterial).opacity = 0.85;
        (f.material as THREE.MeshStandardMaterial).emissive.copy(fireRed);
        (f.material as THREE.MeshStandardMaterial).emissiveIntensity = flicker;
      });
      
      // Spawn animated fire particles rapidly
      for (let i = 0; i < 4; i++) {
        spawnFireParticle(true);
        spawnFireParticle(false);
      }
    }
  }

  // Update Fire Particles
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const p = fireParticles[i];
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      if (p.mesh.geometry) p.mesh.geometry.dispose();
      if (p.mesh.material) (p.mesh.material as THREE.Material).dispose();
      fireParticles.splice(i, 1);
    } else {
      p.mesh.position.addScaledVector(p.velocity, dt);
      
      // Shrink and fade
      const progress = p.life / p.maxLife; // 1 to 0
      p.mesh.scale.setScalar(progress * p.initialScale);
      
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = progress;
        // Shift color towards deep red as it dies
        if (progress < 0.5) {
           mat.color.lerp(new THREE.Color(0xff0000), dt * 5);
        }
      }
      
      // Chaotic spin
      p.mesh.rotation.x += dt * 5;
      p.mesh.rotation.y += dt * 5;
    }
  }

  // Scroll highway bars (both modes flow Up-to-Down)
  if (isPlaying && currentState === GameState.PLAY) {
    highwayBars.forEach(bar => {
      bar.position.z += dt * currentNoteSpeed;
      if (bar.position.z > RECEPTOR_Z + 5) {
        bar.position.z = SPAWN_Z;
      }
    });
  }

  // Pause/Resume via ESC, P, or Gamepad Start
  const escPressed = input.keysDown.has('escape') && !input.prevKeysDown.has('escape');
  const pPressed = input.keysDown.has('p') && !input.prevKeysDown.has('p');
  const startPressed = input.gamepadButtonsDown.has(9) && !input.prevGamepadButtonsDown.has(9);
  const pauseTriggered = escPressed || pPressed || startPressed;
  
  if (currentState === GameState.PLAY && pauseTriggered) {
    pauseAudio();
    switchState(GameState.PAUSED);
    // Show hamburger open with menu
    hamburgerBtn.classList.add('open');
    hamburgerMenu.classList.add('open');
    btnHamResume.textContent = '▶  Resume';
  } else if (currentState === GameState.PAUSED && pauseTriggered) {
    hamburgerMenu.classList.remove('open');
    hamburgerBtn.classList.remove('open');
    startCountdownThenResume(false);
  }

  if (currentState === GameState.TITLE) {
    if (input.isAnyActionJustPressed()) switchState(GameState.HUB);
  }

  if (currentState === GameState.CALIBRATE) {
    handleCalibrationInput();
  }

  if (currentState === GameState.PLAY || currentState === GameState.HUB || currentState === GameState.TITLE) {
    const startX = -((currentNumLanes - 1) / 2) * LANE_WIDTH;
    const currentTime = audioContext ? audioContext.currentTime - startTime : 0;

    for (let i = 0; i < currentNumLanes; i++) {
      const rec = receptors[i];
      if (!rec) continue;
      const cInfo = (rec as any).canvasInfo;
      
      const isPressed = input.isLaneDown(i);
      
      // Update receptor textures on press/release
      if (isPressed) {
        if (cInfo) {
          drawReceptorCanvas(cInfo.ctx, cInfo.color, cInfo.key, true);
          cInfo.texture.needsUpdate = true;
        }
        rec.scale.set(0.92, 1, 0.92);
      } else {
        if (cInfo) {
          drawReceptorCanvas(cInfo.ctx, cInfo.color, cInfo.key, false);
          cInfo.texture.needsUpdate = true;
        }
        rec.scale.set(1.0, 1.0, 1.0);
      }
      
      // Recording Input Logic:
      if (isRecordingMode && isPlaying && currentState === GameState.PLAY) {
        if (input.isLaneJustPressed(i)) {
          recordingPressStartTimes[i] = currentTime;
          
          // Spawn note group container with head immediately
          const group = new THREE.Group();
          const head = createNoteGeometry(COLORS[i % COLORS.length]);
          group.add(head);
          
          group.position.set(startX + i * LANE_WIDTH, 0.05, -40);
          scene.add(group);
          recordingVisualSustains[i] = group;

          // Sound effects & flashes
          spawnParticles(rec.position, COLORS[i % COLORS.length]);
          const flash = new THREE.PointLight(COLORS[i % COLORS.length], 4, 6);
          flash.position.copy(rec.position);
          flash.position.y += 0.2;
          scene.add(flash);
          setTimeout(() => scene.remove(flash), 100);
        }
        
        // Growing sustain tail while holding down
        if (isPressed && recordingPressStartTimes[i] !== -1) {
          const pressStart = recordingPressStartTimes[i];
          const duration = currentTime - pressStart;
          const group = recordingVisualSustains[i];
          
          if (group) {
            const tailLength = duration * currentNoteSpeed;
            // Move note head down the highway (Up-to-Down direction from far end)
            group.position.z = -40 + tailLength;
            
            // Only draw tail/cap if duration exceeds sustain note threshold (0.15s)
            if (duration > 0.15) {
              // Clear previous visual tails/caps
              while (group.children.length > 1) {
                group.remove(group.children[1]);
              }
              
              const tailGeo = new THREE.BoxGeometry(0.3, 0.04, tailLength);
              const tailMat = new THREE.MeshStandardMaterial({
                color: COLORS[i % COLORS.length],
                emissive: COLORS[i % COLORS.length],
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.6
              });
              const tailMesh = new THREE.Mesh(tailGeo, tailMat);
              tailMesh.position.set(0, 0.04, -tailLength / 2);
              group.add(tailMesh);
              
              const capGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.06, 16);
              const capMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: COLORS[i % COLORS.length],
                emissiveIntensity: 0.4,
                transparent: true,
                opacity: 0.8
              });
              const capMesh = new THREE.Mesh(capGeo, capMat);
              capMesh.position.set(0, 0.04, -tailLength);
              group.add(capMesh);
            }
          }
        }
        
        // Key released - save note to chart
        if (!isPressed && recordingPressStartTimes[i] !== -1) {
          const pressStart = recordingPressStartTimes[i];
          const duration = currentTime - pressStart;
          
          // Save note
          const finalDuration = duration > 0.15 ? duration : 0;
          recordedNotes.push({
            time: pressStart,
            lane: i,
            duration: finalDuration
          });
          
          // Update visual count
          hudNotesVal.innerText = `${recordedNotes.length} notes`;
          
          // Transfer visual sustain to normal floating notes so it scrolls away
          const group = recordingVisualSustains[i];
          if (group) {
            if (finalDuration === 0) {
              // Tap note: clean up placeholder tail/cap
              while (group.children.length > 1) {
                group.remove(group.children[1]);
              }
            }
            activeNotes.push({
              time: pressStart,
              lane: i,
              duration: finalDuration,
              group: group,
              hit: false,
              animating: false,
              scale: 1.0
            });
          }
          
          recordingPressStartTimes[i] = -1;
          recordingVisualSustains[i] = null;
        }
      } else {
        // Play Mode: Lanes input check hit
        if (input.isLaneJustPressed(i) && currentState === GameState.PLAY) {
          checkHit(i);
        }
      }
    }
  }

  if (isPlaying) {
    const currentTime = audioContext.currentTime - startTime;
    
    // Song playback completed check
    if (currentBuffer && currentTime >= currentBuffer.duration + 1.0) {
      showCompleteScreen();
    }

    // Playback active sustain ticks scoring & feedback
    for (let i = 0; i < currentNumLanes; i++) {
      const activeNote = activeSustains[i];
      if (activeNote) {
        if (input.isLaneDown(i)) {
          // Accumulate sustain hold points
          const multiplier = isStarPowerActive ? 2 : 1;
          score += dt * 35 * multiplier; 
          hudScoreVal.innerText = Math.round(score).toString();
          
          if (Math.random() < 0.15) {
            spawnParticles(receptors[i].position, COLORS[i % COLORS.length]);
          }

          // Glow the note bar while held
          setSustainGlow(activeNote.group, true);

          // Shrink the sustain tail in real-time
          const remainingDuration = (activeNote.time + (activeNote.duration || 0)) - currentTime;
          const ratio = Math.max(0, Math.min(1, remainingDuration / (activeNote.duration || 1)));
          const tailMesh = activeNote.group.children[1] as THREE.Mesh;
          const capMesh = activeNote.group.children[2] as THREE.Mesh;
          if (tailMesh) {
            tailMesh.scale.z = ratio;
            tailMesh.position.z = -(remainingDuration * currentNoteSpeed) / 2;
          }
          if (capMesh) {
            capMesh.position.z = -(remainingDuration * currentNoteSpeed);
          }
          
          // If we reached the end of the hold duration
          if (currentTime >= activeNote.time + (activeNote.duration || 0)) {
            activeSustains[i] = null;
            activeNote.animating = true;
            totalHits++;
            totalNotesProcessed++;
            updateAccuracy();
            spawnParticles(receptors[i].position, COLORS[i % COLORS.length]);
          }
        } else {
          // Released key too early - drop sustain note
          activeSustains[i] = null;
          
          // Reset glow and mark tail grey to show dropped note
          setSustainGlow(activeNote.group, false);
          const tailMesh = activeNote.group.children[1] as THREE.Mesh;
          if (tailMesh && tailMesh.material) {
            (tailMesh.material as THREE.MeshStandardMaterial).color.setHex(0x555555);
            (tailMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x111111);
            (tailMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
          }
        }
      }
    }

    activeNotes.forEach(note => {
      if (isRecordingMode) {
        // RECORD MODE NOTE MOVEMENT (Up to Down starting from far end)
        const elapsed = currentTime - note.time;
        const noteZ = -40 + (elapsed * currentNoteSpeed);
        note.group.position.z = noteZ;
        
        if (noteZ > 12) {
          scene.remove(note.group);
        }
        return;
      }

      if (note.animating) {
        note.scale -= dt * 4.5;
        if (note.scale <= 0) {
          scene.remove(note.group);
          note.animating = false;
        } else {
          note.group.scale.set(note.scale, 1.0, note.scale);
          note.group.children.forEach(c => {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (m) {
              m.opacity = note.scale;
              m.transparent = true;
            }
          });
        }
        return;
      }

      if (note.hit) {
        // Sustain note currently being held smoothly glides Z position to receptor point
        if (activeSustains[note.lane] === note) {
          note.group.position.z = THREE.MathUtils.lerp(note.group.position.z, RECEPTOR_Z, dt * 12);
          return;
        }
      }
      
      const timeDiff = note.time - currentTime;
      const noteZ = RECEPTOR_Z - (timeDiff * currentNoteSpeed);
      
      if (noteZ > SPAWN_Z && !note.group.parent) {
        scene.add(note.group);
      }
      
      note.group.position.z = noteZ;
      
      // Miss window check
      if (timeDiff < -0.2 && !note.hit) {
        note.hit = true;
        
        playMissSound();
        combo = 0;
        totalNotesProcessed++;
        updateComboUI();
        updateAccuracy();
        
        if (!(note.duration && note.duration > 0.15)) {
          // Tap note complete miss
          scene.remove(note.group);
        }
      }
    });

    // Cleanup sustain notes that were dropped and finished scrolling past
    activeNotes.forEach(note => {
      if (note.hit && note.duration && note.duration > 0.15 && activeSustains[note.lane] !== note) {
        if (currentTime > note.time + note.duration + 0.25) {
          scene.remove(note.group);
        }
      }
    });
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt * 2.2; // fade out in ~0.45 seconds
    if (p.life <= 0) {
      scene.remove(p.mesh);
      if (p.mesh.material) {
        (p.mesh.material as THREE.Material).dispose();
      }
      particles.splice(i, 1);
    } else {
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 16 * dt; // gravity
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = p.life;
        mat.transparent = true;
      }
      const initScale = (p.mesh as any).initialScale || 1.0;
      p.mesh.scale.setScalar(p.life * initScale);
    }
  }

  renderer.render(scene, camera);
  input.update();
}


// Spawn animated fire particle for the highway edges
function spawnFireParticle(isLeftEdge: boolean) {
  const laneSpan = (currentNumLanes * LANE_WIDTH);
  const x = (isLeftEdge ? -1 : 1) * (laneSpan / 2 + 0.15);
  // Spawn randomly along the Z axis of the highway
  const z = Math.random() * (Math.abs(SPAWN_Z) + RECEPTOR_Z + 10) + SPAWN_Z;
  
  // 3D fire ember geometry
  const geo = new THREE.TetrahedronGeometry(0.15 + Math.random() * 0.15, 0);
  
  // Colors range from bright yellow to deep orange/red
  const color = new THREE.Color();
  const rand = Math.random();
  if (rand > 0.6) color.setHex(0xffaa00); // Yellow/Orange
  else if (rand > 0.3) color.setHex(0xff5500); // Orange
  else color.setHex(0xff1100); // Red
  
  const mat = new THREE.MeshBasicMaterial({ 
    color: color, 
    transparent: true, 
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  
  const mesh = new THREE.Mesh(geo, mat);
  
  // Random X jitter for thickness
  mesh.position.set(x + (Math.random() - 0.5) * 0.5, 0.1 + Math.random() * 0.3, z);
  
  // Random initial rotation
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  
  scene.add(mesh);
  
  const maxLife = 0.3 + Math.random() * 0.2;
  fireParticles.push({
    mesh,
    life: maxLife,
    maxLife,
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * 2.0, // X drift
      2.0 + Math.random() * 4.0,   // Y shoot up
      -5.0 - Math.random() * 15.0  // Z shoot back
    ),
    initialScale: 0.5 + Math.random() * 1.5
  });
}

// Synthesized Power Up Sound for Intro Animation
function playPowerUpSound() {
  try {
    const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!ctx) return;
    
    fetch('startup.mp3')
      .then(res => res.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(audioBuffer => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.8;
        
        source.connect(gainNode);
        gainNode.connect(ctx.destination); // always route directly; mainTrackGainNode may be null
        source.start(0);
      })
      .catch(e => console.error("Error playing startup sound:", e));
  } catch (e) {
    // Ignore context errors
  }
}

// Star Power activation sound effect (OG Guitar Hero SFX + Simultaneous Applause)
function playStarPowerSound() {
  try {
    const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!ctx) return;

    // Duck main track volume slightly
    if (mainTrackGainNode) {
      mainTrackGainNode.gain.cancelScheduledValues(ctx.currentTime);
      mainTrackGainNode.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 0.5);
    }

    const scheduleNow = ctx.currentTime; // for volume scheduling only

    // Play both star power SFX and applause simultaneously
    const playBoth = () => {
      const now = ctx.currentTime; // fresh capture when buffers are actually ready

      // --- OG Guitar Hero Star Power SFX ---
      if (starPowerAudioBuffer) {
        const spSource = ctx.createBufferSource();
        spSource.buffer = starPowerAudioBuffer;
        const spGain = ctx.createGain();
        spGain.gain.value = 1.5;
        spSource.connect(spGain);
        spGain.connect(ctx.destination);
        spSource.start(now);
        spSource.stop(now + 2.5); // Only play the initial strike, avoid thunder loop
      }

      // --- Crowd Applause (simultaneous, no delay) ---
      if (applauseAudioBuffer) {
        const apSource = ctx.createBufferSource();
        apSource.buffer = applauseAudioBuffer;
        const apGain = ctx.createGain();
        apGain.gain.setValueAtTime(1.4, now);
        apGain.gain.setValueAtTime(1.4, now + 8);
        apGain.gain.linearRampToValueAtTime(0, now + 10);
        apSource.connect(apGain);
        apGain.connect(ctx.destination);
        apSource.start(now);
        apSource.stop(now + 10);
      }
    };

    // Load any missing buffers then play
    const loadPromises: Promise<void>[] = [];

    if (!starPowerAudioBuffer) {
      loadPromises.push(
        fetch('star-power.mp3')
          .then(res => res.arrayBuffer())
          .then(buf => ctx.decodeAudioData(buf))
          .then(ab => { starPowerAudioBuffer = ab; })
          .catch(e => console.error('star-power load error:', e))
      );
    }

    if (!applauseAudioBuffer) {
      loadPromises.push(
        fetch('applause.mp3')
          .then(res => res.arrayBuffer())
          .then(buf => ctx.decodeAudioData(buf))
          .then(ab => { applauseAudioBuffer = ab; })
          .catch(e => console.error('applause load error:', e))
      );
    }

    if (loadPromises.length > 0) {
      Promise.all(loadPromises).then(() => playBoth());
    } else {
      playBoth();
    }

    // Restore main track volume after star power ends
    if (mainTrackGainNode) {
      mainTrackGainNode.gain.setValueAtTime(0.65, scheduleNow + 10);
      mainTrackGainNode.gain.linearRampToValueAtTime(1.0, scheduleNow + 11);
    }

  } catch (e) {}
}

// Bubbly Hover Sound effect
function playBubbleSound() {
  try {
    const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);
    
    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {}
}

// Missed Note Sound effect with variants from file
function playMissSound() {
  duckMusicVolume();
  try {
    const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!ctx) return;
    
    const playVariant = () => {
      if (!missAudioBuffer) return;
      const source = ctx.createBufferSource();
      source.buffer = missAudioBuffer;
      
      // Select a random variant slice from the ~3 second file
      const offsets = [0, 0.6, 1.2, 1.8, 2.4];
      const offset = offsets[Math.floor(Math.random() * offsets.length)];
      const duration = 0.6; 
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.7;
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.start(0, offset, duration);
    };

    if (!missAudioBuffer) {
      fetch('miss.mp3')
        .then(res => res.arrayBuffer())
        .then(buf => ctx.decodeAudioData(buf))
        .then(audioBuffer => {
          missAudioBuffer = audioBuffer;
          playVariant();
        })
        .catch(e => console.error("Error loading miss sound:", e));
    } else {
      playVariant();
    }
  } catch (e) {}
}

// Progressive Star Pop Sound (Arpeggio scale)
function playStarPopSound(index: number) {
  try {
    const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    const freqs = [523.25, 587.33, 659.25, 783.99, 880.00]; // C5, D5, E5, G5, A5
    const freq = freqs[index % freqs.length];
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch (e) {}
}

function addHoverSounds() {
  const targets = document.querySelectorAll('button, .btn, .start-btn, .hud-btn, .ham-menu-btn, .choice-card, .lane-calib, .custom-option');
  targets.forEach(el => {
    el.addEventListener('mouseenter', () => {
      playBubbleSound();
    });
  });
}

// Initial state and loop kick-off
switchState(GameState.TITLE);
animate();

// Initialize UI hover audio triggers
addHoverSounds();

// Unlock and play background music on the first user interaction gesture
// Use the same reference for both listeners so removeEventListener works correctly.
// The original code used an anonymous wrapper for 'click', meaning it could never
// be removed and called triggerBgMusic on every click for the entire session.
const unlockAudio = () => {
  if (currentState !== GameState.PLAY) {
    triggerBgMusic(true);
  }
  window.removeEventListener('click', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
};

window.addEventListener('click', unlockAudio);
window.addEventListener('keydown', unlockAudio);
// Separate persistent handler for body focus (intentionally always active)
window.addEventListener('click', () => document.body.focus());

btnStartGame.addEventListener('click', () => {
  if (currentState === GameState.TITLE) {
    switchState(GameState.HUB);
  }
});

// Utility: Custom Confirm Modal
async function showConfirmModal(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal')!;
    const titleEl = document.getElementById('confirm-title')!;
    const messageEl = document.getElementById('confirm-message')!;
    const btnCancel = document.getElementById('btn-confirm-cancel')!;
    const btnOk = document.getElementById('btn-confirm-ok')!;

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.remove('hidden');

    const cleanup = () => {
      btnCancel.removeEventListener('click', onCancel);
      btnOk.removeEventListener('click', onOk);
      modal.classList.add('hidden');
    };

    const onCancel = () => { cleanup(); resolve(false); };
    const onOk = () => { cleanup(); resolve(true); };

    btnCancel.addEventListener('click', onCancel);
    btnOk.addEventListener('click', onOk);
  });
}
