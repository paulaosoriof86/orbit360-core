# Implementación P0.9m — Preflight del primer flujo y gate de Claude

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft, sin merge ni deploy.

## 1. Carril actual

Carriles B + C, con traducción acumulativa al Carril A.

## 2. Necesidad

P0.9l dejó implementado el host same-origin y el formulario documental, pero aún era fácil confundir:

- host implementado;
- referencia real localizada;
- lectura training ejecutada;
- preview visual desde la plataforma;
- historial visible después de recarga;
- smoke visual aprobado;
- momento correcto para pedir nueva candidata a Claude.

P0.9m crea una verificación reproducible y un reporte sanitizado que separa esos niveles.

## 3. Runner técnico

Archivos:

```txt
tools/orbit360-run-aseguradoras-first-flow-p09m.mjs
tools/orbit360-run-aseguradoras-first-flow-p09m-cli.mjs
```

Flujo:

```txt
validar rama y árbol limpio
→ validar catálogo y raíz privada
→ iniciar host P0.9l en loopback
→ obtener sesión HttpOnly
→ servir index transformado en memoria
→ consultar estado same-origin
→ resolver solo la fuente AseGuate
→ ejecutar excel_manifest en training
→ resumir estructura sin valores
→ detener host
→ escribir reporte privado sanitizado
```

El runner nunca:

- modifica `index.html`;
- persiste manifiestos o conocimiento;
- guarda referencias;
- expone rutas;
- incorpora tasas o valores de celdas al reporte;
- habilita Cotizador o Comparativo.

## 4. Fuente inicial

Documento esperado:

```txt
ays_aseguate_tarifario_2026_v1
```

Aseguradora:

```txt
ins_gt_aseguradora_guatemalteca
```

La referencia opaca se usa solo dentro de la ejecución y se elimina del reporte.

## 5. Reportes

Se generan dentro de:

```txt
_orbit360_private_reports/
```

Formatos:

```txt
P09M-FIRST-FLOW-<fecha>.json
P09M-FIRST-FLOW-<fecha>.md
```

El JSON sirve como continuidad automática y el Markdown como resumen legible.

Contienen únicamente:

- rama y HEAD;
- documento lógico;
- estado de host/sesión/index;
- disponibilidad de fuente;
- estado de lectura;
- conteos de hojas, páginas, hechos, grupos y advertencias;
- flags de seguridad;
- gate Claude.

No contienen:

- rutas;
- referencias;
- nombre de carpeta privada;
- texto completo del archivo;
- tasas;
- primas;
- PII;
- credenciales;
- secretos.

## 6. Gate Claude

Estados:

```txt
approved
pending
blocked
```

Criterios técnicos:

1. host same-origin;
2. sesión segura;
3. index transformado sin cambio en disco;
4. fuente AseGuate localizada;
5. lectura training sanitizada;
6. cero escritura;
7. cero habilitación.

Criterios que requieren runtime/navegador real:

8. preview desde el formulario;
9. Auth y rol activo confirmados;
10. historial visible después de recarga;
11. read model estable;
12. smoke visual/responsive;
13. frontera visible Aseguradoras/Cotizador/Comparativo.

Claude solo puede solicitarse cuando todos estén `approved`.

## 7. Comando Windows

Archivo:

```txt
tools/orbit360-ejecutar-primer-flujo-aseguradoras-p09m.ps1
```

El wrapper:

- valida la rama obligatoria;
- bloquea si existen cambios locales;
- valida configuración Firebase LAB;
- localiza una carpeta privada autorizada dentro del repo;
- no busca en Descargas o Escritorio;
- ejecuta únicamente AseGuate;
- abre el reporte Markdown;
- copia el resultado al portapapeles;
- no hace commit, push o deploy.

## 8. CI

Workflow:

```txt
.github/workflows/orbit360-aseguradoras-first-flow-p09m-smoke.yml
```

Utiliza un Excel ficticio y comprueba:

- sintaxis;
- host y sesión;
- referencia disponible;
- lectura training;
- reporte sin rutas o referencias;
- Claude gate honesto;
- `index.html` intacto;
- backend protegido.

## 9. Hallazgos y decisiones

### 9.1 Árbol limpio

Necesidad: impedir que el reporte se ejecute sobre modificaciones locales inciertas.  
Fix: el runner bloquea `WORKTREE_NOT_CLEAN`.  
Impacto: no descarta ni pisa trabajo local.

### 9.2 Reportes privados

Las carpetas `_orbit360_private_sources/` y `_orbit360_private_reports/` ya están en `.gitignore`. El reporte no ensucia la rama.

### 9.3 Actor técnico

El preflight usa un actor técnico no personal:

```txt
orbit-p09m-preflight
```

Solo sirve para probar la frontera HTTP y el extractor. No sustituye la validación del usuario autenticado ni del rol activo en el navegador.

### 9.4 Resultado técnico no equivale a smoke visual

Aunque host, referencia y manifiesto resulten aprobados, el gate Claude permanece pendiente hasta completar el flujo visual, historial, recarga y read model.

## 10. Impacto por módulo

### Aseguradoras

Recibe una evidencia técnica reproducible antes de operar el lote completo.

### Cotizador/Comparativo

Permanecen deshabilitados. P0.9m no altera su configuración.

### Academia

Debe enseñar la diferencia entre:

```txt
preflight técnico
preview visual
lectura training
persistencia de historial
persistencia de conocimiento
habilitación
```

### Claude

Debe recibir el reporte P0.9m como evidencia y absorber el copy/flujo estable, pero no diseñar sobre estados todavía no comprobados.

## 11. Estado real

```txt
runner P0.9m: implementado
CLI portable: implementado
wrapper PowerShell: implementado
workflow: configurado
reporte real local AseGuate: no ejecutado todavía
preview visual: pendiente
historial tras recarga: pendiente
read model: pendiente
smoke visual: pendiente
Claude: todavía no
Cotizador: deshabilitado
Comparativo: deshabilitado
```

## 12. Siguiente acción

Continuar con P0.9n:

```txt
observador de runtime y reporte visual sanitizado
→ formulario real
→ preview AseGuate
→ lectura training
→ historial separado
→ recarga
→ read model
→ smoke visual
→ decisión inmediata sobre paquete Claude
```
