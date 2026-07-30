# REGLA RECTORA — FUENTES OPERATIVAS VIGENTES BAJO DEMANDA

Fecha: 2026-07-30  
Proyecto: Orbit 360 / A&S  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Decisión de Paula

Las fuentes operativas disponibles actualmente en el proyecto para etapas posteriores a Clientes/Aseguradoras **no deben asumirse vigentes para una migración real**.

Antes de utilizar datos reales de cada módulo pendiente, el asistente debe pedir a Paula el archivo o corte actualizado correspondiente. Paula entregará la información vigente hasta ese momento, incluyendo los registros nuevos incorporados desde los cortes anteriores.

Esta regla aplica especialmente a:

- `polizas`;
- `vehiculos` cuando dependan de pólizas o de una fuente actualizada;
- `cobros_realizados`;
- estados/planillas relacionados con cobros y comisiones;
- `planilla_aseguradora`;
- `planilla_comisiones`;
- `estado_cuenta_bancario` cuando llegue la etapa de conciliación;
- `financiero_historico` cuando llegue su bloque;
- `siniestros`;
- `documentos_soporte` cuando correspondan a la migración vigente.

Clientes y Aseguradoras ya cerrados no se reimportan por esta regla salvo decisión explícita o una fuente nueva que cambie materialmente su contrato.

## 2. Efecto inmediato sobre Pólizas

Los archivos antiguos de producción/movimientos y los análisis derivados de ellos son **evidencia histórica o de diseño**, no fuente oficial vigente de pólizas.

Queda prohibido:

- importar pólizas reales desde una fuente antigua sin pedir el corte vigente;
- convertir registros de producción inferidos en pólizas oficiales;
- crear cartera/cobros a partir de esos registros;
- completar silenciosamente pólizas nuevas faltantes usando documentos anteriores;
- asumir que el último archivo conocido sigue siendo el corte actual.

Estado del bloque:

`POLIZAS_ESTRUCTURA_ESTÁTICA_OK / FUENTE_REAL_VIGENTE_PENDIENTE_DE_PAULA`

Mientras no se necesite el dataset real, sí se permite continuar sin autorización adicional con:

- owner y contratos;
- esquema/aliases;
- normalización genérica;
- reglas de dominio;
- pruebas sintéticas/ficticias;
- validadores;
- harness transversal;
- diseño del dry-run/diff;
- documentación y Academia.

En el momento exacto en que el siguiente paso requiera filas reales para dry-run, diff o escritura, se debe pedir a Paula **la fuente de pólizas actualizada al corte vigente** y detener cualquier uso del archivo antiguo como fuente de migración.

## 3. Patrón obligatorio para módulos posteriores

Para cada módulo:

`preparación estática/reusable → confirmar necesidad de datos → pedir corte vigente a Paula → validar fuente → dry-run/diff → reglas de dominio → única persistencia autorizada → revalidación → smoke transversal`

No pedir archivos antes de que sean necesarios. No ejecutar una importación real con archivos viejos solo para adelantar.

## 4. Reuso transversal

Se conserva la arquitectura reusable cerrada en M6:

- Auth/membership/multirol/scopes;
- `Orbit.store` + write guard;
- manifiesto y aliases;
- readiness;
- smoke multirol/multivista;
- integridad before/after;
- cero escrituras en etapas read-only;
- rollback fail-closed;
- `STOP_RETRY`;
- request inmutable;
- gate único por cierre.

Cada fuente nueva solo agrega contrato, normalización y reglas propias del dominio.

## 5. Trazabilidad y seguridad

Toda fuente vigente debe conservar trazabilidad de archivo/hoja/fila/bloque/país/moneda/periodo. No se mezclan fuentes ni se infieren datos operativos desde financiero histórico o banco.

Reglas permanentes:

- GT → GTQ;
- CO → COP;
- falta país/moneda confiable → `REQUIERE_VALIDACION`;
- solo `Vigente` / `Por renovar` genera recibos/cartera;
- otros estados permanecen histórico;
- prima separada en neta, gastos, IVA/impuestos y total;
- producción, metas y comisiones sobre prima neta recaudada;
- cobros/recaudos no son `finmovs`.

## 6. Impacto Claude / Academia

- Metodología reusable: `REPLICABLE_CLAUDE_ACUMULADO`.
- Academia: `ACADEMIA_ACTUALIZAR` con el principio “fuente disponible ≠ fuente vigente autorizada”.
- Datos reales A&S: `TENANT_AYS_ONLY` / `SECRETO_DATO_REAL` según aplique.
- Backend/Rules/secrets: `BACKEND_PROTEGIDO_NO_CLAUDE`.
