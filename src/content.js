(() => {
    if (window.__stabilityAssistLoaded) return;
    window.__stabilityAssistLoaded = true;

    const S = {
        mode: 1, // 1 = head gesture, 2 = dwell to click, 0 = disabled
        extensionEnabled: true,
        assistOn: false,
        sens: 150,
        dwellMs: 1500,
        magnetRadius: 140,
        pts: [],
        WINDOW_MS: 900,
        target: null,
        dwellStart: null,
        dwellArmed: false,
        dwellTimer: null, // Timer for automatic dwell completion
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
        mode1Timeout: null, // 3s auto-dismiss timer
        // Tab action state
        tabActionTarget: null,
        tabActionDwellStart: null,

        // Double confirmation for sensitive buttons
        confirmationCount: 0,
        needsDoubleConfirm: false
    };

    const css = `
  #sa_ring{
    position: fixed; left: 0; top: 0; width: 44px; height: 44px;
    border-radius: 999px; pointer-events:none; z-index: 2147483649;
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
    position: fixed; z-index: 2147483649;
    background: rgba(15,23,42,0.95); border: 1px solid rgba(96,165,250,0.5);
    border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.4);
    padding: 14px 18px; backdrop-filter: blur(8px);
    font-family: system-ui, sans-serif; color: #e5e7eb; font-size: 16px;
    display: none; text-align: center; min-width: 220px;
  }
  #sa_confirm.show { display: block; }
  #sa_confirm .msg { margin-bottom: 10px; color: #fff; font-weight: 600; font-size: 17px; }
  #sa_confirm .hint { font-size: 14px; color: #9ca3af; }
  #sa_confirm .warning { color: #fbbf24; font-weight: 600; }

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
    position: fixed; left: -320px; top: 50%; transform: translateY(-50%);
    z-index: 2147483647; width: 300px; max-height: 90vh;
    background: rgba(15,23,42,0.95); border: 1px solid rgba(96,165,250,0.5);
    border-radius: 0 16px 16px 0; box-shadow: 4px 0 25px rgba(0,0,0,0.4);
    padding: 20px; backdrop-filter: blur(10px);
    font-family: system-ui, sans-serif; color: #e5e7eb;
    transition: left 0.3s ease; overflow-y: auto;
    pointer-events: none;
  }
  #sa_sidemenu.show { left: 0; pointer-events: auto; }
  #sa_sidemenu .title { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 16px; }
  #sa_sidemenu .section-title { font-size: 12px; font-weight: 600; color: #9ca3af; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  #sa_sidemenu .mode-btn {
    display: block; width: 100%; padding: 20px 16px; margin-bottom: 12px;
    border: 2px solid rgba(96,165,250,0.4); border-radius: 10px;
    background: transparent; color: #e5e7eb; font-size: 14px;
    cursor: pointer; text-align: left; transition: all 0.2s;
  }
  #sa_sidemenu .mode-btn:hover { background: rgba(96,165,250,0.2); }
  #sa_sidemenu .mode-btn.active { background: #60a5fa; color: #071225; border-color: #60a5fa; }
  #sa_sidemenu .mode-btn.disabled { background: #ef4444; color: #fff; border-color: #ef4444; }
  #sa_sidemenu .mode-label { font-weight: 600; }
  #sa_sidemenu .mode-desc { font-size: 12px; opacity: 0.7; margin-top: 4px; }
  #sa_sidemenu .action-btn {
    display: flex; align-items: center; gap: 12px; width: 100%; padding: 20px 16px; margin-bottom: 12px;
    border: 2px solid rgba(96,165,250,0.4); border-radius: 10px;
    background: transparent; color: #e5e7eb; font-size: 14px; font-weight: 600;
    cursor: pointer; text-align: left; transition: all 0.2s;
  }
  #sa_sidemenu .action-btn:hover { background: rgba(96,165,250,0.2); }
  #sa_sidemenu .action-btn .icon { font-size: 20px; }
  #sa_sidemenu .action-btn .label { font-size: 14px; }
  #sa_sidemenu .action-btn.filling { background: conic-gradient(#60a5fa var(--fill-deg, 0deg), transparent 0deg); }
  /* Colored action buttons */
  #sa_sidemenu .action-btn[data-action="close"] { border-color: #ef4444; background: rgba(239, 68, 68, 0.15); }
  #sa_sidemenu .action-btn[data-action="close"]:hover { background: rgba(239, 68, 68, 0.35); }
  #sa_sidemenu .action-btn[data-action="new"] { border-color: #22c55e; background: rgba(34, 197, 94, 0.15); }
  #sa_sidemenu .action-btn[data-action="new"]:hover { background: rgba(34, 197, 94, 0.35); }
  #sa_sidemenu .action-btn[data-action="voice"] { border-color: #eab308; background: rgba(234, 179, 8, 0.15); }
  #sa_sidemenu .action-btn[data-action="voice"]:hover { background: rgba(234, 179, 8, 0.35); }
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
            <div class="title">Steady</div>
            <div class="section-title">Click Mode</div>
            <button class="mode-btn" data-mode="1">
                <div class="mode-label">Head Gesture</div>
                <div class="mode-desc">Turn right to click</div>
            </button>
            <button class="mode-btn" data-mode="2">
                <div class="mode-label">Dwell Click</div>
                <div class="mode-desc">Hold cursor to click</div>
            </button>
            <button class="mode-btn" data-mode="0">
                <div class="mode-label">Disable Extension</div>
                <div class="mode-desc">Turn off all features</div>
            </button>
            <div class="section-title">Quick Actions</div>
            <button class="action-btn" data-action="new">
                <span class="icon">+</span>
                <span class="label">New Tab</span>
            </button>
            <button class="action-btn" data-action="close">
                <span class="icon">✕</span>
                <span class="label">Close Tab</span>
            </button>
            <button class="action-btn" data-action="voice">
                <span class="icon">🎤</span>
                <span class="label">Voice Search</span>
            </button>
        `;
        document.body.appendChild(S.sideMenuEl);

        // Add click handlers for mode buttons
        S.sideMenuEl.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newMode = parseInt(btn.dataset.mode);
                switchMode(newMode);
                hideSideMenu();
            });
        });

        // Add handlers for action buttons
        setupActionButtons();

        updateSideMenuActive();
    }

    function setupActionButtons() {
        const actionBtns = S.sideMenuEl.querySelectorAll('.action-btn');

        actionBtns.forEach(btn => {
            let dwellStart = null;
            let animFrame = null;

            const executeAction = () => {
                const action = btn.dataset.action;
                if (action === 'close') {
                    chrome.runtime.sendMessage({ type: 'CLOSE_TAB' });
                } else if (action === 'new') {
                    chrome.runtime.sendMessage({ type: 'NEW_TAB' });
                } else if (action === 'voice') {
                    triggerVoiceSearch();
                }
                btn.style.setProperty('--fill-deg', '0deg');
                btn.classList.remove('filling');
                hideSideMenu();
            };

            // For Mode 2 (dwell): handle hover
            btn.addEventListener('mouseenter', () => {
                if (S.mode === 2) {
                    dwellStart = now();
                    btn.classList.add('filling');

                    const animate = () => {
                        if (!dwellStart) return;
                        const elapsed = now() - dwellStart;
                        const progress = Math.min(elapsed / S.dwellMs, 1);
                        btn.style.setProperty('--fill-deg', `${progress * 360}deg`);

                        if (progress >= 1) {
                            executeAction();
                            dwellStart = null;
                        } else {
                            animFrame = requestAnimationFrame(animate);
                        }
                    };
                    animFrame = requestAnimationFrame(animate);
                }
            });

            btn.addEventListener('mouseleave', () => {
                dwellStart = null;
                btn.style.setProperty('--fill-deg', '0deg');
                btn.classList.remove('filling');
                if (animFrame) cancelAnimationFrame(animFrame);
            });

            // For Mode 1 (head gesture) or other: normal click
            btn.addEventListener('click', () => {
                if (S.mode !== 2) {
                    executeAction();
                }
            });
        });
    }

    function triggerVoiceSearch() {
        // Try to find and click a search input, then trigger voice if available
        const searchInputs = document.querySelectorAll(
            'input[type="search"], input[name="q"], input[name="search"], input[aria-label*="search" i], input[placeholder*="search" i], [role="searchbox"]'
        );

        if (searchInputs.length > 0) {
            const searchInput = searchInputs[0];
            searchInput.focus();
            searchInput.click();

            // Try to find and click voice search button
            setTimeout(() => {
                const voiceBtn = document.querySelector(
                    '[aria-label*="voice" i], [title*="voice" i], [aria-label*="microphone" i], .voice-search'
                );
                if (voiceBtn) {
                    voiceBtn.click();
                }
            }, 200);
        } else {
            // If no search found, open Google voice search
            window.open('https://www.google.com/search?q=', '_blank');
        }
    }



    function switchMode(newMode) {
        if (newMode === S.mode) return;

        const prevMode = S.mode;
        S.mode = newMode;
        S.extensionEnabled = (newMode !== 0);

        // Handle camera based on mode
        if (newMode === 2 || newMode === 0) {
            // Switching to Mode 2 or disabled - stop camera
            stopCamera();
        } else if (newMode === 1 && prevMode !== 1) {
            // Switching to Mode 1 - start camera
            initCamera();
        }

        updateSideMenuActive();
        updateConfirmHint();
        updateDebug({ mode: S.mode, status: newMode === 0 ? 'Disabled' : `Mode ${S.mode}` });

        // Notify background script
        try {
            chrome.runtime.sendMessage({ type: 'SET_MODE', mode: S.mode });
        } catch (e) { }

        // Reset assist state
        S.assistOn = false;
        setTarget(null);
        hideRing();
        hideConfirm();
    }

    function stopCamera() {
        if (S.cameraStream) {
            S.cameraStream.getTracks().forEach(track => track.stop());
            S.cameraStream = null;
            S.gestureActive = false;
            updateDebug({ status: 'Camera stopped' });
        }
    }

    function setupTabActionButtons() {
        const tabBtns = S.sideMenuEl.querySelectorAll('.tab-btn');

        tabBtns.forEach(btn => {
            let dwellStart = null;
            let animFrame = null;

            const executeAction = () => {
                const action = btn.dataset.action;
                if (action === 'close') {
                    chrome.runtime.sendMessage({ type: 'CLOSE_TAB' });
                } else if (action === 'new') {
                    chrome.runtime.sendMessage({ type: 'NEW_TAB' });
                }
                btn.style.setProperty('--fill-deg', '0deg');
                btn.classList.remove('filling');
                hideSideMenu();
            };

            // For Mode 2 (dwell): handle hover
            btn.addEventListener('mouseenter', () => {
                if (S.mode === 2) {
                    dwellStart = now();
                    btn.classList.add('filling');

                    const animate = () => {
                        if (!dwellStart) return;
                        const elapsed = now() - dwellStart;
                        const progress = Math.min(elapsed / S.dwellMs, 1);
                        btn.style.setProperty('--fill-deg', `${progress * 360}deg`);

                        if (progress >= 1) {
                            executeAction();
                            dwellStart = null;
                        } else {
                            animFrame = requestAnimationFrame(animate);
                        }
                    };
                    animFrame = requestAnimationFrame(animate);
                }
            });

            btn.addEventListener('mouseleave', () => {
                dwellStart = null;
                btn.style.setProperty('--fill-deg', '0deg');
                btn.classList.remove('filling');
                if (animFrame) cancelAnimationFrame(animFrame);
            });

            // Simple click should ALWAYS work on sidebar buttons, even in Dwell mode
            // This prevents users from getting stuck if dwell fails
            btn.addEventListener('click', () => {
                executeAction();
            });
        });
    }

    function updateSideMenuActive() {
        if (!S.sideMenuEl) return;
        S.sideMenuEl.querySelectorAll('.mode-btn').forEach(btn => {
            const btnMode = parseInt(btn.dataset.mode);
            btn.classList.remove('active', 'disabled');
            if (btnMode === S.mode) {
                btn.classList.add(btnMode === 0 ? 'disabled' : 'active');
            }
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
        return Array.from(document.querySelectorAll("button, a, input, [role='button']"))
            .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);
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

    // Detect sensitive buttons (payment, submit, delete, etc.)
    function isSensitiveButton(el) {
        if (!el) return false;
        const text = (el.textContent || '').toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        const className = (el.className || '').toLowerCase();
        const type = (el.type || '').toLowerCase();

        const sensitiveKeywords = [
            'pay', 'payment', 'purchase', 'buy', 'checkout', 'order', 'submit',
            'confirm', 'delete', 'remove', 'cancel', 'subscribe', 'unsubscribe',
            'send', 'transfer', 'donate', 'sign up', 'register', 'book', 'reserve'
        ];

        const allText = `${text} ${ariaLabel} ${id} ${className}`;
        return sensitiveKeywords.some(keyword => allText.includes(keyword));
    }

    function updateConfirmForDoubleClick() {
        const msgEl = S.confirmEl.querySelector('.msg');
        const hintEl = S.confirmEl.querySelector('.hint');
        if (msgEl) msgEl.innerHTML = '<span class="warning">Confirm again!</span>';
        if (hintEl) {
            if (S.mode === 1) {
                hintEl.innerHTML = 'Sensitive button - turn right again to confirm';
            } else {
                hintEl.innerHTML = 'Sensitive button - dwell again to confirm';
            }
        }
    }

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
            // Check if sensitive and reset confirmation count
            S.needsDoubleConfirm = isSensitiveButton(el);
            S.confirmationCount = 0;

            // Start a timer to complete dwell even if cursor is stationary
            if (S.dwellTimer) clearTimeout(S.dwellTimer);
            S.dwellTimer = setTimeout(() => {
                if (S.dwellArmed && S.target && S.assistOn && S.mode === 2) {
                    completeDwellClick();
                }
            }, S.dwellMs);
        }

        const progress = (now() - S.dwellStart) / S.dwellMs;
        moveRing(x, y, progress);

        if (progress >= 1 && S.dwellArmed) {
            completeDwellClick();
        }
    }

    // Complete the dwell click action
    function completeDwellClick() {
        if (!S.dwellArmed) return;
        S.dwellArmed = false;
        if (S.dwellTimer) {
            clearTimeout(S.dwellTimer);
            S.dwellTimer = null;
        }
        S.confirmationCount++;

        if (S.needsDoubleConfirm && S.confirmationCount < 2) {
            // First dwell complete on sensitive button - require second dwell
            updateConfirmForDoubleClick();
            showConfirmAboveTarget(S.target);
            S.dwellStart = now();
            S.dwellArmed = true;
            updateDebug({ status: "Confirm again!" });

            // Restart timer for second dwell
            S.dwellTimer = setTimeout(() => {
                if (S.dwellArmed && S.target && S.assistOn && S.mode === 2) {
                    completeDwellClick();
                }
            }, S.dwellMs);
        } else {
            // Either not sensitive, or second confirmation complete
            safeClick(S.target);
            S.dwellStart = null;
            S.assistOn = false;
            S.confirmationCount = 0;
            S.needsDoubleConfirm = false;
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
                this.lastGestureTime = nowTime;
                this.pitchHistory = [];
                this.yawHistory = [];

                // Clear auto-dismiss timer
                if (S.mode1Timeout) {
                    clearTimeout(S.mode1Timeout);
                    S.mode1Timeout = null;
                }

                S.confirmationCount++;

                // Check if this is a sensitive button needing double confirmation
                if (S.needsDoubleConfirm && S.confirmationCount < 2) {
                    // First gesture on sensitive button - require second
                    updateDebug({ status: "Confirm again!" });
                    updateConfirmForDoubleClick();
                    S.ringEl.style.boxShadow = "0 0 0 10px #fbbf24";
                    S.ringEl.style.background = "#fbbf24";

                    // Restart auto-dismiss timer for second confirmation
                    S.mode1Timeout = setTimeout(() => {
                        if (S.assistOn && S.mode === 1) {
                            updateDebug({ status: "Auto-dismissed" });
                            S.assistOn = false;
                            S.confirmationCount = 0;
                            S.needsDoubleConfirm = false;
                            setTarget(null);
                            hideRing();
                            hideConfirm();
                        }
                    }, 3000);
                } else {
                    // Either not sensitive, or second confirmation - proceed with click
                    updateDebug({ status: "Turn Right! Clicking..." });
                    S.ringEl.style.boxShadow = "0 0 0 10px #00ff00";
                    S.ringEl.style.background = "#00ff00";
                    safeClick(S.target);

                    setTimeout(() => {
                        S.assistOn = false;
                        S.confirmationCount = 0;
                        S.needsDoubleConfirm = false;
                        setTarget(null);
                        hideRing();
                        hideConfirm();
                        updateDebug({ status: "Clicked!", pitch: 0, yaw: 0 });
                    }, 300);
                }
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

                // Check if sensitive button for double confirmation
                S.needsDoubleConfirm = isSensitiveButton(el);
                S.confirmationCount = 0;

                const rect = el.getBoundingClientRect();
                moveRing(rect.left + rect.width / 2, rect.top + rect.height / 2, 0);
                showConfirmAboveTarget(el);
                updateDebug({ status: S.needsDoubleConfirm ? "Jitter! Double confirm needed" : "Jitter! Confirm?" });

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
        // Get initial mode from storage FIRST - before any UI setup
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_MODE' });
            if (response && response.mode !== undefined) {
                S.mode = response.mode;
                S.extensionEnabled = (S.mode !== 0);
            }
        } catch (e) {
            console.log("Could not get mode, defaulting to 1");
            S.mode = 1;
            S.extensionEnabled = true;
        }

        // NOW setup UI with correct mode
        injectCSS();
        makeRing();
        makeConfirmPopup();
        makeDebugPanel();
        makeSideMenu();

        // Update UI to reflect stored mode
        updateConfirmHint();
        updateSideMenuActive();
        updateDebug({ mode: S.mode, status: S.mode === 0 ? 'Disabled' : `Mode ${S.mode}` });

        // Listen for mode changes from other tabs/popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'MODE_CHANGE') {
                S.mode = message.mode;
                S.extensionEnabled = (S.mode !== 0);
                S.assistOn = false;
                setTarget(null);
                hideRing();
                hideConfirm();
                updateConfirmHint();
                updateSideMenuActive();
                updateDebug({ mode: S.mode, status: S.mode === 0 ? 'Disabled' : `Switched to Mode ${S.mode}` });

                // Handle camera based on mode
                if (S.mode === 2 || S.mode === 0) {
                    stopCamera();
                } else if (S.mode === 1 && !S.cameraStream) {
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
