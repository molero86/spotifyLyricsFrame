import dotenv from "dotenv";
import express from "express";
import path from "path";
import axios from "axios";
import querystring from "querystring";
import { fileURLToPath } from "url";
import { LyricsClient } from "@mjba/lyrics";
import { log } from "console";

dotenv.config();

const app = express();
const port = 8888;

const spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const spotify_redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

let access_token = "";
let refresh_token = "";

// Necesario porque estamos en ES modules (import.meta.url)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos desde "public"
app.use(express.static(path.join(__dirname, "../public")));

// 🔑 Login en Spotify
app.get("/login", (req, res) => {
  const scope = "user-read-currently-playing";
  const state = Math.random().toString(36).substring(2, 15);
  const auth_query_parameters = new URLSearchParams({
    response_type: "code",
    client_id: spotify_client_id,
    scope: scope,
    redirect_uri: spotify_redirect_uri,
    state: state,
  });
  res.redirect(
    "https://accounts.spotify.com/authorize/?" +
      auth_query_parameters.toString()
  );
});

// 🔑 Callback de Spotify
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  try {
    const response = await axios({
      url: "https://accounts.spotify.com/api/token",
      method: "post",
      data: querystring.stringify({
        code: code,
        redirect_uri: spotify_redirect_uri,
        grant_type: "authorization_code",
      }),
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            spotify_client_id + ":" + spotify_client_secret
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    access_token = response.data.access_token;
    refresh_token = response.data.refresh_token;
    res.redirect("/");
  } catch (error) {
    console.error("Error in callback:", error.message);
    res.send(error);
  }
});

// 🔄 Refresh token
app.get("/refresh_token", async (req, res) => {
  try {
    const response = await axios({
      url: "https://accounts.spotify.com/api/token",
      method: "post",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            spotify_client_id + ":" + spotify_client_secret
          ).toString("base64"),
      },
      data: querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      }),
    });

    access_token = response.data.access_token;
    res.send({ access_token: access_token });
  } catch (error) {
    res.send(error);
  }
});


// 🎵 Obtener canción actual
app.get("/api/currently-playing", async (req, res) => {
    
    if (!access_token) {
        return res.status(401).send('Not logged in');
    }

    try {
    const response = await axios({
      url: "https://api.spotify.com/v1/me/player/currently-playing",
      method: "get",
      headers: { Authorization: "Bearer " + access_token },
    });

    if (response.status === 200 && response.data) {
      res.send(response.data);
    } else {
      res.status(response.status).send();
    }
  } catch (error) {
    console.error("Error fetching currently playing:", error.message);
    if (error.response && error.response.status === 401) {
      res.status(401).send("Access token expired. Please refresh.");
    } else {
      res.send(error);
    }
  }
});

// 📝 Obtener letra (con timestamps si hay)
app.get("/api/lyrics", async (req, res) => {
  const { track, artist } = req.query;

  if (!track || !artist) {
    return res.status(400).send({ error: "Track and artist are required" });
  }

  try {
    const lyricsClient = new LyricsClient();
    const data = await lyricsClient.searchAndGetSyncedLyrics(track, artist);

    // data.synced → array con { time, words }
    // data.unsynced → texto simple
    res.send(data);
  } catch (error) {
    console.error("Error fetching lyrics:", error.message);
    res.status(500).send({ error: "Could not fetch lyrics." });
  }
});

// 🚀 Lanzar servidor
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log("Login with Spotify: http://localhost:8888/login");
});