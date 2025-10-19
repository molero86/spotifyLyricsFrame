if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registrado:', reg))
      .catch(err => console.error('Error registrando SW:', err));
  });
}

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Evita que el navegador muestre el prompt automáticamente
  e.preventDefault();
  deferredPrompt = e;

  // Muestra un botón o banner personalizado para instalar
  const installButton = document.createElement('button');
  installButton.textContent = 'Instalar aplicación';
  installButton.id = 'install-button';
  installButton.style.position = 'fixed';
  installButton.style.bottom = '20px';
  installButton.style.right = '20px';
  installButton.style.padding = '10px 20px';
  installButton.style.background = '#1DB954';
  installButton.style.color = 'white';
  installButton.style.border = 'none';
  installButton.style.borderRadius = '8px';
  installButton.style.cursor = 'pointer';
  document.body.appendChild(installButton);

  installButton.addEventListener('click', async () => {
    installButton.disabled = true;
    // Muestra el prompt de instalación
    deferredPrompt.prompt();

    // Espera la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;

    // Oculta el botón tras instalar o rechazar
    installButton.remove();
  });
});


window.addEventListener('load', () => {
    const loginContainer = document.getElementById('login-container');
    const mainContent = document.getElementById('main-content');
    const titleEl = document.getElementById('title');
    const artistEl = document.getElementById('artist');
    const lyricsEl = document.getElementById('lyrics');
    const backgroundEl = document.querySelector('.background');
    let isPlaying = true; // controla si seguimos actualizando

    let currentTrackId = null;
    let lyricsLines = [];

    const togglePlayButton = document.getElementById('toggle-play');
    const playIconPath = togglePlayButton.querySelector('path');
    
    togglePlayButton.addEventListener('click', () => {
        isPlaying = !isPlaying;

        if (!isPlaying) {
            // Mostrar play
            playIconPath.setAttribute('d', 'M8 5v14l11-7L8 5z'); 
        } else {
            // Mostrar pause
            playIconPath.setAttribute('d', 'M6 5h4v14H6V5zm8 0h4v14h-4V5z');
        }
    });

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
                        getLyrics(data);
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
    }

    function getLyrics(data) {
        const track = data.item.name;
        const artist = data.item.artists.map(artist => artist.name).join(', ');
        const isrc = data.item.external_ids ? data.item.external_ids.isrc : null;
        console.log("FullData:", data);
        console.log("ISRC:", isrc);
        console.log(`Fetching lyrics for ${track} by ${artist}`);
        fetch(`/api/lyrics?track=${encodeURIComponent(track)}&artist=${encodeURIComponent(artist)}&isrc=${encodeURIComponent(isrc)}`)
            .then(res => res.json())
            .then(data => {
                if (data.syncedLyrics) {
                    lyricsLines = data.syncedLyrics;
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
        lyricsEl.innerHTML = lyricsLines.map(line => 
            `<span data-time="${line.time.total * 1000}">${line.text}</span>`
        ).join('<br>');
    }

    function updateLyricHighlight(progress) {
        if (lyricsLines.length === 0) return;

        const lyricSpans = lyricsEl.querySelectorAll('span');
        let currentLineIndex = -1;

        lyricSpans.forEach((span, index) => {
            const lineTime = parseFloat(span.getAttribute('data-time'));
            if (progress >= lineTime) {
                currentLineIndex = index;
            }
        });

        lyricSpans.forEach((span, index) => {
            if (index === currentLineIndex) {
                span.classList.add('current-line');
                if(isPlaying)
                {
                    span.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center' // centra la línea actual
                    });
                }
            } else {
                span.classList.remove('current-line');
            }
        });
    }

    // Initial check
    checkAuth();

    // Poll every 1 second for smoother updates
    setInterval(() => {
        if (!mainContent.classList.contains('hidden') && isPlaying) {
            getCurrentlyPlaying();
        }
    }, 1000);
});
