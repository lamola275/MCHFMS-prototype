@echo off
rem ── MCHFMS one-click launcher ─────────────────────────────────────────────
rem Double-click this file to start the app and open it in your browser.
rem Keep the black window open while you use the site. Close it to stop.

cd /d "%~dp0"

rem Open the browser a few seconds later, once the dev server is up
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000"

npm run dev
