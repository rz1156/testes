/* ============================================
   CYBER CAMERA INTERFACE - SCRIPT.JS
   Futuristic AI Camera with Hand Tracking
   ============================================ */

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const CONFIG = {
    // Camera Settings
    camera: {
        width: 1280,
        height: 720,
        facingMode: 'user'
    },
    
    // MediaPipe Hands Settings
    mediapipe: {
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
    },
    
    // Visual Settings
    visual: {
        jointRadius: 5,
        jointGlowRadius: 15,
        connectionWidth: 2,
        trailLength: 10,
        trailFadeRate: 0.1
    },
    
    // Blur Settings
    blur: {
        radius: 15,
        brightness: 0.9,
        contrast: 1.1,
        transitionDuration: 300
    },
    
    // Animation Settings
    animation: {
        loadingStepDelay: 600,
        fpsUpdateInterval: 500
    }
};

// Hand Landmark Connections for skeleton drawing
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],       // Index
    [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17]             // Palm
];

// Fingertip landmark indices
const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

// Gesture Names
const GESTURES = {
    NONE: 'NONE',
    THUMBS_UP: '👍 THUMBS UP',
    PEACE: '✌️ PEACE',
    OPEN_HAND: '✋ OPEN HAND',
    FIST: '👊 FIST',
    POINTING: '☝️ POINTING'
};

// ============================================
// GLOBAL STATE
// ============================================

const state = {
    // Application State
    isInitialized: false,
    isCameraActive: false,
    isBlurActive: false,
    currentGesture: GESTURES.NONE,
    
    // Performance
    fps: 60,
    lastFrameTime: 0,
    frameCount: 0,
    
    // Hand Tracking
    hands: null,
    landmarks: [],
    fingertipTrails: new Map(),
    
    // Animation
    particleSystem: null,
    animationFrame: null
};

// ============================================
// DOM ELEMENT REFERENCES
// ============================================

const elements = {
    // Main Elements
    glassCard: null,
    cameraInterface: null,
    openCameraBtn: null,
    closeCameraBtn: null,
    
    // Loading
    loadingHud: null,
    loadingLines: null,
    
    // Camera
    cameraContainer: null,
    videoElement: null,
    trackingCanvas: null,
    blurCanvas: null,
    
    // HUD Elements
    fpsValue: null,
    cameraStatus: null,
    trackingStatus: null,
    fingerCount: null,
    gestureValue: null,
    blurStatus: null,
    
    // Error
    errorPanel: null,
    tryAgainBtn: null,
    
    // Particle Canvas
    particleCanvas: null
};

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Main initialization function
 */
function initializeApp() {
    cacheElements();
    initializeParticles();
    attachEventListeners();
    state.isInitialized = true;
    console.log('🎯 Cyber Camera Interface initialized');
}

/**
 * Cache all DOM element references
 */
function cacheElements() {
    elements.glassCard = document.getElementById('glassCard');
    elements.cameraInterface = document.getElementById('cameraInterface');
    elements.openCameraBtn = document.getElementById('openCameraBtn');
    elements.closeCameraBtn = document.getElementById('closeCameraBtn');
    elements.loadingHud = document.getElementById('loadingHud');
    elements.loadingLines = document.querySelectorAll('.loading-line');
    elements.cameraContainer = document.getElementById('cameraContainer');
    elements.videoElement = document.getElementById('videoElement');
    elements.trackingCanvas = document.getElementById('trackingCanvas');
    elements.blurCanvas = document.getElementById('blurCanvas');
    elements.fpsValue = document.getElementById('fpsValue');
    elements.cameraStatus = document.getElementById('cameraStatus');
    elements.trackingStatus = document.getElementById('trackingStatus');
    elements.fingerCount = document.getElementById('fingerCount');
    elements.gestureValue = document.getElementById('gestureValue');
    elements.blurStatus = document.getElementById('blurStatus');
    elements.errorPanel = document.getElementById('errorPanel');
    elements.tryAgainBtn = document.getElementById('tryAgainBtn');
    elements.particleCanvas = document.getElementById('particleCanvas');
}

/**
 * Attach all event listeners
 */
function attachEventListeners() {
    // Open Camera Button
    elements.openCameraBtn.addEventListener('click', handleOpenCamera);
    elements.openCameraBtn.addEventListener('mousedown', createRippleEffect);
    
    // Close Camera Button
    elements.closeCameraBtn.addEventListener('click', handleCloseCamera);
    
    // Try Again Button
    elements.tryAgainBtn.addEventListener('click', handleTryAgain);
    
    // Window Resize
    window.addEventListener('resize', handleResize);
}

