#!/bin/bash
# Al abrir una sesión de Claude en la nube, deja instaladas las piezas de la
# app (node_modules) para poder correr `npm run build` sin esperar.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
# Sin package-lock: el proyecto no lo usa, así no queda un archivo suelto.
npm install --no-package-lock --no-audit --no-fund
