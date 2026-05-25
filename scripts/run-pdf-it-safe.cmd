@echo off
setlocal

set "REPO=C:\Users\Tobias\projects\pdf-it-safe"
set "PINNED_TAG=tobias-pdf-it-safe-v1.2.0-1"

cd /d "%REPO%" || exit /b 1

set "CURRENT_TAG="
for /f "usebackq delims=" %%T in (`git describe --exact-match --tags HEAD 2^>nul`) do set "CURRENT_TAG=%%T"

if not "%CURRENT_TAG%"=="%PINNED_TAG%" (
  >&2 echo pdf-it-safe refused to start: HEAD is not pinned tag %PINNED_TAG%.
  exit /b 1
)

git diff --quiet -- .
if errorlevel 1 (
  >&2 echo pdf-it-safe refused to start: working tree has uncommitted changes.
  exit /b 1
)

git diff --cached --quiet -- .
if errorlevel 1 (
  >&2 echo pdf-it-safe refused to start: index has uncommitted changes.
  exit /b 1
)

if not exist "%REPO%\dist\index.js" (
  >&2 echo pdf-it-safe refused to start: dist\index.js is missing. Run npm ci and npm run build.
  exit /b 1
)

node "%REPO%\dist\index.js"
