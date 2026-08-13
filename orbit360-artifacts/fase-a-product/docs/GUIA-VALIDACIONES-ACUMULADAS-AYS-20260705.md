# Guía — Validaciones acumuladas Orbit 360 A&S

**Fecha:** 2026-07-05  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** guía y runner agregados; pendiente ejecución local.

---

## 1. Objetivo

Reducir pasos manuales agrupando validaciones acumuladas antes de pasar a cualquier fase backend real.

Este runner no abre navegador y no autoriza producción.

---

## 2. Comando recomendado

Desde la carpeta del repo:

```powershell
./tools/orbit360-run-validaciones-acumuladas-ays.ps1
```

Este helper ejecuta:

```txt
node tools/orbit360-run-validaciones-acumuladas-ays.mjs
```

Genera reporte en `_orbit360_reports` y copia el resumen al portapapeles cuando PowerShell lo permite.

---

## 3. Qué agrupa

```txt
Sintaxis JS de integraciones-panel.js
Sintaxis JS de conciliaciones.js
Sintaxis JS de inicio.js
Sintaxis JS de portal-v1142-copyfix.js
Tests modelo clientes/asesor/portal/calidad
Tests modelo pólizas/recibos/cartera
Tests modelo cobros/pagos/conciliación
Tests modelo documentos/adjuntos
Validación estática por roles
```

---

## 4. Criterios de bloqueo

Bloquear avance si:

- falla sintaxis JS;
- falta archivo protegido o módulo clave;
- modelo cliente permite creación desde fuente incorrecta;
- modelo póliza genera cartera sin estado/país/moneda confiable;
- modelo cobros trata pago reportado como aplicado;
- modelo documentos permite crear entidades sin diferencia revisable y confirmación;
- revisión por roles detecta copy de pago aplicado o promesa de aplicación directa.

---

## 5. Qué no valida

No reemplaza:

- revisión visual en navegador;
- revisión manual de UI por Paula/ChatGPT;
- validación con datos reales;
- fase backend real;
- reglas finales de seguridad;
- aplicación controlada de pagos.

---

## 6. Siguiente paso si pasa

Si el runner pasa, el siguiente paso recomendado es abrir la plataforma local y ejecutar la revisión visual/operativa por roles con el checklist:

```txt
orbit360-platform/docs/CHECKLIST-REVISION-VISUAL-OPERATIVA-ROLES-AYS-20260705.md
```

---

## 7. Siguiente paso si falla

Si falla:

1. copiar el resumen del portapapeles;
2. compartirlo a ChatGPT;
3. no pasar a backend real;
4. corregir únicamente el bloque fallido;
5. repetir el runner.

---

## 8. Estado

Runner agregado. No se ejecutó localmente desde esta sesión.