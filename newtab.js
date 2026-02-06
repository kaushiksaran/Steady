// Steady New Tab Page Script - Specialized Logic Only
// Core extensions features (Sidebar, Jitter, Dwell) are handled by content.js

(() => {
    // Update time display
    function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timeEl = document.getElementById('timeDisplay');
        if (timeEl) timeEl.textContent = `${hours}:${minutes}`;

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateEl = document.getElementById('dateDisplay');
        if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', options);
    }

    // Initialize New Tab specific features
    function init() {
        updateTime();
        setInterval(updateTime, 1000);

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (query) {
                        // Check if it's a URL
                        if (query.includes('.') && !query.includes(' ')) {
                            const url = query.startsWith('http') ? query : 'https://' + query;
                            window.location.href = url;
                        } else {
                            window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(query);
                        }
                    }
                }
            });
        }

        // Voice button triggers search focus + click (content.js handles the actual voice search trigger if integrated, or we fallback)
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                // We let content.js handle voice search via its sidebar, but for this button:
                window.location.href = 'https://www.google.com/search?q=';
            });
        }
    }

    init();
})();
