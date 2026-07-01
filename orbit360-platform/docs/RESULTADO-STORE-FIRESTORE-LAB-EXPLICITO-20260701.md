# Resultado Store Firestore LAB explícito

- Fecha local: 2026-07-01 00:53:08
- Rama: feat/ays-auth-lab-correction-20260630
- HEAD inicial: b563c52 chore(lab): bloquear fallback demo en auth LAB
- Restricciones: sin push, sin Hosting deploy, sin produccion, sin datos reales
- Estado: EN PROGRESO

## Cambio aplicado

- Se creó data/store-firestore-lab.local.js.
- Se endureció core/auth-lab-gate.local.js para detectar irestore-lab por URL y no depender solo de window.OrbitBackend.
- Se inyectó el store LAB explícito únicamente en index-dev-firestore.html.
- No se tocaron módulos.
- No se eliminó data/store.js; se conserva como store base/demo y se sobrescribe solo en visual LAB.

## Regla cumplida

En irestore-lab, Orbit.store ya no debe usar seed/localStorage/demo como fuente principal. Si no hay Firebase Auth LAB, retorna vacío o uth-required, evitando mostrar datos demo como backend.

## Verificación realizada

- Sintaxis JS validada con Node/vm.
- Servidor local abierto en 127.0.0.1:5177.
- Pendiente de confirmación visual: sin Firebase Auth LAB debe mostrarse login/advertencia LAB, no dashboard demo.

## Próximo paso

Cuando exista sesión Firebase LAB real, ejecutar smoke de lectura de documentos lab_... para confirmar ruta Firestore. Si no aparecen, ajustar candidatos de ruta dentro de data/store-firestore-lab.local.js sin tocar módulos.
