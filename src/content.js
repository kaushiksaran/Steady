(() => {
    if (window.__stabilityAssistLoaded) return;
    window.__stabilityAssistLoaded = true;

    const S = {
        mode: 1, // 1 = head gesture, 2 = dwell to click
        assistOn: false,
        sens: 150,
        dwellMs: 900,
        magnetRadius: 140,
        pts: [],
        WINDOW_MS: 900,
        target: null,
        dwellStart: null,
        dwellArmed: false,
        toastVisible: false,
        ringEl: null,
        confirmEl: null,
        styleEl: null,
        sideMenuEl: null,
        leftEdgeTimeout: null,
        sideMenuVisible: false,
        // Mode 1 specific
        gestureActive: false,
        cameraStream: null,
        mode1Timeout: null // 3s auto-dismiss timer
    };

    const css = `
  #sa_ring{
    position: fixed; left: 0; top: 0; width: 44px; height: 44px;
    border-radius: 999px; pointer-events:none; z-index: 2147483646;
    transform: translate(-9999px,-9999px);
    background: conic-gradient(#60a5fa 0deg, rgba(96,165,250,0.05) 0deg);
    box-shadow: 0 0 0 6px rgba(96,165,250,0.35); opacity: 0;
    transition: opacity 0.08s ease;
  }
  #sa_ring.show{ opacity: 1; }

  .sa_target {
    outline: 4px solid #60a5fa !important;
    box-shadow: 0 0 30px rgba(96,165,250,0.6) !important;
    transform-origin: center !important;
    transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    z-index: 2147483640 !important;
    position: relative !important;
  }

  #sa_confirm {
    position: fixed; z-index: 2147483647;
    background: rgba(15,23,42,0.95); border: 1px solid rgba(96,165,250,0.5);
    border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.4);
    padding: 14px 18px; backdrop-filter: blur(8px);
    font-family: system-ui, sans-serif; color: #e5e7eb; font-size: 16px;
    display: none; text-align: center; min-width: 220px;
  }
  #sa_confirm.show { display: block; }
  #sa_confirm .msg { margin-bottom: 10px; color: #fff; font-weight: 600; font-size: 17px; }
  #sa_confirm .hint { font-size: 14px; color: #9ca3af; }

  #sa_debug {
    position: fixed; bottom: 10px; right: 10px; z-index: 2147483647;
    background: rgba(0,0,0,0.85); color: #0f0; font-family: monospace; font-size: 11px;
    padding: 8px 12px; border-radius: 8px; min-width: 180px;
    border: 1px solid #0f0;
  }
  #sa_debug .title { color: #fff; font-weight: bold; margin-bottom: 4px; }
  #sa_debug .row { display: flex; justify-content: space-between; }
  #sa_debug .val { color: #0ff; }

  #sa_sidemenu {
    position: fixed; left: -260px; top: 50%; transform: translateY(-50%);
    z-index: 2147483647; width: 240px;
    background: rgba(15,23,42,0.95); border: 1px solid rgba(96,165,250,0.5);
    border-radius: 0 16px 16px 0; box-shadow: 4px 0 25px rgba(0,0,0,0.4);
    padding: 20px; backdrop-filter: blur(10px);
    font-family: system-ui, sans-serif; color: #e5e7eb;
    transition: left 0.3s ease;
  }
  #sa_sidemenu.show { left: 0; }
  #sa_sidemenu .title { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 16px; }
  #sa_sidemenu .mode-btn {
    display: block; width: 100%; padding: 12px 16px; margin-bottom: 10px;
    border: 2px solid rgba(96,165,250,0.4); border-radius: 10px;
    background: transparent; color: #e5e7eb; font-size: 14px;
    cursor: pointer; text-align: left; transition: all 0.2s;
  }
  #sa_sidemenu .mode-btn:hover { background: rgba(96,165,250,0.2); }
  #sa_sidemenu .mode-btn.active { background: #60a5fa; color: #071225; border-color: #60a5fa; }
  #sa_sidemenu .mode-label { font-weight: 600; }
  #sa_sidemenu .mode-desc { font-size: 12px; opacity: 0.7; margin-top: 4px; }
  `;

    const now = () => performance.now();

    function injectCSS() {
        S.styleEl = document.createElement("style");
        S.styleEl.textContent = css;
        document.documentElement.appendChild(S.styleEl);
    }

    function makeRing() {
        S.ringEl = document.createElement("div");
        S.ringEl.id = "sa_ring";
        document.body.appendChild(S.ringEl);
    }

    function makeConfirmPopup() {
        S.confirmEl = document.createElement("div");
        S.confirmEl.id = "sa_confirm";
        S.confirmEl.innerHTML = '<div class="msg">Are you trying to click this?</div><div class="hint" id="sa_confirm_hint"></div>';
        document.body.appendChild(S.confirmEl);
        updateConfirmHint();
    }

    function updateConfirmHint() {
        const hintEl = document.getElementById('sa_confirm_hint');
        if (!hintEl) return;
        if (S.mode === 1) {
            hintEl.innerHTML = 'Turn Right = YES (auto-dismisses in 3s)';
        } else {
            hintEl.innerHTML = 'Hold cursor on target to click';
        }
    }

    // --- Side Menu (Left Edge) ---
    function makeSideMenu() {
        S.sideMenuEl = document.createElement("div");
        S.sideMenuEl.id = "sa_sidemenu";
        S.sideMenuEl.innerHTML = `
            <div class="title">Stability Assist</div>
            <button class="mode-btn" data-mode="1">
                <div class="mode-label">Mode 1: Head Gesture</div>
                <div class="mode-desc">Turn right to click</div>
            </button>
            <button class="mode-btn" data-mode="2">
                <div class="mode-label">Mode 2: Dwell Click</div>
                <div class="mode-desc">Hold cursor to click</div>
            </button>
        `;
        document.body.appendChild(S.sideMenuEl);

        // Add click handlers for mode buttons
        S.sideMenuEl.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newMode = parseInt(btn.dataset.mode);
                if (newMode !== S.mode) {
                    S.mode = newMode;
                    updateSideMenuActive();
                    updateConfirmHint();
                    updateDebug({ mode: S.mode, status: `Switched to Mode ${S.mode}` });

                    // Notify background script
                    try {
                        chrome.runtime.sendMessage({ type: 'SET_MODE', mode: S.mode });
                    } catch (e) { }

                    // Init camera for Mode 1
                    if (S.mode === 1 && !S.cameraStream) {
                        initCamera();
                    }
                }
                hideSideMenu();
            });
        });

        updateSideMenuActive();
    }

    function updateSideMenuActive() {
        if (!S.sideMenuEl) return;
        S.sideMenuEl.querySelectorAll('.mode-btn').forEach(btn => {
            const btnMode = parseInt(btn.dataset.mode);
            btn.classList.toggle('active', btnMode === S.mode);
        });
    }

    function showSideMenu() {
        if (S.sideMenuVisible) return;
        S.sideMenuVisible = true;
        S.sideMenuEl.classList.add("show");
    }

    function hideSideMenu() {
        S.sideMenuVisible = false;
        S.sideMenuEl.classList.remove("show");
    }

    function handleLeftEdge(x) {
        // Show menu when cursor reaches left edge (x <= 5)
        if (x <= 5) {
            if (!S.leftEdgeTimeout) {
                S.leftEdgeTimeout = setTimeout(() => {
                    showSideMenu();
                }, 300); // 300ms dwell at edge
            }
        } else {
            // Clear timeout if moved away from edge
            if (S.leftEdgeTimeout) {
                clearTimeout(S.leftEdgeTimeout);
                S.leftEdgeTimeout = null;
            }
            // Hide menu if cursor moved far enough right
            if (S.sideMenuVisible && x > 280) {
                hideSideMenu();
            }
        }
    }

    function showConfirmAboveTarget(el) {
        if (!el || !S.confirmEl) return;
        const rect = el.getBoundingClientRect();
        const popupWidth = 220;
        let left = rect.left + rect.width / 2 - popupWidth / 2;
        let top = rect.top - 70;
        if (left < 10) left = 10;
        if (top < 10) top = rect.bottom + 10;
        S.confirmEl.style.left = left + "px";
        S.confirmEl.style.top = top + "px";
        S.confirmEl.classList.add("show");
    }

    function hideConfirm() {
        if (S.confirmEl) S.confirmEl.classList.remove("show");
    }

    // --- Debug Panel ---
    let debugEl = null;
    function makeDebugPanel() {
        debugEl = document.createElement("div");
        debugEl.id = "sa_debug";
        debugEl.innerHTML = `
            <div class="title">Stability Assist</div>
            <div class="row"><span>Mode:</span><span class="val" id="dbg_mode">1</span></div>
            <div class="row"><span>Status:</span><span class="val" id="dbg_status">Ready</span></div>
            <div class="row"><span>Motion Px:</span><span class="val" id="dbg_count">0</span></div>
            <div class="row"><span>Pitch:</span><span class="val" id="dbg_pitch">0</span></div>
            <div class="row"><span>Yaw:</span><span class="val" id="dbg_yaw">0</span></div>
            <div class="row"><span>Jitter:</span><span class="val" id="dbg_jitter">0</span></div>
            <div class="row"><span>Target:</span><span class="val" id="dbg_target">None</span></div>
        `;
        document.body.appendChild(debugEl);
    }

    function updateDebug(data) {
        if (data.mode !== undefined) { const e = document.getElementById("dbg_mode"); if (e) e.textContent = data.mode; }
        if (data.status !== undefined) { const e = document.getElementById("dbg_status"); if (e) e.textContent = data.status; }
        if (data.count !== undefined) { const e = document.getElementById("dbg_count"); if (e) e.textContent = data.count; }
        if (data.pitch !== undefined) { const e = document.getElementById("dbg_pitch"); if (e) e.textContent = typeof data.pitch === 'number' ? data.pitch.toFixed(4) : data.pitch; }
        if (data.yaw !== undefined) { const e = document.getElementById("dbg_yaw"); if (e) e.textContent = typeof data.yaw === 'number' ? data.yaw.toFixed(4) : data.yaw; }
        if (data.jitter !== undefined) { const e = document.getElementById("dbg_jitter"); if (e) e.textContent = data.jitter; }
        if (data.target !== undefined) { const e = document.getElementById("dbg_target"); if (e) e.textContent = data.target; }
    }

    // --- Jitter Detection ---
    function prunePoints() { const cutoff = now() - S.WINDOW_MS; S.pts = S.pts.filter(p => p.t >= cutoff); }
    function addPoint(x, y) { S.pts.push({ x, y, t: now() }); prunePoints(); }

    function tremorScore() {
        if (S.pts.length < 6) return 0;
        let path = 0, turns = 0, prevDx = null, prevDy = null;
        for (let i = 1; i < S.pts.length; i++) {
            const a = S.pts[i - 1], b = S.pts[i];
            const dx = b.x - a.x, dy = b.y - a.y;
            path += Math.hypot(dx, dy);
            if (prevDx !== null) {
                const dot = dx * prevDx + dy * prevDy;
                const mag = (Math.hypot(dx, dy) * Math.hypot(prevDx, prevDy)) || 1;
                const angle = Math.acos(Math.max(-1, Math.min(1, dot / mag)));
                if (angle > 1.2) turns++;
            }
            prevDx = dx; prevDy = dy;
        }
        return Math.round(((path / 120) + (turns * 1.8)) * 10);
    }

    function getCandidates() {
        return Array.from(document.querySelectorAll("button, a, input, [role='button']")).filter(el => el.offsetParent !== null);
    }

    function nearestClickable(x, y) {
        const candidates = getCandidates();
        let best = null, bestD = Infinity;
        for (const el of candidates) {
            const r = el.getBoundingClientRect();
            const d = Math.hypot((r.left + r.width / 2) - x, (r.top + r.height / 2) - y);
            if (d < bestD) { bestD = d; best = el; }
        }
        return { el: best, dist: bestD };
    }

    // --- Dynamic Scale Calculation ---
    function setTarget(el) {
        if (S.target === el) return;
        if (S.target) {
            S.target.classList.remove("sa_target");
            S.target.style.transform = "";
        }
        S.target = el;
        S.dwellStart = null;
        S.dwellArmed = false;

        if (S.target) {
            S.target.classList.add("sa_target");
            const r = S.target.getBoundingClientRect();
            const area = r.width * r.height;
            let scale = 1.35;
            if (area < 1200) scale = 2.4;
            else if (area < 4500) scale = 1.8;
            else if (area > 15000) scale = 1.15;
            S.target.style.transform = `scale(${scale})`;
        }
    }

    function hideRing() {
        S.ringEl.classList.remove("show");
        S.ringEl.style.transform = "translate(-9999px,-9999px)";
    }

    function moveRing(x, y, progress) {
        const size = 44;
        S.ringEl.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
        S.ringEl.classList.add("show");
        const deg = Math.max(0, Math.min(360, progress * 360));
        S.ringEl.style.background = `conic-gradient(#60a5fa ${deg}deg, rgba(96,165,250,0.05) 0deg)`;
    }

    function safeClick(el) {
        try { el.focus(); el.click(); } catch { }
    }

    // ========================================
    // MODE 2: DWELL TO CLICK (from user code)
    // ========================================
    function handleDwell(x, y) {
        if (S.mode !== 2) return;
        if (!S.assistOn) { hideRing(); return; }

        const { el, dist } = nearestClickable(x, y);
        if (!el || dist > S.magnetRadius) {
            setTarget(null);
            hideRing();
            return;
        }

        setTarget(el);
        if (!S.dwellStart) {
            S.dwellStart = now();
            S.dwellArmed = true;
        }

        const progress = (now() - S.dwellStart) / S.dwellMs;
        moveRing(x, y, progress);

        if (progress >= 1 && S.dwellArmed) {
            S.dwellArmed = false;
            safeClick(S.target);
            S.dwellStart = null;
            S.assistOn = false;
            setTarget(null);
            hideRing();
            hideConfirm();
        }
    }

    // Check for jitter to enable assist mode (Mode 2)
    function checkJitterForMode2() {
        if (S.mode !== 2) return;
        if (!S.assistOn && tremorScore() >= S.sens) {
            S.assistOn = true;
            updateDebug({ status: "Assist ON" });
        }
    }

    // ========================================
    // MODE 1: HEAD GESTURE DETECTION
    // ========================================
    class FallbackMotionDetector {
        constructor() {
            this.videoElement = document.createElement("video");
            this.videoElement.setAttribute("playsinline", "");
            this.videoElement.muted = true;
            this.pitchHistory = [];
            this.yawHistory = [];
            this.historySize = 6;
            this.lastGestureTime = 0;
            this.cooldown = 800;
        }

        runLoop() {
            const video = this.videoElement;
            const canvas = document.createElement("canvas");
            canvas.width = 64; canvas.height = 48;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            let prevFrame = null;

            const loop = () => {
                try {
                    if (video.readyState >= 2) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                        let sumX = 0, sumY = 0, count = 0;
                        if (prevFrame) {
                            for (let i = 0; i < data.length; i += 4) {
                                const diff = Math.abs(data[i] - prevFrame[i]) +
                                    Math.abs(data[i + 1] - prevFrame[i + 1]) +
                                    Math.abs(data[i + 2] - prevFrame[i + 2]);
                                if (diff > 70) {
                                    const idx = i / 4;
                                    sumX += (idx % canvas.width);
                                    sumY += Math.floor(idx / canvas.width);
                                    count++;
                                }
                            }
                        }
                        updateDebug({ count: count });
                        if (count > 4) {
                            this.detect({
                                x: (sumX / count) / canvas.width,
                                y: (sumY / count) / canvas.height
                            });
                        }
                        prevFrame = data;
                    }
                } catch (e) { }
                requestAnimationFrame(loop);
            };
            loop();
        }

        detect(pos) {
            const nowTime = Date.now();
            if (nowTime - this.lastGestureTime < this.cooldown) return;

            this.pitchHistory.push(pos.y);
            this.yawHistory.push(pos.x);

            if (this.pitchHistory.length > this.historySize) this.pitchHistory.shift();
            if (this.yawHistory.length > this.historySize) this.yawHistory.shift();

            const pitchRange = this.pitchHistory.length > 1 ?
                Math.max(...this.pitchHistory) - Math.min(...this.pitchHistory) : 0;
            const yawRange = this.yawHistory.length > 1 ?
                Math.max(...this.yawHistory) - Math.min(...this.yawHistory) : 0;

            updateDebug({ pitch: pitchRange, yaw: yawRange, target: S.target ? S.target.tagName : 'None' });

            if (this.yawHistory.length < this.historySize) return;

            const halfSize = Math.floor(this.historySize / 2);
            const firstHalf = this.yawHistory.slice(0, halfSize);
            const secondHalf = this.yawHistory.slice(halfSize);
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            const yawDelta = secondAvg - firstAvg;

            const TURN_THRESHOLD = 0.015;

            if (!S.assistOn || !S.target) return;

            if (yawDelta < -TURN_THRESHOLD && yawRange > 0.01) {
                updateDebug({ status: "Turn Right! Clicking..." });
                this.lastGestureTime = nowTime;
                this.pitchHistory = [];
                this.yawHistory = [];

                // Clear auto-dismiss timer
                if (S.mode1Timeout) {
                    clearTimeout(S.mode1Timeout);
                    S.mode1Timeout = null;
                }

                S.ringEl.style.boxShadow = "0 0 0 10px #00ff00";
                S.ringEl.style.background = "#00ff00";
                safeClick(S.target);

                setTimeout(() => {
                    S.assistOn = false;
                    setTarget(null);
                    hideRing();
                    hideConfirm();
                    updateDebug({ status: "Clicked!", pitch: 0, yaw: 0 });
                }, 300);
            }
            // Removed Turn Left detection - auto-dismiss handles cancellation
        }
    }

    let globalDetector = null;

    // Handle jitter for Mode 1 - triggers assist mode and starts gesture detection
    function handleJitterMode1(x, y) {
        if (S.mode !== 1) return;
        if (S.assistOn) return;

        const score = tremorScore();
        updateDebug({ jitter: score });

        if (score >= S.sens) {
            const { el, dist } = nearestClickable(x, y);
            if (el && dist < S.magnetRadius) {
                S.assistOn = true;
                setTarget(el);

                const rect = el.getBoundingClientRect();
                moveRing(rect.left + rect.width / 2, rect.top + rect.height / 2, 0);
                showConfirmAboveTarget(el);
                updateDebug({ status: "Jitter! Confirm?" });

                if (!S.gestureActive && S.cameraStream) {
                    S.gestureActive = true;
                    globalDetector = new FallbackMotionDetector();
                    globalDetector.videoElement.srcObject = S.cameraStream;
                    globalDetector.videoElement.play().then(() => {
                        globalDetector.runLoop();
                    });
                }

                // Start 3s auto-dismiss timer
                S.mode1Timeout = setTimeout(() => {
                    if (S.assistOn && S.mode === 1) {
                        updateDebug({ status: "Auto-dismissed" });
                        S.assistOn = false;
                        setTarget(null);
                        hideRing();
                        hideConfirm();
                    }
                }, 3000);
            }
        }
    }

    // --- Camera Init ---
    async function initCamera() {
        try {
            updateDebug({ status: "Requesting camera..." });
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
            S.cameraStream = stream;
            updateDebug({ status: "Camera ready!" });
            return true;
        } catch (e) {
            console.error("Camera permission denied:", e);
            updateDebug({ status: "Camera denied" });
            return false;
        }
    }

    async function start() {
        injectCSS();
        makeRing();
        makeConfirmPopup();
        makeDebugPanel();
        makeSideMenu();

        // Get initial mode from storage
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_MODE' });
            if (response && response.mode) {
                S.mode = response.mode;
                updateConfirmHint();
                updateSideMenuActive();
                updateDebug({ mode: S.mode, status: `Mode ${S.mode}` });
            }
        } catch (e) {
            console.log("Could not get mode, defaulting to 1");
        }

        // Listen for mode changes from popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'MODE_CHANGE') {
                S.mode = message.mode;
                S.assistOn = false;
                setTarget(null);
                hideRing();
                hideConfirm();
                updateConfirmHint();
                updateSideMenuActive();
                updateDebug({ mode: S.mode, status: `Switched to Mode ${S.mode}` });

                if (S.mode === 1 && !S.cameraStream) {
                    initCamera();
                }
            }
        });

        // Request camera permission only for Mode 1
        if (S.mode === 1) {
            initCamera();
        }

        // Mode 2: Check for jitter periodically
        setInterval(() => {
            checkJitterForMode2();
            updateDebug({ jitter: tremorScore() });
        }, 120);

        window.addEventListener("pointermove", (e) => {
            addPoint(e.clientX, e.clientY);

            // Left edge detection for side menu
            handleLeftEdge(e.clientX);

            if (S.mode === 1) {
                handleJitterMode1(e.clientX, e.clientY);
                // Ring follows target center in Mode 1
                if (S.assistOn && S.target) {
                    const rect = S.target.getBoundingClientRect();
                    moveRing(rect.left + rect.width / 2, rect.top + rect.height / 2, 0);
                }
            } else {
                // Mode 2: Dwell detection
                handleDwell(e.clientX, e.clientY);
            }
        }, { passive: true });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
})();
