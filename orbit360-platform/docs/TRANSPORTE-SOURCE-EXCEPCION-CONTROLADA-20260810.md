# Transporte source-only — excepción controlada de procedencia

Fecha: 2026-08-10

Archivo técnico temporal para provocar una única revalidación `pull_request` del paquete source-only después de corregir el falso positivo `Map.set()` del detector genérico.

- Base: `ays/backend-tenant-lab-v99-20260703`
- Clasificación del primer STOP: `VALIDATOR_STALE`.
- El checker y su fixture habían pasado antes del STOP.
- El correctivo distingue mutaciones Firestore de `Map.set()` en memoria.
- Sin secretos.
- Sin Firebase/Firestore runtime.
- Sin Hosting, navegador ni deploy.
- Sin escrituras operativas.
- Sin producción, main ni merge.

El PR se cierra sin merge después de obtener evidencia observable.
