# Orbit 360 A&S — M5 5.0.4 · Entrega Hosting LAB de RC post-Access

Fecha: 2026-07-28  
Gate: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Fuente y baseline

- M4 cerrado con destino canónico verificado.
- M5 5.0.1 cerrado: readiness canónico.
- M5 5.0.2 cerrado: owner Access fail-closed.
- M5 5.0.3 cerrado: RC `d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045`.
- 41/41 activos críticos presentes.
- LAB previo: 21/24; pendientes `index.html`, taxonomía de roles y owner de sesión/selector.

## Clasificación

`ENVIRONMENT_FAILURE` / gap de entrega LAB. No es defecto funcional de la candidata ni fallo de datos.

## Alcance autorizado

Una sola entrega al canal Hosting LAB `orbit360-ays-lab` del proyecto `ays-orbit-360-lab`.

Permitido:

- usar identidad de servicio únicamente después del preflight;
- desplegar Hosting LAB mediante `hosting:channel:deploy`;
- verificar públicamente 24 activos sin navegador;
- producir evidencia sanitizada.

Prohibido:

- Firestore read/write;
- datos operativos o memberships;
- Functions, Rules o Storage Rules;
- navegador/runtime smoke;
- producción, `main` o merge;
- Pólizas u otras fuentes reales.

## Gate y criterios

Antes del deploy:

1. solicitud inmutable ligada al parent commit;
2. preflight canónico 5.0.4;
3. RC hash exacto `d90ec601…`;
4. 41 activos críticos presentes;
5. proyecto y canal exactos;
6. cero capacidades fuera de Hosting.

Después del deploy:

1. 24/24 activos públicos coincidentes;
2. cero mismatches;
3. RC hash sin cambio;
4. cero escrituras operativas;
5. Functions/Rules/producción intactos.

## Academia

Este cambio enseña la diferencia entre:

- `FUNCTIONAL_DEFECT`/`SECURITY_FAILURE`: selector de roles libre, corregido en 5.0.2;
- `ENVIRONMENT_FAILURE`: LAB aún sirve activos anteriores aunque la RC ya esté corregida;
- gate estático: valida paquete y autorización antes de secretos;
- gate de entrega: publica exclusivamente Hosting y exige integridad remota antes del smoke.

Un deploy exitoso por sí solo no habilita el navegador. Primero debe existir paridad pública 24/24 y la autorización 5.0.4 debe quedar consumida.

## Siguiente acción

Crear la solicitud inmutable, ejecutar una sola entrega Hosting LAB y aceptar únicamente `M5_LAB_HOSTING_DELIVERED_AND_24_OF_24_VERIFIED`. El runtime smoke requerirá autorización separada.
