# Handoff de continuidad post M5 — Orbit 360 A&S v1330

Fecha: 2026-07-07
Repositorio: `paulaosoriof86/orbit360-core`
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Propósito

Cerrar esta conversación con continuidad clara, evitando pérdida de contexto, metodología, reglas de migración o estado real del repo.

## Estado PR

- PR #5 sigue abierto.
- Sigue en draft.
- No merge.
- No deploy.
- No producción.
- No datos reales en código.
- No secretos.

## Documentos maestros que siempre deben leerse primero

1. `DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md`
2. `ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md`
3. `ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md`

## Bloques funcionales aplicados en esta etapa

### Cobros lote

Estado: aplicado funcionalmente.

Resultado:

- el lote prepara recordatorios;
- no afirma envío real;
- WhatsApp/correo requieren canal conectado;
- actividad queda como recordatorio preparado.

### Aseguradoras

Estado: aplicado funcionalmente.

Resultado:

- no permite borrar aseguradora con vínculos;
- ofrece desactivar como alternativa segura;
- borrar sin vínculos exige motivo;
- portales no guardan credenciales reales en frontend.

### Siniestros

Estado: aplicado funcionalmente.

Resultado:

- estados finales `Aprobado`, `Pagado`, `Rechazado` exigen motivo;
- se registra bitácora;
- si falta monto aprobado queda pendiente;
- gestiones se cierran solo para Pagado/Rechazado.

### Cancelaciones

Estado: aplicado funcionalmente.

Resultado:

- `Recuperada` y `No recuperable` requieren motivo/nota;
- evita duplicar oportunidades;
- evita duplicar gestiones;
- no reactiva pólizas automáticamente;
- reemisión queda preparada en Ops.

## Bloques documentados/preparados

### Importador por fuentes separadas

Estado: auditado y documentado.

Documento:

- `AUDITORIA-RUTA-MINIMA-IMPORTADOR-FUENTES-SEPARADAS-V1330-20260707.md`

Conclusión:

- `core/importa.js` ya tiene base robusta: dry-run, scope guard, reporte, trazabilidad, documentos como parches pendientes, banco como conciliación pendiente, financiero histórico separado.

### M2 Calendario Marketing

Estado: ensayo definido.

Documento:

- `ENSAYO-M2-CALENDARIO-MARKETING-FUENTE-REAL-V1330-20260707.md`

Regla:

- fuente de bajo riesgo;
- escribe/proporciona solo contenidos;
- no publica, no pauta, no envía.

### M3 Directorios Aseguradoras GT/CO

Estado: ensayo definido.

Documento:

- `ENSAYO-M3-DIRECTORIOS-ASEGURADORAS-GT-CO-V1330-20260707.md`

Regla:

- solo aseguradoras/directorio;
- no clientes;
- no pólizas;
- no cobros;
- no credenciales reales.

### M4 Financiero Histórico GT/CO

Estado: ensayo definido.

Documento:

- `ENSAYO-M4-FINANCIERO-HISTORICO-GT-CO-V1330.md`

Regla:

- solo `finmovs`;
- no cartera;
- no producción;
- no cobros;
- país/moneda separados;
- saldos como referencia.

### M5 Conciliación sensible

Estado: reglas y orden definidos.

Documento:

- `ENSAYO-M5-CONCILIACION-SENSIBLE-COBROS-PLANILLAS-BANCO-V1330-20260707.md`

Regla:

- reportado no es pagado;
- banco no crea cobros;
- planilla comisión no crea clientes/pólizas;
- aplicación final requiere gate;
- junio/julio requieren cruce de fuentes.

### Check único de validación local

Estado: definido.

Documento:

- `CHECK-UNICO-VALIDACION-LOCAL-V1330-20260707.md`

Debe validar:

- `modules/cobros.js`
- `modules/aseguradoras.js`
- `modules/siniestros.js`
- `modules/cancelaciones.js`
- `modules/importar.js`
- `core/importa.js`
- validador backend LAB.

### Equipo + Configuración gates

