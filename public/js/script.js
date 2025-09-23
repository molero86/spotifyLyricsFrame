window.addEventListener('load', () => {
    const loginContainer = document.getElementById('login-container');
    const mainContent = document.getElementById('main-content');
    const titleEl = document.getElementById('title');
    const artistEl = document.getElementById('artist');
    const lyricsEl = document.getElementById('lyrics');
    const backgroundEl = document.querySelector('.background');

    let currentTrackId = null;
    let lyricsLines = [];
    let songDuration = 0;

    function checkAuth() {
        fetch('/api/currently-playing')
            .then(res => {
                if (res.status === 200) {
                    showMainContent();
                    getCurrentlyPlaying();
                } else {
                    showLogin();
                }
            })
            .catch(() => showLogin());
    }

    function showLogin() {
        loginContainer.classList.remove('hidden');
        mainContent.classList.add('hidden');
    }

    function showMainContent() {
        loginContainer.classList.add('hidden');
        mainContent.classList.remove('hidden');
    }

    function getCurrentlyPlaying() {
        fetch('/api/currently-playing')
            .then(res => {
                if (res.status === 401) {
                    return fetch('/refresh_token').then(() => getCurrentlyPlaying());
                }
                if (res.status === 204 || res.status > 400) {
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (data && data.item) {
                    if (data.item.id !== currentTrackId) {
                        currentTrackId = data.item.id;
                        updateUI(data);
                        getLyrics(data.item.artists[0].name, data.item.name);
                    }
                    updateLyricHighlight(data.progress_ms);
                }
            })
            .catch(error => console.error('Error fetching currently playing:', error));
    }

    function updateUI(data) {
        titleEl.textContent = data.item.name;
        artistEl.textContent = data.item.artists.map(artist => artist.name).join(', ');
        backgroundEl.style.backgroundImage = `url(${data.item.album.images[0].url})`;
        songDuration = data.item.duration_ms;
    }

    function getLyrics(artist, title) {
        fetch(`/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`)
            .then(res => res.json())
            .then(data => {
                if (data.message.body.lyrics) {
                    lyricsLines = data.message.body.lyrics.lyrics_body.split('\n').filter(line => line.trim() !== '');
                    displayLyrics();
                } else {
                    lyricsEl.innerHTML = '<span>Lyrics not found for this song.</span>';
                }
            })
            .catch(error => {
                console.error('Error fetching lyrics:', error);
                lyricsEl.innerHTML = '<span>Could not load lyrics.</span>';
            });
    }

    function displayLyrics() {
        lyricsEl.innerHTML = lyricsLines.map(line => `<span>${line}</span>`).join('<br>');
    }

    function updateLyricHighlight(progress) {
        if (lyricsLines.length === 0) return;

        const timePerLine = songDuration / lyricsLines.length;
        const currentLineIndex = Math.floor(progress / timePerLine);

        const lyricSpans = lyricsEl.querySelectorAll('span');
        lyricSpans.forEach((span, index) => {
            if (index === currentLineIndex) {
                span.classList.add('current-line');
            } else {
                span.classList.remove('current-line');
            }
        });
    }

    // Initial check
    checkAuth();

    // Poll every 1 second for smoother updates
    setInterval(() => {
        if (!mainContent.classList.contains('hidden')) {
            getCurrentlyPlaying();
        }
    }, 1000);
});
