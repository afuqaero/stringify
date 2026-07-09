import * as THREE from 'three';
import { input } from './inputManager';
import { inject } from '@vercel/analytics';

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
const btnCalibPlay = document.getElementById('btn-calib-play')!;
const btnCalibRecord = document.getElementById('btn-calib-record')!;
const btnPlayBack = document.getElementById('btn-play-back')!;
const btnRecordBack = document.getElementById('btn-record-back')!;
const btnCalibDone = document.getElementById('btn-calib-done')!;

// Game HUD Elements
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

type GameState = 'TITLE' | 'HUB' | 'CALIBRATE' | 'PLAY' | 'PAUSED' | 'COMPLETE';
const GameState = {
  TITLE: 'TITLE' as GameState,
  HUB: 'HUB' as GameState,
  CALIBRATE: 'CALIBRATE' as GameState,
  PLAY: 'PLAY' as GameState,
  PAUSED: 'PAUSED' as GameState,
  COMPLETE: 'COMPLETE' as GameState,
};
let currentState = GameState.TITLE;

// Background Music
const bgMusic = document.getElementById('bg-music') as HTMLAudioElement;
if (bgMusic) {
  bgMusic.volume = 0.2; // 20% volume
}

function triggerBgMusic(play: boolean) {
  if (!bgMusic) return;
  if (play) {
    bgMusic.play().catch(() => {
      // Catch autoplay block
    });
  } else {
    bgMusic.pause();
  }
}

// Game State variables
let audioContext: AudioContext;
let audioSource: AudioBufferSourceNode | null = null;
let currentBuffer: AudioBuffer | null = null;
let lastLoadedBuffer: AudioBuffer | null = null;
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

// Calibration parameters tracking
let calibDifficultySource: 'play' | 'record' = 'play';

