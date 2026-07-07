# Hotfix Cliente360 honestidad correo/expediente v1330 - 2026-07-07

## Commit

```txt
de7c8671883006386184cce3597513c092a7766d
fix(ays): cliente360 prepara correo sin envio real v1330
```

## Archivo modificado

```txt
orbit360-platform/modules/cliente360.js
```

## Problema

Cliente360 mostraba textos y acciones que podian sugerir integraciones o envios reales:

- `Expediente en Drive` y `Agregar link de Drive`.
- Comparativo con accion `Enviar comparativo al cliente`.
- Correo a aseguradora desde siniestros llamando envio directo.
- Redactar correo desde pestaña Correos llamando envio directo.

Regla aplicada:

```txt
Preparar/redactar correo no significa enviar.
Link manual de expediente no equivale a integracion Drive activa.
Comparativo preparado no equivale a comparativo enviado.
```

## Cambio aplicado

- Header de Cliente360 ahora dice `Expediente vinculado` y `Agregar enlace de expediente`.
- El comparativo ahora usa `Preparar comparativo para cliente` y llena `window.__orbitCompose`.
- El correo a aseguradora prepara compositor central en `#/correo`.
- El boton `Redactar` en la pestaña Correos prepara compositor central en `#/correo`.
- No se registra correo como enviado ni se simula adjunto real.

## Validaciones

```txt
node --check orbit360-platform/modules/cliente360.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

Resultado:

```txt
cliente360.js: OK
Contrato backend LAB: OK
Errores: 0
Warnings: 1, guard LAB en index esperado
```

## Protegidos

No se tocaron:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
```

## Impacto Claude / prototipo / Academia

Patrones que Claude debe conservar:

- Compositor preparado no equivale a correo enviado.
- Comparativo preparado no equivale a comparativo entregado.
- Enlace manual de expediente no equivale a integracion Drive activa.
- Toda entrega real depende de cuenta/canal/proveedor conectado.

Impacto Academia:

- Explicar a usuarios que `Redactar` prepara un correo.
- Explicar que el envio real ocurre en la capa central de Correo, con cuenta conectada.
- Explicar que expediente vinculado puede ser enlace manual hasta que exista integracion Drive real.