Estado: pendiente funcional; paquete corto preparado.

Documento:

- `PAQUETE-CORTO-CODEX-LOCAL-EQUIPO-CONFIG-GATES-V1330-20260707.md`

Regla:

- no seguir forzando desde conector GitHub;
- aplicar por Codex o entorno local seguro;
- no PowerShell largo pegado;
- no tocar backend protegido.

## Pendientes críticos

1. Ejecutar check único de validación local.
2. Cerrar Equipo gates por Codex/local.
3. Cerrar Configuración gates por Codex/local.
4. Ejecutar smoke M2 calendario.
5. Ejecutar smoke M3 directorios.
6. Ejecutar smoke M4 financiero histórico.
7. Solo después iniciar M5 sensible.

## Pendientes no críticos pero importantes

- Preparar paquete Claude cuando toque UX/Academia.
- Actualizar Academia con todos los patrones nuevos.
- Mejorar visual calendario/marketing.
- Mejorar fichas de aseguradoras con separación directorio/vinculada.
- Preparar demo comercializable después de estabilidad.

## Reglas que no deben perderse

- A&S es primer tenant, no fork.
- Personalización por configuración, no hardcode.
- No mezclar GTQ/COP.
- Producción/metas/comisiones sobre prima neta recaudada confirmada.
- Cobros no son `finmovs`.
- Banco no aplica pagos por sí solo.
- Documentos soporte proponen diff, no actualizan directo.
- Planillas de comisión se leen desde filas reales.
- Si falta país/moneda confiable: `REQUIERE_VALIDACION`.
- No afirmar integraciones activas sin conexión real.
- No mostrar textos técnicos en UI cliente.
- No tocar backend protegido sin confirmar rama.

## Próxima conversación recomendada

Iniciar con este objetivo:

```txt
Ejecutar continuidad post M5: validar cambios funcionales ya aplicados y preparar cierre Equipo/Configuración por Codex/local.
```

## Prompt de continuidad recomendado

```txt
Estamos continuando Orbit 360 A&S. Antes de actuar lee primero los documentos maestros: DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md, ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md y ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md.

Repo correcto: paulaosoriof86/orbit360-core.
Carpeta: orbit360-platform/.
Rama obligatoria: ays/backend-tenant-lab-v99-20260703.
PR vigente: #5 draft/open, sin merge, sin deploy, sin main.

No tocar backend protegido: data/store.js, data/store-firestore-lab.local.js, core/backend-lab-loader.js, core/backend-lab-init.js, core/backend-lab-security-guard.js, core/auth.js, core/importa.js, firestore.rules, tools/orbit360-* ni index.html salvo instrucción explícita y validación.

Estado funcional cerrado: Cobros lote honesto, Aseguradoras borrar/desactivar seguro, Siniestros estados finales con motivo, Cancelaciones anti-duplicado.

Estado documentado/preparado: importador por fuentes separadas, M2 calendario marketing, M3 directorios aseguradoras GT/CO, M4 financiero histórico GT/CO, M5 conciliación sensible, check único de validación local, paquete corto Codex/local Equipo+Configuración.

Pendiente crítico: ejecutar check único de validación local; cerrar Equipo gates y Configuración gates por Codex/local; después ejecutar smoke M2, M3, M4; M5 solo después.

No cargar datos reales. No subir Excel reales al repo. No hardcodear A&S. No afirmar integración activa si solo está preparada. No mezclar monedas. No inferir clientes/pólizas desde movimientos financieros. No aplicar pagos desde banco sin conciliación. Documentar todo cambio y todo pendiente con impacto Claude/prototipo y Academia.

Continúa por bloques grandes pero seguros, con mínima carga manual para Paula. Primero verifica estado PR/head y documentos recientes. Luego decide si conviene validar local, preparar Codex/local Equipo+Configuración o continuar documentación de migración. Si la conversación se alarga, vuelve a entregar prompt completo de continuidad.
```

## Estado

Handoff creado.
No se tocó código funcional.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
