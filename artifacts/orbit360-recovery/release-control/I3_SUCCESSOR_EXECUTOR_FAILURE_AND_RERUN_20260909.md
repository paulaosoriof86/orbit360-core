# Gravicentra Insurance — I3 sucesor: fallo de executor y reintento controlado

Fecha: 2026-09-09  
Rama: `recovery/fase-a-clean-20260831`  
Gate: I3  
Naturaleza: evidencia operativa mutable.

## Resultado del primer intento

Run: `34420928503`  
Job: `102695956723`  
Conclusión: failure antes de build/deploy.

Pruebas que sí pasaron antes del fallo:

- intent I3 exacto y no autoritativo: PASS;
- guard del Control Plane en modo I3: PASS;
- source resuelto: `1e6a6ca3d259d0e5e644f716a2f71c6e0107efc4`;
- checkout físico del mismo source: PASS;
- preflight de dependencias backend: PASS;
- acceso al Firebase Hosting existente: PASS.

No se materializó artifact I3, no se desplegó Hosting Preview, no hubo readback y no se tocó producción ni datos.

## Causa exacta

El step `Materialize immutable frontend and backend source package` falló con:

`AttributeError: 'PosixPath' object has no attribute 'read'`

El executor usaba `Path(os.environ['APPS']).read()` para leer el JSON devuelto por Firebase CLI. `pathlib.Path` no expone `read()`.

Clasificación: `I3_EXECUTOR_PACKAGE_PREP_PATH_READ_METHOD_ERROR`.

## Corrección

Commit executor-only: `bf964736f2f7d87d64e7a39e3f5c30f28946e955`.

Cambio único:

`Path(...).read()` -> `Path(...).read_text()`.

Este commit no cambia source productivo de Gravicentra Insurance, no cambia el source candidato ya pasado por I2 y no autoriza mutaciones adicionales.

## Reintento

Se conserva exactamente:

- source: `1e6a6ca3d259d0e5e644f716a2f71c6e0107efc4`;
- tree: `d6e6857c9cd48d20db6000db02cbba3a00f26018`;
- I2 PASS: run `34420740707`.

El reintento se activa exclusivamente por `I3_EXECUTION_INTENT.json` con `intentId = I3-SUCCESSOR-ASEGURADORAS-TENANT-RUNTIME-20260909-R2`.

Condición de cierre: I3 solo puede pasar si el mismo source genera un paquete inmutable, se despliega a Hosting Preview aislado, todos los bytes hospedados hacen readback exacto y la evidencia se sella. Un nuevo fallo de executor permanece dentro de I3 y no reabre I1 ni crea otra iteración.
