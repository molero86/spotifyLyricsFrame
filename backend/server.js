require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const querystring = require('querystring');
const { Spotifly } = require('@manhgdev/spotifyweb');

const app = express();
const port = 8888;

const spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const spotify_redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

let access_token = '';
let refresh_token = '';

const sp = new Spotifly();

const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

app.get('/login', (req, res) => {
    const scope = 'user-read-currently-playing';
    const state = generateRandomString(16);
    const auth_query_parameters = new URLSearchParams({
        response_type: 'code',
        client_id: spotify_client_id,
        scope: scope,
        redirect_uri: spotify_redirect_uri,
        state: state
    });
    res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
});

app.get('/callback', (req, res) => {
    const code = req.query.code || null;

    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        method: 'post',
        data: querystring.stringify({
            code: code,
            redirect_uri: spotify_redirect_uri,
            grant_type: 'authorization_code'
        }),
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64')),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        json: true
    };

    axios(authOptions)
        .then(response => {
            if (response.status === 200) {
                access_token = response.data.access_token;
                refresh_token = response.data.refresh_token;
                res.redirect('/');
            }
        })
        .catch(error => {
            res.send(error);
        });
});

app.get('/refresh_token', (req, res) => {
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        method: 'post',
        headers: { 'Authorization': 'Basic ' + (Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64')) },
        data: querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        }),
        json: true
    };

    axios(authOptions)
        .then(response => {
            if (response.status === 200) {
                access_token = response.data.access_token;
                res.send({ 'access_token': access_token });
            }
        })
        .catch(error => {
            res.send(error);
        });
});


app.get('/api/currently-playing', (req, res) => {
    const authOptions = {
        url: 'https://api.spotify.com/v1/me/player/currently-playing',
        method: 'get',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
    };

    axios(authOptions)
        .then(response => {
            if (response.status === 200) {
                res.send(response.data);
            } else {
                res.status(response.status).send();
            }
        })
        .catch(error => {
            if (error.response && error.response.status === 401) {
                // Access token expired, redirect to refresh
                res.status(401).send('Access token expired. Please refresh.');
            } else {
                res.send(error);
            }
        });
});

app.get('/api/lyrics', async (req, res) => {
    const { trackId } = req.query;
    try {
        const lyrics = await sp.getTrackLyrics(trackId);
        res.send(lyrics);
    } catch (error) {
        res.status(500).send({ error: 'Could not fetch lyrics.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log('Login with Spotify: http://localhost:8888/login');
});
