# StudentAid.gov account workspace

Run these commands from this directory using PowerShell.

```powershell
npm ci
npm run build
$vite = (Resolve-Path .\node_modules\vite\bin\vite.js).Path
Start-Process -FilePath (Get-Command node).Source -ArgumentList ('"{0}" --configLoader native' -f $vite) -WorkingDirectory (Get-Location).Path -WindowStyle Hidden
```

Open http://localhost:5518. Use a fresh `?sid=` value for each scenario. Use a
POST to `/post?sid=<id>` with `{ "action": "set", "state": { ... } }` before opening
an injected session. Use `/go?sid=<id>` to inspect mutations. The workflow and
browser check results are recorded in TEST.md. SCHEMA.md describes persisted fields.
