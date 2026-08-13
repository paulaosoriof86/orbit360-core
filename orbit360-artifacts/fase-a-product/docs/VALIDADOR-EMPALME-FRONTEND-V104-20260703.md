# Validador empalme frontend v1.104 — Orbit 360 A&S

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** agregado en GitHub / pendiente ejecución local.

## 1. Necesidad

Para empalmar el candidato final de Claude sin romper Backend LAB v1.104, se requiere una validación estática que revise el frontend antes y después de aceptar archivos del prototipo.

El objetivo es acelerar bloques largos sin subir reemplazos ciegos.

## 2. Archivo creado

```txt
tools/orbit360-validar-empalme-frontend-v104.mjs
```

## 3. Qué valida

- Existencia de archivos protegidos de backend.
- Existencia de frontend crítico:
  - `core/integraciones.js`
  - `core/integraciones-panel.js`
  - `core/integraciones-lab-mock.js`
  - `modules/marketing.js`
  - `modules/automatizaciones.js`
  - `modules/configuracion.js`
  - `core/ia.js`
  - `core/importa.js`
  - `modules/ia.js`
  - `modules/importar.js`
- Textos prohibidos o regresivos:
  - `White-label para Alianzas`
  - `Gemini por defecto`
  - `motor simulado`
  - `backend en producción`
- Patrones sensibles en alcance seguro:
  - API key / apiKey
  - secret
  - bearer token / access token
  - persistencia directa con `localStorage.setItem` o `sessionStorage.setItem`
- Posible mojibake/codificación dañada.
- Presencia mínima de scripts en `index.html`.

## 4. Cómo se ejecuta

Desde la raíz local del repo:

```txt
node tools/orbit360-validar-empalme-frontend-v104.mjs
```

Genera reporte en:

```txt
_orbit360_reports/VALIDACION-EMPALME-FRONTEND-V104.txt
```

## 5. Restricciones respetadas

- No red.
- No Firebase.
- No datos reales.
- No secretos.
- No deploy.
- No merge.
- No actualización de `main`.

## 6. Uso dentro de la metodología

Este validador debe correr:

1. antes de aceptar un lote frontend desde Claude;
2. después de aceptar el lote;
3. antes de integrar `index.html` permanentemente;
4. antes de iniciar Firestore/Auth real.

## 7. Estado

**LISTO PARA EJECUCIÓN LOCAL.**  
El empalme completo del candidato Claude sigue pendiente, pero ya existe una barrera objetiva para evitar regresiones de frontend, secretos, textos técnicos y archivos protegidos.
