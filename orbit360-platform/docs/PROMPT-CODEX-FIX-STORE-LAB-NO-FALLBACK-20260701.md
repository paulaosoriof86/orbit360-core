# Prompt Codex — Fix store LAB No-Fallback


Restricciones:
- No push.
- No Hosting deploy.
- No producción.
- No datos reales.
- No tocar módulos.
- Mantener API exacta Orbit.store: ll, get, where, insert, update, emove, _emit.

Objetivo:
Corregir orbit360-platform/data/store.js para que, cuando window.OrbitBackend.mode === 'firestore-lab' y 	enantId === 'alianzas-soluciones', el store NO caiga a seed/localStorage/demo. Debe usar Firestore LAB o reportar claramente uth-required / ackend-not-ready, pero nunca mostrar datos demo como backend.

Contexto ya documentado:

Tareas:
1. Leer data/store.js completo.
2. Identificar ruta actual Firestore por tenant.
3. Identificar fallback a seed/localStorage.
4. Separar modo demo vs modo irestore-lab.
5. En modo LAB, no usar seed/localStorage como fuente principal.
6. Mantener _emit público.
7. Añadir logs técnicos solo en consola, no en UI productiva.
8. Crear/actualizar documento de resultado y bitácoras.
9. Validar sintaxis JS y abrir servidor local en 5177.

Criterio de éxito:
- Sin Firebase Auth LAB: app queda en login/advertencia LAB, no dashboard demo.
- Con Firebase Auth LAB: Orbit.store.get(collection, lab_id) debe leer documentos lab_... desde Firestore LAB.
- Git status final claro.
