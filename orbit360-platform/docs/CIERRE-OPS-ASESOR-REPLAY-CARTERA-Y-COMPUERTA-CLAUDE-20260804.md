# Cierre — Ops del Asesor, replay de cartera y compuerta Claude

Fecha: 2026-08-04  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Bloque

```text
ADVISOR_OPS_OWN_SCOPE_SOURCE_IMPLEMENTED
ADVISOR_OPS_INBOX_BACKEND_SOURCE_IMPLEMENTED
COBROS_PORTFOLIO_REPLAY_EXECUTED
COMMISSION_AND_DIRECT_OVERLAY_PENDING
CLAUDE_PACKAGE_V2_INDEXED_NOT_YET_ZIPPED
```

## Carril A — frontend, UX y Academia

- Se retiró la exclusión histórica del Asesor en Ops.
- Ops filtra negocios y gestiones mediante `Orbit.access.canView(..., 'ops')`.
- El Asesor ve exclusivamente su operación: clientes, pólizas, cotizaciones, inspecciones, emisiones y gestiones propias.
- No recibe filtros globales, administración de listas ni acciones de creación global.
- La ficha se presenta como seguimiento protegido: estado, próxima acción, notas, resultado, checklist y bitácora.
- En sesión se muestra aviso inmediato al resolverse una gestión propia.
- Leads continúa como pipeline comercial; Ops concentra operación y gestiones no comerciales.

## Carril B — backend y seguridad

Se incorporó `functions/ops-advisor-inbox.js`:

- exige Auth y membership activa;
- usa tenant solicitado, nunca un tenant fijo;
- aplica scopes propios/equipo/todos/ninguno;
- default de Asesor/Comercial/Asistente = propios;
- devuelve solo gestiones, negocios y avisos autorizados;
- soporta rutas legacy compatibles y canónicas;
- no contiene personas, correos ni constantes A&S.

El backend de Ops/Leads ya crea event ledger, outbox y notificación durable del Portal al resolver una gestión. El inbox consulta el outbox correspondiente al asesor.

La activación sigue cerrada hasta gate y deploy autorizados.

## Carril C — Cobros y datos A&S

Se recuperó desde Drive el workbook privado canónico ya existente. No se solicitó reenvío.

Conteos verificados:

```text
1,261 recibos de calendario
641 obligaciones pendientes
365 pagos con etiqueta temporal “aún no conciliados”
211 recibos sin pendiente según aseguradora, fuera de esos 365
44 HOLD de estado
73 alertas de calidad
5 cobros ya materializados
```

Replay de la lógica de primera cuota pendiente, agrupando por póliza, vigencia y moneda:

```text
128 conciliaciones propuestas por secuencia de cartera
2 pagos válidos posteriores al corte del snapshot
235 pendientes de overlay adicional
128 + 2 + 235 = 365
```

Distribución de los 128:

| Fuente | Pagos | Pólizas |
|---|---:|---:|
| El Roble | 91 | 22 |
| AseGuate | 17 | 8 |
| La Ceiba | 12 | 4 |
| Universales | 7 | 3 |
| Mapfre | 1 | 1 |

Los 235 no constituyen la cifra final de no conciliados. Falta superponer planillas actuales y reportes directos, preservando los cinco cobros ya aplicados y evitando duplicidad.

Evidencia:

- `runtime-gate-crm-v20260716/cobros-replay-inferencial-sanitizado-v20260804.json`
- workbook local sanitizado generado para revisión humana.

## Claude

Se corrigió el proceso real:

```text
ChatGPT/Codex prepara el paquete descargable.
Paula lo descarga y lo entrega manualmente a Claude.
Claude devuelve una candidata frontend acumulativa.
ChatGPT/Codex audita y empalma selectivamente.
```

Se creó el índice V2, pero no se genera todavía el ZIP porque el conteo de Cobros cambiará al completar el overlay y aún falta un PASS automático de source.

Compuerta de entrega:

```text
A. PASS source Ops/Leads/Asesor.
B. Overlay completo cartera + planillas + reportes directos.
C. Manifiesto acumulativo sellado contra el mismo HEAD.
```

Después de A+B+C, el paquete se entrega inmediatamente a Paula, antes de esperar producción. Claude trabaja en paralelo con el gate y activación LAB.

## Pruebas y honestidad

Preparado:

- validator `tools/orbit360-validar-ops-advisor-y-cobros-source-v20260804.mjs`;
- workflow `.github/workflows/orbit360-ops-advisor-cobros-source-v20260804.yml`;
- fixtures para secuencia de planilla y cartera;
- evidencia real del replay de cartera.

No se afirma todavía:

- PASS del workflow;
- runtime multirol;
- entrega real del proveedor de notificaciones;
- overlay final de las planillas;
- materialización de los 128;
- deploy o visualización final.

## Integridad

```text
Firestore writes: 0
Auth writes: 0
Cobros aplicados: 0
Recibos modificados: 0
Deploy: 0
Producción: intacta
Main/merge: no
Datos privados en GitHub: 0
```

## Siguiente acción exacta

```text
1. Recuperar el paquete privado normalizado de planillas y reportes directos.
2. Cruzarlo contra los 235 sin duplicar los 128 ni los 5 cobros existentes.
3. Emitir conteo final, HOLD y ledger sanitizado.
4. Obtener PASS source Ops/Leads/Asesor/Cobros.
5. Sellar el manifiesto acumulativo.
6. Generar el paquete descargable para que Paula lo envíe a Claude.
7. Pasar inmediatamente a candidata runtime y visualización.
```
