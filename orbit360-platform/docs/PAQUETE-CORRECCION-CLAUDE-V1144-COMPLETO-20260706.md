# Paquete completo de corrección para Claude — v1.144

**Fecha:** 2026-07-06  
**Objetivo:** pedir v1.145 correctiva completa.  
**Base:** candidata v1.144 auditada.  
**Estado:** urgente antes de empalme.

---

## Instrucción general

Claude: la v1.144 mejoró, pero todavía no está lista para empalme completo. Corrige TODO lo siguiente y entrega nueva candidata con bitácora, lista de archivos tocados y confirmación de sintaxis JS.

No tocar backend protegido:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*.mjs
tools/orbit360-*.ps1
```

No reemplazar `index.html` completo. Si necesitas cache-bust, documenta el cambio o conserva exactamente el index híbrido de la rama viva.

---

## 1. Cliente360

Corregir en `modules/cliente360.js`:

```txt
Todo aplicado
Aplicar pago
Fecha de envío a gestión (día en que se aplica)
```

Usar:

```txt
Sin cobros pendientes
Confirmar cobro
Fecha de confirmación
```

El modal debe decir `Confirmar cobro`, no `Aplicar pago`. El botón debe decir `Confirmar cobro` o `Registrar cobro confirmado`.

---

## 2. Cobros

Corregir en `modules/cobros.js`:

```txt
Aplicar pago
Cobros · aplicar pago
Pagar
```

Usar:

```txt
Confirmar cobro
Registrar cobro confirmado
Confirmar
```

Mantener separado:

```txt
Pago reportado por cliente = pendiente de revisión/conciliación
Cobro confirmado = validado por equipo
Conciliado = cruzado contra soporte/banco/aseguradora
```

---

## 3. Finanzas

Corregir en `modules/finanzas.js`:

```txt
Aplicado a póliza
pago sin aplicar
```

Usar:

```txt
Confirmado y conciliado con póliza
pendiente de conciliación
```

No usar `demo` en comentarios visibles o notas de módulo.

---

## 4. Importador

Corregir en `core/importa.js` copy visible:

```txt
Pagos no aplicados
Pagos del archivo aún no aplicados a su póliza
Aplicar pagos por póliza
Importación lista para aplicar
```

Usar:

```txt
Pagos pendientes de validación
Pagos del archivo pendientes de relación con recibo/póliza
Revisar propuestas de conciliación por póliza
Importación lista para revisión/aprobación
```

Reglas obligatorias:

- banco no crea cobro aplicado;
- estado de cuenta cliente no marca pago realizado;
- planilla de comisión no crea cartera ni cobro aplicado;
- financiero histórico no crea cartera, cobros ni producción;
- documentos soporte solo proponen;
- país/moneda faltante queda `REQUIERE_VALIDACION`.

---

## 5. Configuración / metadatos

Corregir en `core/config.js` metadata de Finanzas:

```txt
Doble conciliación: pago aplicado a póliza creada
```

Usar:

```txt
Doble conciliación: cobro confirmado/conciliado con póliza
```

---

## 6. Automatizaciones

Corregir en `modules/automatizaciones.js` cualquier texto técnico visible como:

```txt
conexión real al migrar backend
```

Usar:

```txt
clave detectada · pendiente de activación técnica
```

Mantener plantillas:

```txt
Pago confirmado
Pago reportado · pendiente de revisión/conciliación
```

---

## 7. Academia completa

Actualizar `data/academia-plus.js` y también `data/seed.js` si hay cursos base antiguos.

Debe cubrir explícitamente:

```txt
Estados honestos: reportado ≠ confirmado ≠ conciliado
Caso especial junio/julio 2026
Manifest/catálogo de fuentes reales
Fuente separada antes de lectura real
Banco no es cobro aplicado
Estado de cuenta cliente no es pago realizado
Financiero histórico no crea cartera/cobros/producción
Documentos soporte solo proponen datos
Planilla de comisión no crea cartera ni cobro aplicado
País/moneda faltante = REQUIERE_VALIDACION
GT=GTQ, CO=COP, no sumar crudo
```

Eliminar o reescribir frases antiguas como:

```txt
Aplica pagos
aplicar un pago baja la cartera
Cobros gestiona la cartera y aplica pagos
pago aplicado
```

Si necesitas mencionar el concepto, usar negación sin repetir el término prohibido:

```txt
Reportar soporte no confirma el cobro.
Validar una propuesta no confirma el cobro.
```

---

## 8. Index

No enviar un `index.html` que no conserve:

```txt
core/backend-lab-loader.js
data/store-firestore-lab.local.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
modules/portal-v1142-copyfix.js
```

Preferencia: no tocar `index.html`. Si lo tocas, conserva exactamente esos scripts.

---

## 9. QA requerido antes de entregar

Antes de entregar v1.145, buscar en UI/código de módulos activos:

```txt
Pago aplicado
Aplicado a póliza
Todo aplicado
cobros aplicados
recaudo aplicado
Aplicar pago
Aplicar pagos
Pagos no aplicados
pago sin aplicar
listas p/ backend
backend visible en UI
LAB visible en UI cliente
mock/demo visible en UI cliente
```

Debe quedar limpio o justificado como documentación interna no visible.

---

## 10. Entrega esperada

Entregar ZIP con:

- bitácora v1.145;
- lista de archivos tocados;
- confirmación 0 errores JS;
- confirmación backend protegido intacto;
- confirmación index híbrido conservado o no tocado;
- resumen de Academia actualizada.