// Custom in-game toast notifications helper
function showNotification(message: string, isError: boolean = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  
  const icon = isError ? 'fa-triangle-exclamation' : 'fa-circle-check';
  const color = isError ? 'var(--primary)' : 'var(--accent)';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}" style="color: ${color};"></i>
    <span>${message}</span>
  `;
  
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
  const offset = 290 + (numLanes - 3) * 70;
  floatingCombo.style.left = `calc(50% + ${offset}px)`;
  
  // Clear old objects
  if (track) scene.remove(track);
  separators.forEach(s => scene.remove(s));
  receptors.forEach(r => scene.remove(r));
  highwayBars.forEach(b => scene.remove(b));
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

  // Track Left Border
  const leftBorderGeo = new THREE.PlaneGeometry(0.06, Math.abs(SPAWN_Z) + RECEPTOR_Z + 10);
  const leftBorderMat = new THREE.MeshBasicMaterial({ color: 0x3ca2f4, transparent: true, opacity: 0.7 });
  const leftBorder = new THREE.Mesh(leftBorderGeo, leftBorderMat);
  leftBorder.rotation.x = -Math.PI / 2;
  leftBorder.position.set(startX - LANE_WIDTH / 2, 0.012, track.position.z);
  scene.add(leftBorder);
  separators.push(leftBorder);

  // Track Right Border
  const rightBorderGeo = new THREE.PlaneGeometry(0.06, Math.abs(SPAWN_Z) + RECEPTOR_Z + 10);
  const rightBorderMat = new THREE.MeshBasicMaterial({ color: 0x3ca2f4, transparent: true, opacity: 0.7 });
  const rightBorder = new THREE.Mesh(rightBorderGeo, rightBorderMat);
  rightBorder.rotation.x = -Math.PI / 2;
  rightBorder.position.set(startX + numLanes * LANE_WIDTH - LANE_WIDTH / 2, 0.012, track.position.z);
  scene.add(rightBorder);
  separators.push(rightBorder);

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
    group.position.set(startX + i * LANE_WIDTH, 0.05, RECEPTOR_Z);
    
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

// Handle Custom Chart Upload (Play Mode)
chartUpload.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    // Parse JSON
    const data = JSON.parse(text);
    // Sanitize and validate incoming values
    loadedCustomChart = sanitizeChart(data);
    
    showNotification("Custom Chart Loaded Successfully! Step 2 is now unlocked.");
    
    // Unlock play mode audio button
    audioUploadPlayLabel.style.opacity = '1';
    audioUploadPlayLabel.style.pointerEvents = 'auto';
    audioUploadPlayLabel.classList.add('btn-accent');
    document.getElementById('chart-upload-label')?.classList.remove('btn-accent');
  } catch (err: any) {
    console.error("Failed to parse/sanitize chart:", err);
    showNotification(err?.message || "Failed to load chart JSON. Ensure it is a valid format.", true);
    loadedCustomChart = null;
  } finally {
    chartUpload.value = '';
  }
});

// Update UI state
function switchState(newState: GameState) {
  const shouldPlayBgMusic = (newState === GameState.TITLE || newState === GameState.HUB || newState === GameState.CALIBRATE);
  triggerBgMusic(shouldPlayBgMusic);
  currentState = newState;
  screenTitle.classList.add('hidden');
  screenHub.classList.add('hidden');
  screenCalib.classList.add('hidden');
  screenPause.classList.add('hidden');
  screenComplete.classList.add('hidden');
  topHud.classList.add('hidden');
  statsHud.classList.add('hidden');
  floatingCombo.style.opacity = '0';
  recordIndicator.classList.add('hidden');
  hamburgerBtn.style.display = 'none';
  hamburgerMenu.classList.remove('open');
  hamburgerBtn.classList.remove('open');

  if (newState === GameState.TITLE) screenTitle.classList.remove('hidden');
  if (newState === GameState.HUB) {
    screenHub.classList.remove('hidden');
    
    // Reset back to main Play/Record choices
    hubChoiceSelect.classList.remove('hidden');
    hubPlayConfig.classList.add('hidden');
    hubRecordConfig.classList.add('hidden');
    hubLoading.classList.add('hidden');

    // Reset lock state for Play Mode song upload
    loadedCustomChart = null;
    audioUploadPlayLabel.style.opacity = '0.5';
    audioUploadPlayLabel.style.pointerEvents = 'none';
    audioUploadPlayLabel.classList.remove('btn-accent');
    document.getElementById('chart-upload-label')?.classList.add('btn-accent');
  }
  if (newState === GameState.CALIBRATE) {
    populateCalibrationUI();
    screenCalib.classList.remove('hidden');
  }
  if (newState === GameState.PAUSED) {
    screenPause.classList.remove('hidden');
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
  if (newState === GameState.PLAY) {
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
  audioUploadPlayLabel.style.opacity = '0.5';
  audioUploadPlayLabel.style.pointerEvents = 'none';
  audioUploadPlayLabel.classList.remove('btn-accent');
  document.getElementById('chart-upload-label')?.classList.add('btn-accent');
});
btnRecordBack.addEventListener('click', () => {
  hubRecordConfig.classList.add('hidden');
  hubChoiceSelect.classList.remove('hidden');
});

// HUD Controls Events
document.getElementById('btn-start-game')?.addEventListener('click', () => switchState(GameState.HUB));

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
function startCountdownThenResume() {
  let count = 3;
  countdownOverlay.classList.add('active');
  countdownNumber.textContent = String(count);
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
    startCountdownThenResume();
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
  startCountdownThenResume();
});
btnQuit.addEventListener('click', () => {
  stopAudio();
  switchState(GameState.HUB);
});

function showCompleteScreen() {
  if (isPlaying && audioSource) {
    audioSource.stop();
    audioSource = null;
  }
  isPlaying = false;

  const titleSub = screenComplete.querySelector('.menu-subtitle') as HTMLElement;
  const titleH2 = screenComplete.querySelector('h2') as HTMLElement;
  const statsSummary = screenComplete.querySelector('.card > div:nth-of-type(2)') as HTMLElement;
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
    
    if (statsSummary) {
      statsSummary.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.15rem;">
          <span style="color: var(--text-muted);">Final Score:</span>
          <span id="complete-score" style="font-weight: 900; color: #ffffff;">${Math.round(score)}</span>
        </div>
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
  
  switchState(GameState.PLAY);
  playAudio();
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
  audioSource.connect(audioContext.destination);
  
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
  }
}

function stopAudio() {
  if (isPlaying && audioSource) {
    audioSource.stop();
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
        
        // Snap the note's group position directly to the receptor's X/Y/Z position
        note.group.position.set(receptors[lane].position.x, receptors[lane].position.y, RECEPTOR_Z);
        
        if (note.duration && note.duration > 0.15) {
          activeSustains[lane] = note;
          score += 15;
          combo++;
          hudScoreVal.innerText = Math.round(score).toString();
          updateComboUI();
        } else {
          note.animating = true;
          score += 10 + (combo * 2);
          combo++;
          totalHits++;
          totalNotesProcessed++;
          
          hudScoreVal.innerText = Math.round(score).toString();
          updateComboUI();
          updateAccuracy();
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
  
  combo = 0;
  updateComboUI();
}

// Single core song upload handler
async function handleSongStart(file: File, selectedMode: 'play' | 'chart', difficulty: string) {
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
    currentSongName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

    const arrayBuffer = await file.arrayBuffer();
    
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
    } else {
      if (!loadedCustomChart) {
        throw new Error("No custom chart loaded! You must upload a JSON chart in Step 1.");
      }
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
      currentBuffer = decodedBuffer;
      lastLoadedBuffer = decodedBuffer;
      chartNotes = loadedCustomChart;
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
    switchState(GameState.PLAY);
    playAudio();
    
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
  await handleSongStart(file, 'play', difficultySelectPlayValue);
  audioUploadPlay.value = '';
});

audioUploadRecord.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  await handleSongStart(file, 'chart', difficultySelectRecordValue);
  audioUploadRecord.value = '';
});

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Scroll highway bars
  if (isPlaying && currentState === GameState.PLAY) {
    highwayBars.forEach(bar => {
      if (isRecordingMode) {
        bar.position.z -= dt * currentNoteSpeed;
        if (bar.position.z < SPAWN_Z) {
          bar.position.z = RECEPTOR_Z;
        }
      } else {
        bar.position.z += dt * currentNoteSpeed;
        if (bar.position.z > RECEPTOR_Z + 5) {
          bar.position.z = SPAWN_Z;
        }
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
    startCountdownThenResume();
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
          
          group.position.set(startX + i * LANE_WIDTH, 0.05, RECEPTOR_Z);
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
            // Move note head up the highway smoothly in real-time
            group.position.z = RECEPTOR_Z - tailLength;
            
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
              tailMesh.position.set(0, 0.04, tailLength / 2);
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
              capMesh.position.set(0, 0.04, tailLength);
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
          score += dt * 35; 
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
        // RECORD MODE NOTE MOVEMENT (Down to Up)
        const elapsed = currentTime - note.time;
        const noteZ = RECEPTOR_Z - (elapsed * currentNoteSpeed);
        note.group.position.z = noteZ;
        
        if (noteZ < SPAWN_Z) {
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
        
        // For sustain notes, check complete miss after duration passed
        if (note.duration && note.duration > 0.15) {
          if (currentTime > note.time + note.duration + 0.15) {
            scene.remove(note.group);
            combo = 0;
            totalNotesProcessed++;
            updateComboUI();
            updateAccuracy();
          }
        } else {
          // Tap note complete miss
          scene.remove(note.group);
          combo = 0;
          totalNotesProcessed++;
          updateComboUI();
          updateAccuracy();
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
const unlockAudio = () => {
  if (currentState !== GameState.PLAY) {
    triggerBgMusic(true);
  }
  window.removeEventListener('click', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
};
window.addEventListener('click', unlockAudio);
window.addEventListener('keydown', unlockAudio);
