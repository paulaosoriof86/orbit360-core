# Cierre dry-run Clientes Siga CRM — baseline no repetir

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Cerrar formalmente la desalineación documental que todavía describía el dry-run de Clientes como pendiente, aunque el análisis, cruce y reporte sanitizado ya fueron ejecutados.

Este documento convierte el resultado aceptado en baseline vivo. No autoriza escritura real y no contiene payload ni datos personales.

## Fuente real controlada

`Contratantes Datos de Contacto 2026-07-08.xlsx`

La fuente real permanece fuera del repo. En GitHub solo se conservan reglas, conteos sanitizados, contratos, motores reutilizables, tests y documentación.

## Resultado sanitizado aceptado

| Resultado | Cantidad |
|---|---:|
| Registros evaluados | 440 |
| Crear | 414 |
| Actualizar | 0 |
| Omitir | 0 |
| Requiere validación | 26 |
| Persona natural | 417 |
| Persona jurídica | 23 |

## Distribución de asesor normalizada

| Asesor | Registros |
|---|---:|
| Paula | 400 |
| Fernando | 23 |
| Carlos | 8 |
| Johanna | 7 |
| Braulio | 1 |
| Nicole | 1 |
| Samuel | 0 |

Samuel permanece como asesor activo aunque esta fuente no tenga registros asignados.

## Alertas de calidad aceptadas

| Alerta | Cantidad |
|---|---:|
| PENDIENTE_POLIZAS | 440 |
| CONTACTO_PRINCIPAL_INCOMPLETO | 437 |
| FALTA_DOCUMENTO | 425 |
| FALTA_CORREO | 413 |
| FALTA_CIUDAD | 189 |
| FALTA_WHATSAPP | 173 |
| FALTA_DEPARTAMENTO | 171 |
| FALTA_CONTACTO_TELEFONICO | 168 |
| ASESOR_ASIGNADO_TEMPORALMENTE | 30 |
| FALTA_ASESOR_REAL_CONFIRMADO | 30 |
| DUPLICADO_EXACTO | 16 |
| DUPLICADO_PROBABLE | 10 |

## Reglas cerradas

- `C.O` se normaliza al asesor configurado para Paula en el tenant A&S.
- Vendedor vacío usa asesor temporal configurado y genera alertas de validación.
- Grupos y SubGrupos se omiten.
- Folio Cliente no se importa ni se utiliza como identidad canónica.
- Duplicado exacto puede proponerse para consolidación controlada.
- Duplicado probable nunca se fusiona automáticamente.
- Geo incompleta alimenta calidad y no bloquea por sí sola.
- Estado inicial de esta fuente fue `pendiente_polizas` antes de aplicar el cruce ya trabajado.
- El estado operativo final depende del modelo y cruce de pólizas ya realizado; no se vuelve a construir el modelo de pólizas.
- Asesores no pueden borrar, fusionar, reasignar ni modificar información operativa protegida.

## Regla estricta de no repetición

No volver a:

- perfilar desde cero los 440 registros;
- recalcular 414/0/0/26 sin cambio de fuente o regla;
- volver a preguntar reglas ya respondidas;
- tratar el cruce clientes–pólizas como no realizado;
- reconstruir pólizas, recibos, cobros, cartera o comisiones;
- subir payload real al repositorio;
- escribir datos reales sin autorización y gates.

Solo se reabre este baseline ante:

1. nueva versión de la fuente;
2. cambio explícito de regla aprobado por Paula;
3. fallo reproducible de motor/test;
4. contradicción documentada con otra fuente primaria.

## Implementación técnica vinculada

- `core/importa-clientes-p0.js`
- `core/importa-clientes-p0-wire.js`
- `modules/importar.js`
- `core/importa-dryrun-p0.js`
- `core/importa-dryrun-p0-wire.js`
- `core/importa-write-p0.js`
- `tools/orbit360-test-importa-clientes-p0.mjs`
- `tools/orbit360-test-importa-clientes-p0-wire.mjs`
- `.github/workflows/orbit360-p0-smoke.yml`

## Estado por carril

### Carril A — Claude/prototipo/UX

Pendiente visual, sin rehacer reglas:

- bandeja crear/actualizar/omitir/requiere validación;
- vista de duplicados exactos y probables;
- calidad por asesor;
- gestiones de corrección;
- estado derivado del cruce en Cliente360;
- permisos por rol/scope;
- copy honesto de dry-run y escritura bloqueada.

### Carril B — Backend/importadores

- motor Clientes P0: implementado;
- wire Clientes P0: implementado;
- hub transversal: conectado;
- CI: cobertura agregada, resultado visible pendiente;
- escritura real: bloqueada.

### Carril C — Datos reales/migración

- fuente perfilada: cerrado;
- dry-run sanitizado: cerrado;
- reglas aceptadas: cerrado;
- payload real en repo: no;
- escritura real: no autorizada.

## Impacto Academia

Academia debe enseñar:

- interpretación del resumen crear/actualizar/omitir/requiere validación;
- diferencia entre duplicado exacto y probable;
- calidad de datos por asesor;
- asesor temporal y corrección;
- estado operativo derivado de pólizas;
- scopes y acciones prohibidas;
- dry-run no equivale a escritura;
- trazabilidad y confirmación reforzada.

## Condición de cierre técnico restante

El bloque queda cerrado documentalmente. Para cierre técnico controlado faltan exclusivamente:

- CI/smoke del motor, wire y hub;
- smoke visual del importador y Cliente360;
- validación de permisos/scopes;
- ninguna de estas actividades autoriza escritura real.

## Siguiente bloque del plan

Aseguradoras operativas:

- usar el directorio ya procesado;
- no reprocesar fuentes;
- validar módulo, contactos, países, monedas y referencias seguras;
- preparar integración con Cotizador/Comparativo;
- documentar Claude y Academia acumulativamente.
