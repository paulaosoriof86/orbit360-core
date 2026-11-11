# A&S G4 — Control técnico de Hosting compartido

Fecha de corte: 2026-10-13. Estado: `SOURCE_ONLY / DRAFT PR / NO DEPLOY`.

## Objetivo
Evitar una nueva regresión de Portal P-01 y Siniestros S5.12D causada por despliegues completos de Hosting desde ramas parciales.

Rama base de esta propuesta: `ays/siniestros-s512d-public-resolver-lab-20261007` (commit `f873ce1f2b55dc5ad8cac07b58be43faddeb0a99`).
Fuente Portal inmóvil: `1623cac977498bb5bba0092748a8c70a9cd06189`.

Auditoría G4: 2.704 blobs compartidos idénticos, dos archivos exclusivos por rama, 2.708 archivos en la unión teórica. La unión es fuente, no el inventario certificado de la última release Firebase.

## Contenido autorizado
* `tools/ays-g4/AYS_G4_ENSAMBLADOR_HOSTING_READONLY.py`: unión exacta en un directorio temporal fuera del checkout; hash SHA-1 de Git y SHA-256 por cada blob fuente, manifiesto completo y fallo cerrado si se altera más de lo autorizado.
* `tools/ays-g4/AYS_G4_ENSAMBLADOR_TESTS.py`: ocho pruebas sintéticas locales, incluida la preservación de permisos ejecutables.
* `tools/ays-g4/AYS_G3_SHARED_HOSTING_GUARD_2026-10-13.py`: gate para los cuatro archivos críticos, local o lectura HTTP no destructiva.
* `.github/workflows/ays-g4-shared-hosting-sourceonly.yml`: workflow manual y activación `push` restringida a la rama aislada de este PR, permisos `contents:read`, sin secretos, sin Firebase CLI y **sin desplegar**.

No se modifica `orbit360-platform/`, `firebase.json`, `functions/`, ni ninguno de los workflows anteriores; no se sube a GitHub un snapshot del sitio o datos de clientes.

## Límites y siguiente gate
1. El ensamblado real de 2.708 archivos queda pendiente de ejecución del CI remoto y readback del recibo.
2. Debe recuperarse el inventario efectivo de la **última release** de Firebase LAB antes de proponer un deploy.
3. El Portal reportó HTTP 404 al 13-10-2026; ello no implica que la funcionalidad autenticada se haya probado o sea liberable.
4. La corrección propuesta **no es una autorización de merge ni de deploy**. Cualquier operación posterior exige validación explícita y rollback.

El PR se dirige a la rama de Siniestros para evitar mezclar estos contratos con el `main` operativo.
