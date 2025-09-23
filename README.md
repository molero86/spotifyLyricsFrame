# Spotify Lyrics Frame

A Raspberry Pi project to display lyrics for the currently playing Spotify song. This project provides a lightweight web app that connects to the Spotify API to show the currently playing track and fetches lyrics from Musixmatch.

## Features

-   Displays the currently playing song from your Spotify account.
-   Fetches and displays song lyrics from Musixmatch.
-   Album cover art as a blurred background.
-   Automatic track change detection.
-   Lyrics caching to reduce API calls.
-   Designed for fullscreen (kiosk mode) displays.

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/spotify-lyrics-frame.git
cd spotify-lyrics-frame
```

### 2. API Credentials

You will need API credentials from both Spotify and Musixmatch.

**Spotify:**

1.  Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
2.  Create a new application.
3.  Note down your `Client ID` and `Client Secret`.
4.  In your application settings, add a `Redirect URI`: `http://localhost:8888/callback`.

**Musixmatch:**

1.  Go to the [Musixmatch Developer](https://developer.musixmatch.com/).
2.  Sign up for an API key.
3.  Note down your `API Key`.

**Create `.env` file:**

Create a file named `.env` in the root of the project and add your credentials as follows:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
LYRICS_API_KEY=your_musixmatch_api_key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:8888`. You will be prompted to log in with your Spotify account.

## Docker Deployment

You can also run the application using Docker.

1.  **Build the Docker image:**
    ```bash
    docker build -t spotify-lyrics-frame .
    ```

2.  **Run the Docker container:**
    ```bash
    docker run -p 8888:8888 --env-file .env spotify-lyrics-frame
    ```

## Raspberry Pi Kiosk Mode Setup

To run this on a Raspberry Pi in kiosk mode, you can use a lightweight browser like Chromium.

1.  **Install Chromium:**
    ```bash
    sudo apt-get update
    sudo apt-get install -y chromium-browser
    ```

2.  **Create a startup script:**
    Create a file named `start-kiosk.sh`:
    ```bash
    #!/bin/bash
    chromium-browser --kiosk http://localhost:8888
    ```
    Make the script executable:
    ```bash
    chmod +x start-kiosk.sh
    ```

3.  **Autostart on boot:**
    There are several ways to autostart a script on boot. One common method is to use a `.desktop` file in `~/.config/autostart/`.

    Create the directory if it doesn't exist:
    ```bash
    mkdir -p ~/.config/autostart
    ```

    Create a file named `kiosk.desktop` in that directory with the following content:
    ```
    [Desktop Entry]
    Type=Application
    Name=Kiosk
    Exec=/path/to/your/start-kiosk.sh
    ```
    Replace `/path/to/your/start-kiosk.sh` with the actual path to your script.

Now, when you reboot your Raspberry Pi, it should automatically launch Chromium in kiosk mode and display the lyrics frame.

## Known Limitations

-   **Token Storage:** The Spotify access and refresh tokens are stored in memory. This means that if the server restarts, you will need to log in with Spotify again. For a more robust solution, you would need to implement a persistent storage mechanism for the tokens.
-   **Lyric Synchronization:** The lyric synchronization is based on an estimation of the song's progress, as the free Musixmatch API does not provide timestamps. The accuracy of the highlighting may vary.
