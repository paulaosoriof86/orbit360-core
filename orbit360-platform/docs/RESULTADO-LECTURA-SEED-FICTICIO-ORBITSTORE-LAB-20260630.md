# Resultado lectura seed ficticio Orbit.store LAB

- Fecha local: 2026-07-01 00:04:14
- Repo: C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core
- App validada: index-dev-firestore.html
- Firebase LAB: ays-orbit-360-lab
- Tenant: alianzas-soluciones
- Rama: feat/ays-auth-lab-correction-20260630
- HEAD antes de documentar: 1ca31fd08230f573aff4725209ce92b17a27deba
- Restricciones aplicadas: no push, no Hosting deploy, no produccion, no datos reales
- Resultado global: FALLIDO

## Validacion ejecutada

- Fuente: app real en navegador desde index-dev-firestore.html.
- Metodo: iframe mismo origen + lectura de window.Orbit.store.
- Escrituras: ninguna. No se llamo insert/update/remove.
- API esperada: all, get, where, insert, update, remove, _emit.

## Colecciones leidas con Orbit.store.all

| Coleccion | Conteo leido | Minimo esperado | OK |
|---|---:|---:|---|
| clientes | n/a | n/a | False |
| asesores | n/a | n/a | False |
| aseguradoras | n/a | n/a | False |
| vehiculos | n/a | n/a | False |
| polizas | n/a | n/a | False |
| cobros | n/a | n/a | False |
| finmovs | n/a | n/a | False |
| comisiones | n/a | n/a | False |
| reclamos | n/a | n/a | False |
| negocios | n/a | n/a | False |
| gestiones | n/a | n/a | False |
| actividades | n/a | n/a | False |
| metas | n/a | n/a | False |

## Checks puntuales


## Estado

ABIERTO. La lectura desde la app real no quedo validada. Revisar el JSON generado en _orbit360_tmp/validate-seed-read-real-app/resultado.json.
Error principal: Timeout esperando Orbit.store con API completa en index-dev-firestore.html
