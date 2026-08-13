# Prompt actualizado para Claude — Orbit 360 A&S · candidato 211525.464

Claude, trabaja **solo** sobre este candidato:

```txt
Prototype Development Request - 2026-07-04T211525.464.zip
```

No reinicies, no vuelvas a versiones anteriores y no reescribas módulos ya corregidos.

## Estado auditado real

La auditoría comparó `211525.464` contra `205210.456` y confirmó:

```txt
Raíz: orbit360-platform/
Archivos: 97
JS: 54
Módulos: 30
Scripts index: 51
Errores JS: 0
Archivos agregados: 0
Archivos removidos: 0
Archivos modificados: 6
```

Archivos modificados por ti en este último candidato:

```txt
CHANGELOG.md
core/importa.js
docs/BITACORA-CAMBIOS.md
index.html
modules/cliente360.js
modules/cobros.js
```

## Conserva, no rehagas

Conservar sin tocar salvo ajuste mínimo:

1. `modules/cobros.js`: `validarReporte()` ya no aplica pago; marca `validadoReporte:true`.
2. `modules/cliente360.js`: muestra “Validada (por aplicar)” y separa Validar de Aplicar pago.
3. `core/importa.js`: `applyConciliacion()` ya no marca cobros como Pagado ni llama `postRecaudo`.
4. `core/importa.js`: `planillaFlujo()` ya no usa `cur || 'GTQ'`; si falta moneda muestra “moneda requerida” y `REQUIERE_VALIDACION`.
5. `data/academia-plus.js`: conserva `CONTENT_V=5` y la lección de conciliación.
6. `modules/polizas.js`: conserva `gastosFinan`.

## Corrige únicamente estos puntos para cerrar sin reproceso

### 1. Documentación global realmente alineada

Actualizar obligatoriamente:

```txt
README.md
CHANGELOG.md
docs/PENDIENTES-Y-MEJORAS.md
docs/REPORTE-SMOKE.md
docs/BITACORA-CAMBIOS.md
```

Debe quedar claro:

```txt
Candidata actual auditada: 2026-07-04T211525.464
Base comparada: 2026-07-04T205210.456
Academia: CONTENT_V=5
P0 cerrado: Pólizas gastosFinan; Cobros validar≠aplicar; Cliente360 validado por aplicar; Importador no aplica pagos directo; planilla sin fallback GTQ
Pendiente honesto: bandeja/persistencia real conciliaciones backend; producto-por-ramo en Academia; smoke visual real posterior
```

Eliminar o corregir encabezados viejos que sigan diciendo:

```txt
193658.630
CONTENT_V=3
v1.126 como candidata activa
```

No decir “todos los P0 cerrados” si en el mismo documento queda pendiente la bandeja real `conciliaciones`.

### 2. Copy residual en Importador

En `core/importa.js`, cambiar el texto de `KINDS['estados-cuenta'].desc`.

Ahora todavía dice:

```txt
permite aplicar pagos por póliza
```

Debe decir algo como:

```txt
propone pagos para validación por póliza
```

No debe sonar a aplicación directa.

### 3. Copy residual en planilla de comisión

En `planillaFlujo()`, cambiar el estado:

```txt
Pendiente de aplicar
```

por:

```txt
Propuesta pendiente
```

o

```txt
Pendiente de validación
```

La regla es: planilla/importador muestran propuestas, no pagos aplicados.

### 4. Documentar la limitación de `conciliacionPropuesta`

En documentación, decir claramente:

```txt
En este prototipo, la conciliación se refleja como conciliacionPropuesta en el cobro para visualización; la persistencia real en colección/bandeja conciliaciones queda para backend ChatGPT/Codex.
```

No intentes implementar backend real ni colección Firestore. Solo deja la UI/prototipo coherente.

## No tocar backend protegido

No modificar ni incluir cambios en:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-* backend/preflight/manifest/score/dryrun/conciliaciones/pipeline/diff
```

## Entrega esperada

Devuelve ZIP completo `orbit360-platform/` con:

1. lista exacta de archivos modificados;
2. confirmación de 0 errores JS;
3. confirmación de no backend protegido;
4. confirmación de docs actualizadas: README, CHANGELOG, PENDIENTES, SMOKE, BITACORA;
5. confirmación de copy residual corregido en estados-cuenta y planilla;
6. pendientes honestos sin declararlos cerrados si no lo están.

## Regla final

No cambies diseño, no cambies módulos no relacionados y no reabras problemas ya cerrados. Este cierre debe ser documental + copy residual, no una reconstrucción.