// ============================================
// PARTICLE SYSTEM
// ============================================

/**
 * Particle class for background animation
 */
class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.glowIntensity = Math.random();
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Wrap around screen
        if (this.x < 0) this.x = this.canvas.width;
        if (this.x > this.canvas.width) this.x = 0;
        if (this.y < 0) this.y = this.canvas.height;
        if (this.y > this.canvas.height) this.y = 0;
        
        // Subtle opacity fluctuation
        this.opacity += (Math.random() - 0.5) * 0.02;
        this.opacity = Math.max(0.1, Math.min(0.6, this.opacity));
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size * 3
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.glowIntensity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

/**
 * Initialize particle system
 */
function initializeParticles() {
    const canvas = elements.particleCanvas;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const particleCount = Math.min(100, Math.floor(window.innerWidth / 15));
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(canvas));
    }
    
    // Animation loop
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw(ctx);
        });
        
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
    state.particleSystem = { particles, ctx };
}

// ============================================
// CAMERA HANDLING
// ============================================

/**
 * Handle open camera button click
 */
async function handleOpenCamera(event) {
    event.preventDefault();
    
    try {
        // Hide glass card
        elements.glassCard.classList.add('hidden');
        
        // Show camera interface
        elements.cameraInterface.classList.add('active');
        
        // Start loading sequence
        await runLoadingSequence();
        
        // Initialize camera
        await initializeCamera();
        
        // Initialize MediaPipe Hands
        await initializeHandTracking();
        
        // Show camera container
        elements.loadingHud.classList.add('hidden');
        elements.cameraContainer.classList.add('visible');
        
        // Start tracking loop
        startTrackingLoop();
        
        state.isCameraActive = true;
        
    } catch (error) {
        console.error('Camera initialization failed:', error);
        showErrorPanel();
    }
}

/**
 * Handle close camera button click
 */
function handleCloseCamera() {
    stopCamera();
    
    // Hide camera interface
    elements.cameraInterface.classList.remove('active');
    elements.cameraContainer.classList.remove('visible');
    
    // Reset loading HUD
    resetLoadingHud();
    elements.loadingHud.classList.remove('hidden');
    
    // Show glass card
    elements.glassCard.classList.remove('hidden');
    
    state.isCameraActive = false;
}

/**
 * Handle try again button click
 */
function handleTryAgain() {
    elements.errorPanel.classList.remove('visible');
    elements.glassCard.classList.remove('hidden');
    elements.cameraInterface.classList.remove('active');
}

/**
 * Run loading sequence animation
 */
async function runLoadingSequence() {
    const lines = elements.loadingLines;
    
    for (let i = 0; i < lines.length; i++) {
        await delay(CONFIG.animation.loadingStepDelay);
        lines[i].classList.add('visible');
        
        if (i < lines.length - 1) {
            await delay(200);
            lines[i].classList.add('complete');
        }
    }
    
    await delay(CONFIG.animation.loadingStepDelay);
}

/**
 * Reset loading HUD to initial state
 */
function resetLoadingHud() {
    elements.loadingLines.forEach(line => {
        line.classList.remove('visible', 'complete');
    });
}

/**
 * Initialize camera stream
 */
