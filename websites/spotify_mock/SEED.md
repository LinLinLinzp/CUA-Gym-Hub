# Spotify — build brief

- Real product: Spotify (https://open.spotify.com). Mock directory: `websites/spotify_mock`.
- Scenario: 文化内容; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): playlists, library, follow, collaborative playlists.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5355 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
