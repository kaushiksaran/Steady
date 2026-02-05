/**
 * AccessClick Gesture Logic
 * Handles MediaPipe Face Mesh initialization and gesture detection (Nod/Shake).
 * Includes FALLBACK Optical Flow for CSP-restricted sites.
 */

export class HeadGesture {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.faceMesh = null;
        this.camera = null;
        this.isLoaded = false;
        this.stopped = false;
        this.callbacks = {
            onGesture: () => { }
        };

        // State for gesture detection
        this.pitchHistory = [];
        this.yawHistory = [];
        this.historySize = 20; // Frames to keep
        this.lastGestureTime = 0;
        this.cooldown = 1500; // ms
    }

    setCallback(callback) {
        this.callbacks.onGesture = callback;
    }

    async initialize() {
        console.log("Initializing HeadGesture...");
        this.stopped = false;

        try {
            // Method A: MediaPipe (Preferred)
            if (typeof FaceMesh !== 'undefined') {
                await this.initMediaPipe();
                console.log("MediaPipe Initialized Successfully");
                this.isLoaded = true;
                return true;
            } else {
                console.warn("MediaPipe Global Not Found.");
                throw new Error("MediaPipe not loaded");
            }
        } catch (e) {
            console.warn("MediaPipe initialization failed (" + e.message + "). Switching to OPTICAL FLOW Fallback.");
            // Method B: Fallback (Basic Motion)
            this.initFallbackMotion();
            this.isLoaded = true;
            return true;
        }
    }

    async initMediaPipe() {
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });
        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        this.faceMesh.onResults(this.onResults.bind(this));

        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                if (this.stopped) return;
                await this.faceMesh.send({ image: this.videoElement });
            },
            width: 640,
            height: 480
        });
        this.camera.start();
    }

    initFallbackMotion() {
        // Simple Optical Flow / Motion Detection
        console.log("Starting Fallback Motion Tracker");
        const canvas = document.createElement('canvas');
        canvas.width = 100; // Low res for performance
        canvas.height = 75;
        const ctx = canvas.getContext('2d');

        let prevFrame = null;
        let motionHistX = []; // Not used yet
        let motionHistY = []; // Not used yet

        const processFrame = () => {
            if (this.stopped || this.videoElement.paused || this.videoElement.ended) return;

            try {
                ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
                const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = frame.data;

                if (prevFrame) {
                    let sumX = 0, sumY = 0, count = 0;

                    // Sampling pixels for efficiency
                    for (let i = 0; i < data.length; i += 16) {
                        // Simple difference check
                        const diff = Math.abs(data[i] - prevFrame[i]) +
                            Math.abs(data[i + 1] - prevFrame[i + 1]) +
                            Math.abs(data[i + 2] - prevFrame[i + 2]);

                        if (diff > 50) { // Threshold for "change"
                            const idx = i / 4;
                            const x = idx % canvas.width;
                            const y = Math.floor(idx / canvas.width);

                            sumX += x;
                            sumY += y;
                            count++;
                        }
                    }

                    if (count > 20) { // Significant motion
                        const avgX = sumX / count;
                        const avgY = sumY / count;

                        // Track Center of Mass (COM)
                        // Normalize to 0..1
                        this.detectGesturesFallback({
                            x: avgX / canvas.width,
                            y: avgY / canvas.height
                        });
                    }
                }
                prevFrame = data;
            } catch (e) {
                console.error("Frame processing error", e);
            }

            requestAnimationFrame(processFrame);
        };

        // Request Camera Access (CRITICAL FIX)
        navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
            .then(stream => {
                this.videoElement.srcObject = stream;
                this.cameraStream = stream; // Store for cleanup
                return this.videoElement.play();
            })
            .then(() => { processFrame(); })
            .catch(e => {
                console.error("Camera Access Error or Play Error", e);
                alert("Camera Access Required for Gestures. Please allow access.");
            });
    }

    detectGesturesFallback(com) {
        // Logic similar to detectGestures but using COM movement
        // If COM moves UP significantly -> NOD
        // If COM moves LEFT/RIGHT significantly -> SHAKE
        // COM is inverted mirrored?
        // Let's reuse the same logic
        this.detectGestures(com);
    }

    detectGestures(nose) {
        const now = Date.now();
        if (now - this.lastGestureTime < this.cooldown) return;

        this.pitchHistory.push(nose.y);
        this.yawHistory.push(nose.x);

        if (this.pitchHistory.length > this.historySize) this.pitchHistory.shift();
        if (this.yawHistory.length > this.historySize) this.yawHistory.shift();

        if (this.pitchHistory.length < this.historySize) return;

        const pitchMin = Math.min(...this.pitchHistory);
        const pitchMax = Math.max(...this.pitchHistory);
        const yawMin = Math.min(...this.yawHistory);
        const yawMax = Math.max(...this.yawHistory);

        const pitchRange = pitchMax - pitchMin;
        const yawRange = yawMax - yawMin;

        // Thresholds (re-tuned)
        const NOD_THRESHOLD = 0.08;
        const SHAKE_THRESHOLD = 0.08;

        // Check for dominant movement
        // NOTE: Fallback motion might be inverted or scaled differently, 
        // but relative "Range" check should still hold true for large movements.
        if (pitchRange > NOD_THRESHOLD && pitchRange > yawRange * 1.5) {
            console.log("Detected NOD (Click)");
            this.callbacks.onGesture('CLICK');
            this.resetHistory(now);
        } else if (yawRange > SHAKE_THRESHOLD && yawRange > pitchRange * 1.5) {
            console.log("Detected SHAKE (Cancel)");
            this.callbacks.onGesture('CANCEL');
            this.resetHistory(now);
        }
    }

    resetHistory(now) {
        this.lastGestureTime = now;
        this.pitchHistory = [];
        this.yawHistory = [];
    }

    onResults(results) {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
        const landmarks = results.multiFaceLandmarks[0];
        const nose = landmarks[1];
        this.detectGestures(nose);
    }

    stop() {
        this.stopped = true;
        if (this.camera) {
            // Try stop if method exists
            try { this.camera.stop(); } catch (e) { }
        }
    }
}
