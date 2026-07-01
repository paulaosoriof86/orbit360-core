# Guia rapida - Preview visual vs Backend LAB

## Preview visual

Usar para revisar pantallas, UX, modulos, botones, plantillas, finanzas, reportes y pendientes Claude.

Comando:

powershell -ExecutionPolicy Bypass -File tools/orbit360-open-visual-preview.ps1

URL esperada: http://127.0.0.1:5178/index.html?preview=visualClienteSinBackendLab

## Backend LAB

Usar solo para Auth Firebase LAB, Firestore, smoke y rutas tenant.

Comando:

powershell -ExecutionPolicy Bypass -File tools/orbit360-open-backend-lab.ps1

URL esperada: http://127.0.0.1:5177/index-dev-firestore.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones

Si aparece login en Backend LAB, es correcto hasta resolver o restablecer Firebase Auth real.
