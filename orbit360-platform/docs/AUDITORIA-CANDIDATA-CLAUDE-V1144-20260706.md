# Auditoría candidata Claude v1.144 — 2026-07-06

**Archivo auditado:** `Prototype Development Request - 2026-07-06T110022.669.zip`  
**SHA256:** `30b2fe0d47f0b74ac3f675eddd2ad9d57a7c5b7043c93c2cec76524813e94af1`  
**Comparada contra:** v1.143 y v1.142.  
**Estado:** no empalmar completa. Requiere otra corrección de Claude o empalme manual selectivo.

---

## 1. Resultado general

La v1.144 mejora frente a v1.143 y corrige parte importante del paquete:

- Conciliaciones retiró `APLICADA`, `Aplicadas`, `listas p/ backend` y `preparar_aplicacion_controlada`.
- Cobros cambió parte del copy de pago aplicado a pago confirmado.
- Cliente360 cambió algunos avisos a pago confirmado.
- Automatizaciones agregó `Pago reportado · pendiente de revisión/conciliación`.
- Academia subió `CONTENT_V` a 7 y agregó contenido de estados honestos.
- `node --check` en todos los JS del ZIP: OK.

Pero no está completa para empalme full porque quedan residuos visibles y el `index.html` del ZIP no conserva el index híbrido backend LAB de la rama viva.

---

## 2. Archivos modificados por Claude frente a v1.143

```txt
data/academia-plus.js
docs/BITACORA-CAMBIOS.md
index.html
modules/automatizaciones.js
modules/cliente360.js
modules/cobros.js
modules/conciliaciones.js
```

Frente a v1.142 también arrastra cambios anteriores en:

```txt
core/crmkit.js
modules/finanzas.js
```

---

## 3. Bloqueadores para devolución a Claude

### B1 — No empalmar index completo

El `index.html` de la rama viva contiene backend LAB protegido y hotfix Portal:

```txt
core/backend-lab-loader.js
data/store-firestore-lab.local.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
modules/portal-v1142-copyfix.js
```

El `index.html` del ZIP no conserva esos scripts. Por eso solo se puede usar el cambio de cache-bust de forma manual/selectiva.

### B2 — Cliente360 no está limpio

Persisten textos visibles y acciones:

```txt
Todo aplicado
Aplicar pago
Fecha de envío a gestión (día en que se aplica)
```

Debe cambiarse a lenguaje de cobro confirmado/conciliación:

```txt
Sin cobros pendientes
Confirmar cobro
Fecha de confirmación
```

### B3 — Cobros conserva acción visible “Aplicar pago”

Aunque cambió `Pago aplicado` a `Pago confirmado`, todavía hay botones/modales con:

```txt
Aplicar pago
Cobros · aplicar pago
Pagar
```

Debe quedar como `Confirmar cobro`, `Registrar cobro confirmado` o equivalente honesto.

### B4 — Finanzas conserva copy residual

`modules/finanzas.js` conserva:

```txt
Aplicado a póliza
pago sin aplicar
```

Debe cambiar a:

```txt
Confirmado y conciliado con póliza
pendiente de conciliación
```

### B5 — Importador no fue atendido y sigue con copy contrario

`core/importa.js` conserva copy de importación/conciliación que promete o sugiere aplicación:

```txt
Pagos no aplicados
Pagos del archivo aún no aplicados a su póliza
Aplicar pagos por póliza
Importación lista para aplicar
```

Debe cambiar a:

```txt
Pagos pendientes de validación
Pagos del archivo pendientes de relación con recibo/póliza
Revisar propuestas de conciliación por póliza
Importación lista para revisión/aprobación
```

También debe evitar cualquier write directo desde estado bancario/estado de cuenta hacia cobros/cartera/producción sin conciliación.

### B6 — Configuración del módulo Finanzas conserva texto viejo

`core/config.js` conserva en metadata:

```txt
Doble conciliación: pago aplicado a póliza creada
```

Debe cambiar a `cobro confirmado/conciliado con póliza`.

### B7 — Academia todavía no está totalmente al día

Academia mejoró, pero no está completa:

- No menciona explícitamente `junio/julio 2026`.
- No menciona explícitamente el `manifest/catálogo de fuentes`.
- Conserva “Aplica pagos” en la ruta de inducción operativa.
- `data/seed.js` conserva cursos base antiguos con “aplicar un pago baja la cartera” y “Cobros gestiona la cartera y aplica pagos”.
- `data/academia-plus.js` conserva `pago aplicado` dentro de una negación pedagógica; no es el peor caso, pero conviene evitar el término para que el buscador de QA no lo marque.

Academia debe cubrir: estados honestos, junio/julio, manifest, fuente separada, banco no es cobro, financiero histórico no crea cartera, documentos solo proponen, y reportado no es confirmado.

### B8 — Automatizaciones tiene copy técnico visible

`modules/automatizaciones.js` conserva un toast con:

```txt
conexión real al migrar backend
```

Debe cambiarse a lenguaje de usuario:

```txt
clave detectada · pendiente de activación técnica
```

---

## 4. Lo que sí puede rescatarse

Se pueden rescatar selectivamente:

```txt
modules/conciliaciones.js
parte de modules/cobros.js
parte de modules/cliente360.js
parte de modules/automatizaciones.js
data/academia-plus.js con corrección adicional
cache-bust de index manualmente, sin reemplazar index
```

No empalmar `index.html` completo.

---

## 5. Recomendación

Aprovechar capacidad de Claude y pedir v1.145 correctiva completa. Si no hay capacidad, ChatGPT/Codex puede hacer empalme selectivo y corregir residual, pero requiere más revisión manual.

Prioridad de corrección:

1. Cliente360 y Cobros: retirar “Aplicar pago” visible.
2. Finanzas e Importador: retirar “aplicado/sin aplicar/aplicar pagos”.
3. Academia: actualizar seed + academia-plus con junio/julio y manifest de fuentes.
4. Automatizaciones: retirar copy técnico visible.
5. Index: no reemplazar; solo indicar cache-bust requerido.

---

## 6. Estado

No empalmar full. Pedir nueva candidata o autorizar empalme selectivo posterior.