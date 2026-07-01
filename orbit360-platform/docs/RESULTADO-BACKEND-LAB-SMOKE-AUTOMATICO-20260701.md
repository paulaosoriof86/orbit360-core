# Resultado Backend LAB - smoke automatico

- Fecha local: 2026-07-01 03:25:14
- Rama: feat/ays-auth-lab-correction-20260630
- HEAD inicial: dbd6d05 docs(lab): documentar pendiente Claude y continuidad backend
- Estado: EN PROGRESO
- Restricciones: sin push, sin deploy, sin produccion, sin datos reales, sin secretos.

## Cambio aplicado

- Se creo core/lab-smoke-firestore.local.js.
- Se inyecto solo en index-dev-firestore.html.
- El smoke no escribe en Firestore.
- El smoke no muestra UI productiva.
- El smoke se ejecuta automaticamente solo si detecta Firebase Auth LAB y API Orbit.store completa.
- Si no hay Auth LAB, registra en consola auth-required y no repite parches de login.

## Uso manual futuro

Cuando la sesion Firebase LAB exista, desde consola se podra ejecutar:

window.Orbit.runLabSmoke('manual')

Tambien queda disponible window.Orbit.__labSmoke.lastResult.

## Siguiente paso

Resolver o restablecer la credencial Firebase LAB fuera del codigo. Luego validar que el smoke reporte cero documentos lab_ faltantes.
