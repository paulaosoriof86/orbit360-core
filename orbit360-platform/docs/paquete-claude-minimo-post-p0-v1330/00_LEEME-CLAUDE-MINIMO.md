# Paquete Claude mínimo post-P0 v1330 — LEER PRIMERO

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama backend activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Este paquete es pequeño y de alto impacto. No pide reconstrucción general ni backend. Solo pide a Claude resolver pendientes UX/prototipo/Academia que quedaron después de la auditoría y preparación de hotfixes P0.

## Antes de trabajar

Claude debe leer:

```txt
DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
```

## Baseline

Última candidata auditada:

```txt
Prototype Development Request - 2026-07-08T135740.684.zip
SHA256: 97e968810029181dc10747a13d7c4f343f058b6ed9b4400af6d11f68dee6836c
```

Decisión:

```txt
Aceptada como última base incremental frontend/UX.
No cerró todo P0.
ChatGPT/Codex preparó hotfixes P0 que Claude no debe revertir.
```

## No tocar

Claude NO debe tocar ni reemplazar:

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
orbit360-platform/index.html
```

## Objetivo exacto

Resolver solo 4 frentes:

```txt
1. Cliente360 Documentos por rol.
2. UX visual de estados operativos.
3. Academia materializada post-hotfixes.
4. Smoke visual post-hotfixes.
```

## Restricción central

No reintroducir:

```txt
- base64/readAsDataURL/factData para soportes/facturas;
- key/token/API secret en frontend/store;
- pago aplicado desde reporte del cliente;
- conciliación M5 como pago aplicado;
- integración preparada como activa real;
- textos técnicos visibles para cliente.
```

## Entrega esperada

Claude debe entregar candidata ZIP/prototipo con:

- cambios en frontend/UX solamente;
- bitácora de cambios;
- lista de archivos modificados;
- checklist de no tocar protegidos;
- notas de Academia actualizadas;
- smoke visual documentado.