async function initializeCamera() {
    const constraints = {
        video: {
            width: { ideal: CONFIG.camera.width },
            height: { ideal: CONFIG.camera.height },
            facingMode: CONFIG.camera.facingMode
        },
        audio: false
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    elements.videoElement.srcObject = stream;
    
    return new Promise((resolve) => {
        elements.videoElement.onloadedmetadata = () => {
            elements.videoElement.play();
            setupCanvases();
            resolve();
        };
    });
}

/**
 * Setup canvas dimensions
 */
function setupCanvases() {
    const video = elements.videoElement;
    const trackingCanvas = elements.trackingCanvas;
    const blurCanvas = elements.blurCanvas;
    
    trackingCanvas.width = video.videoWidth;
    trackingCanvas.height = video.videoHeight;
    blurCanvas.width = video.videoWidth;
    blurCanvas.height = video.videoHeight;
}

/**
 * Stop camera and cleanup
 */
function stopCamera() {
    // Stop video stream
    if (elements.videoElement.srcObject) {
        elements.videoElement.srcObject.getTracks().forEach(track => track.stop());
        elements.videoElement.srcObject = null;
    }
    
    // Cancel animation frame
    if (state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
        state.animationFrame = null;
    }
    
    // Clear canvases
    const trackingCtx = elements.trackingCanvas.getContext('2d');
    const blurCtx = elements.blurCanvas.getContext('2d');
    trackingCtx.clearRect(0, 0, elements.trackingCanvas.width, elements.trackingCanvas.height);
    blurCtx.clearRect(0, 0, elements.blurCanvas.width, elements.blurCanvas.height);
    
    // Reset state
    state.landmarks = [];
    state.fingertipTrails.clear();
    state.currentGesture = GESTURES.NONE;
    state.isBlurActive = false;
    
    // Reset HUD
    updateHUD({
        tracking: 'SCANNING',
        fingers: 0,
        gesture: GESTURES.NONE,
        blur: false
    });
}

// ============================================
// HAND TRACKING (MEDIAPIPE)
// ============================================

/**
 * Initialize MediaPipe Hands
 */
async function initializeHandTracking() {
    return new Promise((resolve, reject) => {
        try {
            state.hands = new Hands({
                locateFile: (file) => {
                    return `[cdn.jsdelivr.net](https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file})`;
                }
            });
            
            state.hands.setOptions({
                maxNumHands: CONFIG.mediapipe.maxNumHands,
                modelComplexity: CONFIG.mediapipe.modelComplexity,
                minDetectionConfidence: CONFIG.mediapipe.minDetectionConfidence,
                minTrackingConfidence: CONFIG.mediapipe.minTrackingConfidence
            });
            
            state.hands.onResults(handleHandResults);
            
            // Initialize with a test frame
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 10;
            testCanvas.height = 10;
            
            state.hands.send({ image: testCanvas }).then(() => {
                console.log('✋ MediaPipe Hands initialized');
                resolve();
            });
            
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Handle hand detection results
 */
function handleHandResults(results) {
    state.landmarks = results.multiHandLandmarks || [];
    
    // Update tracking status
    const isTracking = state.landmarks.length > 0;
    const fingerCount = isTracking ? countExtendedFingers(state.landmarks[0]) : 0;
    const gesture = isTracking ? detectGesture(state.landmarks[0]) : GESTURES.NONE;
    
    // Handle blur effect based on gesture
    handleBlurEffect(gesture);
    
    // Update HUD
    updateHUD({
        tracking: isTracking ? 'ACTIVE' : 'SCANNING',
        fingers: fingerCount,
        gesture: gesture,
        blur: state.isBlurActive
    });
    
    state.currentGesture = gesture;
}

/**
 * Start the main tracking loop
 */
function startTrackingLoop() {
    let lastFpsUpdate = performance.now();
    let frameCount = 0;
    
    async function loop() {
        if (!state.isCameraActive) return;
        
        const now = performance.now();
        
        // Send frame to MediaPipe
        if (state.hands && elements.videoElement.readyState >= 2) {
            await state.hands.send({ image: elements.videoElement });
        }
        
        // Draw tracking visualization
        drawTrackingVisualization();
        
        // Update blur canvas if active
        if (state.isBlurActive) {
            updateBlurCanvas();
        }
        
        // Calculate FPS
        frameCount++;
        if (now - lastFpsUpdate >= CONFIG.animation.fpsUpdateInterval) {
            state.fps = Math.round(frameCount / ((now - lastFpsUpdate) / 1000));
            elements.fpsValue.textContent = state.fps;
            frameCount = 0;
            lastFpsUpdate = now;
        }
        
        state.animationFrame = requestAnimationFrame(loop);
    }
    
    loop();
}

// ============================================
// TRACKING VISUALIZATION
// ============================================

/**
 * Draw hand tracking visualization on canvas
 */
function drawTrackingVisualization() {
    const canvas = elements.trackingCanvas;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Mirror the canvas to match video
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    // Draw each detected hand
    state.landmarks.forEach((landmarks, handIndex) => {
        // Draw connections (skeleton)
        drawConnections(ctx, landmarks, canvas);
        
        // Draw joints
        drawJoints(ctx, landmarks, canvas);
        
        // Draw fingertip effects
        drawFingertipEffects(ctx, landmarks, canvas, handIndex);
    });
    
    ctx.restore();
    
    // Draw trails (not mirrored for smooth effect)
    drawTrails(ctx, canvas);
}

/**
 * Draw skeleton connections between landmarks
 */
function drawConnections(ctx, landmarks, canvas) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = CONFIG.visual.connectionWidth;
    ctx.lineCap = 'round';
    
    HAND_CONNECTIONS.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        
        const x1 = startPoint.x * canvas.width;
        const y1 = startPoint.y * canvas.height;
        const x2 = endPoint.x * canvas.width;
        const y2 = endPoint.y * canvas.height;
        
        // Draw connection line with gradient
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
        
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
}

/**
 * Draw joint points
 */
function drawJoints(ctx, landmarks, canvas) {
    landmarks.forEach((landmark, index) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        // Glow effect
        const glowGradient = ctx.createRadialGradient(
            x, y, 0,
            x, y, CONFIG.visual.jointGlowRadius
        );
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, CONFIG.visual.jointGlowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Core point
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, CONFIG.visual.jointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Fingertips get extra glow
        if (FINGERTIP_INDICES.includes(index)) {
            const extraGlow = ctx.createRadialGradient(
                x, y, 0,
                x, y, CONFIG.visual.jointGlowRadius * 1.5
            );
            extraGlow.addColorStop(0, 'rgba(0, 255, 255, 0.5)');
            extraGlow.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            ctx.fillStyle = extraGlow;
            ctx.beginPath();
            ctx.arc(x, y, CONFIG.visual.jointGlowRadius * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

/**
 * Draw fingertip effects and update trails
 */
function drawFingertipEffects(ctx, landmarks, canvas, handIndex) {
    FINGERTIP_INDICES.forEach((tipIndex, fingerIndex) => {
        const tip = landmarks[tipIndex];
        const x = tip.x * canvas.width;
        const y = tip.y * canvas.height;
        
        // Unique key for this fingertip
        const key = `${handIndex}-${fingerIndex}`;
        
        // Get or create trail for this fingertip
        if (!state.fingertipTrails.has(key)) {
            state.fingertipTrails.set(key, []);
        }
        
        const trail = state.fingertipTrails.get(key);
        
        // Add current position to trail (mirrored x for display)
        trail.unshift({
            x: canvas.width - x, // Mirror for display
            y: y,
            opacity: 1
        });
        
        // Limit trail length
        if (trail.length > CONFIG.visual.trailLength) {
            trail.pop();
        }
        
        // Draw glow circle at fingertip
        const glowSize = 20;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.6)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        ctx.fill();
    });
}

/**
 * Draw finger trails
 */
function drawTrails(ctx, canvas) {
    state.fingertipTrails.forEach((trail, key) => {
        if (trail.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        
        for (let i = 1; i < trail.length; i++) {
            const point = trail[i];
            const prevPoint = trail[i - 1];
            
            // Fade opacity based on position in trail
            const opacity = 1 - (i / trail.length);
            point.opacity = Math.max(0, point.opacity - CONFIG.visual.trailFadeRate);
            
            ctx.lineTo(point.x, point.y);
        }
        
        // Create gradient for trail
        const gradient = ctx.createLinearGradient(
            trail[0].x, trail[0].y,
            trail[trail.length - 1].x, trail[trail.length - 1].y
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    });
    
    // Clean up inactive trails
    state.fingertipTrails.forEach((trail, key) => {
        // Fade out trails for hands no longer detected
        if (!state.landmarks.length) {
            trail.forEach(point => {
                point.opacity -= CONFIG.visual.trailFadeRate * 2;
            });
            // Remove completely faded trails
            if (trail.every(point => point.opacity <= 0)) {
                state.fingertipTrails.delete(key);
            }
        }
    });
}

// ============================================
// GESTURE DETECTION
// ============================================

/**
 * Detect gesture from hand landmarks
 */
function detectGesture(landmarks) {
    if (!landmarks || landmarks.length < 21) return GESTURES.NONE;
    
    const fingers = getFingerStates(landmarks);
    const [thumb, index, middle, ring, pinky] = fingers;
    
    // ✌️ Peace Sign - Index and middle extended, others closed
    if (index && middle && !ring && !pinky) {
        return GESTURES.PEACE;
    }
    
    // 👍 Thumbs Up - Only thumb extended
    if (thumb && !index && !middle && !ring && !pinky) {
        return GESTURES.THUMBS_UP;
    }
    
    // ✋ Open Hand - All fingers extended
    if (thumb && index && middle && ring && pinky) {
        return GESTURES.OPEN_HAND;
    }
    
    // 👊 Fist - All fingers closed
    if (!thumb && !index && !middle && !ring && !pinky) {
        return GESTURES.FIST;
    }
    
    // ☝️ Pointing - Only index extended
    if (!thumb && index && !middle && !ring && !pinky) {
        return GESTURES.POINTING;
    }
    
    return GESTURES.NONE;
}

/**
 * Get the extended/closed state of each finger
 */
function getFingerStates(landmarks) {
    // Finger tip and pip indices
    const fingerTips = [4, 8, 12, 16, 20];
    const fingerPips = [3, 6, 10, 14, 18];
    const fingerMcps = [2, 5, 9, 13, 17];
    
    const states = [];
    
    // Thumb (special case - check x position relative to palm)
    const thumbTip = landmarks[4];
    const thumbMcp = landmarks[2];
    const wrist = landmarks[0];
    
    // Determine hand orientation
    const isRightHand = landmarks[17].x < landmarks[5].x;
    const thumbExtended = isRightHand 
        ? thumbTip.x < thumbMcp.x 
        : thumbTip.x > thumbMcp.x;
    states.push(thumbExtended);
    
    // Other fingers (check y position - lower y means extended)
    for (let i = 1; i < 5; i++) {
        const tip = landmarks[fingerTips[i]];
        const pip = landmarks[fingerPips[i]];
        const mcp = landmarks[fingerMcps[i]];
        
        // Finger is extended if tip is above pip
        const extended = tip.y < pip.y;
        states.push(extended);
    }
    
    return states;
}

/**
 * Count extended fingers
 */
function countExtendedFingers(landmarks) {
    if (!landmarks) return 0;
    const states = getFingerStates(landmarks);
    return states.filter(Boolean).length;
}

// ============================================
// BLUR EFFECT
// ============================================

/**
 * Handle blur effect based on gesture
 */
function handleBlurEffect(gesture) {
    const shouldBlur = gesture === GESTURES.PEACE;
    
    if (shouldBlur && !state.isBlurActive) {
        activateBlur();
    } else if (!shouldBlur && state.isBlurActive) {
        deactivateBlur();
    }
}

/**
 * Activate camera blur effect
 */
function activateBlur() {
    state.isBlurActive = true;
    elements.blurCanvas.classList.add('active');
    elements.cameraStatus.textContent = 'CAMERA BLURRED';
    elements.cameraStatus.classList.add('blurred');
}

/**
 * Deactivate camera blur effect
 */
function deactivateBlur() {
    state.isBlurActive = false;
    elements.blurCanvas.classList.remove('active');
    elements.cameraStatus.textContent = 'CAMERA READY';
    elements.cameraStatus.classList.remove('blurred');
}

/**
 * Update blur canvas with blurred video frame
 */
function updateBlurCanvas() {
    const video = elements.videoElement;
    const canvas = elements.blurCanvas;
    const ctx = canvas.getContext('2d');
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply blur using StackBlur algorithm (simplified version)
    applyGaussianBlur(ctx, canvas.width, canvas.height, CONFIG.blur.radius);
    
    // Apply cinematic effects
    applyCinematicEffects(ctx, canvas.width, canvas.height);
}

/**
 * Apply Gaussian blur to canvas
 */
function applyGaussianBlur(ctx, width, height, radius) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    // Simplified box blur (faster than true Gaussian)
    const iterations = 3;
    
    for (let iter = 0; iter < iterations; iter++) {
        // Horizontal pass
        horizontalBlur(pixels, width, height, radius);
        // Vertical pass
        verticalBlur(pixels, width, height, radius);
    }
    
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Horizontal blur pass
 */
function horizontalBlur(pixels, width, height, radius) {
    const div = radius + radius + 1;
    
    for (let y = 0; y < height; y++) {
        let rSum = 0, gSum = 0, bSum = 0;
        
        // Initial sum
        for (let i = -radius; i <= radius; i++) {
            const x = Math.min(width - 1, Math.max(0, i));
            const idx = (y * width + x) * 4;
            rSum += pixels[idx];
            gSum += pixels[idx + 1];
            bSum += pixels[idx + 2];
        }
        
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            pixels[idx] = rSum / div;
            pixels[idx + 1] = gSum / div;
            pixels[idx + 2] = bSum / div;
            
            // Slide window
            const nextX = Math.min(width - 1, x + radius + 1);
            const prevX = Math.max(0, x - radius);
            const nextIdx = (y * width + nextX) * 4;
            const prevIdx = (y * width + prevX) * 4;
            
            rSum += pixels[nextIdx] - pixels[prevIdx];
            gSum += pixels[nextIdx + 1] - pixels[prevIdx + 1];
            bSum += pixels[nextIdx + 2] - pixels[prevIdx + 2];
        }
    }
}

/**
 * Vertical blur pass
 */
function verticalBlur(pixels, width, height, radius) {
    const div = radius + radius + 1;
    
    for (let x = 0; x < width; x++) {
        let rSum = 0, gSum = 0, bSum = 0;
        
        // Initial sum
        for (let i = -radius; i <= radius; i++) {
            const y = Math.min(height - 1, Math.max(0, i));
            const idx = (y * width + x) * 4;
            rSum += pixels[idx];
            gSum += pixels[idx + 1];
            bSum += pixels[idx + 2];
        }
        
        for (let y = 0; y < height; y++) {
            const idx = (y * width + x) * 4;
            pixels[idx] = rSum / div;
            pixels[idx + 1] = gSum / div;
            pixels[idx + 2] = bSum / div;
            
            // Slide window
            const nextY = Math.min(height - 1, y + radius + 1);
            const prevY = Math.max(0, y - radius);
            const nextIdx = (nextY * width + x) * 4;
            const prevIdx = (prevY * width + x) * 4;
            
            rSum += pixels[nextIdx] - pixels[prevIdx];
            gSum += pixels[nextIdx + 1] - pixels[prevIdx + 1];
            bSum += pixels[nextIdx + 2] - pixels[prevIdx + 2];
        }
    }
}

/**
 * Apply cinematic effects to canvas
 */
function applyCinematicEffects(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    // Apply brightness and contrast adjustments
    const brightness = CONFIG.blur.brightness;
    const contrast = CONFIG.blur.contrast;
    
    for (let i = 0; i < pixels.length; i += 4) {
        // Apply brightness
        pixels[i] *= brightness;
        pixels[i + 1] *= brightness;
        pixels[i + 2] *= brightness;
        
        // Apply contrast
        pixels[i] = ((pixels[i] / 255 - 0.5) * contrast + 0.5) * 255;
        pixels[i + 1] = ((pixels[i + 1] / 255 - 0.5) * contrast + 0.5) * 255;
        pixels[i + 2] = ((pixels[i + 2] / 255 - 0.5) * contrast + 0.5) * 255;
        
        // Clamp values
        pixels[i] = Math.max(0, Math.min(255, pixels[i]));
        pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1]));
        pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2]));
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Add vignette
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, height / 3,
        width / 2, height / 2, height
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

// ============================================
// HUD UPDATES
// ============================================

/**
 * Update HUD display values
 */
function updateHUD({ tracking, fingers, gesture, blur }) {
    // Update tracking status
    if (elements.trackingStatus) {
        elements.trackingStatus.textContent = tracking;
        elements.trackingStatus.classList.toggle('active', tracking === 'ACTIVE');
    }
    
    // Update finger count
    if (elements.fingerCount) {
        elements.fingerCount.textContent = fingers;
    }
    
    // Update gesture display
    if (elements.gestureValue) {
        elements.gestureValue.textContent = gesture;
        elements.gestureValue.classList.toggle('detected', gesture !== GESTURES.NONE);
    }
    
    // Update blur status
    if (elements.blurStatus) {
        elements.blurStatus.textContent = blur ? 'ON' : 'OFF';
        elements.blurStatus.classList.toggle('active', blur);
    }
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Show error panel
 */
function showErrorPanel() {
    elements.cameraInterface.classList.remove('active');
    elements.glassCard.classList.add('hidden');
    elements.errorPanel.classList.add('visible');
}

// ============================================
// UI EFFECTS
// ============================================

/**
 * Create ripple effect on button click
 */
function createRippleEffect(event) {
    const button = event.currentTarget;
    const ripple = button.querySelector('.btn-ripple');
    
    // Reset animation
    ripple.classList.remove('animate');
    void ripple.offsetWidth; // Trigger reflow
    ripple.classList.add('animate');
}

/**
 * Handle window resize
 */
function handleResize() {
    if (state.isCameraActive) {
        setupCanvases();
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Delay utility function
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clamp value between min and max
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

/**
 * Map value from one range to another
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

// ============================================
// PERFORMANCE MONITORING
// ============================================

/**
 * Log performance metrics (debug)
 */
function logPerformance() {
    if (!state.isCameraActive) return;
    
    console.log({
        fps: state.fps,
        handsDetected: state.landmarks.length,
        currentGesture: state.currentGesture,
        blurActive: state.isBlurActive,
        trailsActive: state.fingertipTrails.size
    });
}

// Export for debugging (optional)
if (typeof window !== 'undefined') {
    window.CyberCam = {
        state,
        elements,
        config: CONFIG,
        logPerformance
    };
}
