# REGISTRO CONTROL MAESTRO — P0.5 FUENTES DOCUMENTALES Y DIFF

Fecha: 2026-07-10  
Documento padre: `CONTROL-MAESTRO-ACUMULADO-CLAUDE-BACKEND-UX-ACADEMIA-ORBIT360-AYS-20260709.md`.

## Fila acumulada

```txt
Fecha: 2026-07-10
Carril: B, preparando A y C
Módulo/regla: Aseguradoras — wire metadata-only, extracción propuesta, evidencia y diff
Cambio backend/local: contratos P0.5, smokes, CI y documentación
Patrón reusable: referencia → inventario → propuesta → diff → decisión → segundo gate
¿Aplica a Claude/prototipo?: Sí
UX requerida: inventario, evidencia, diff, conflictos, versionado y habilitación separada
Academia requerida: Operativo/Admin/Dirección/Asesor
Manual/operación requerida: procedimiento de carga, validación y habilitación
Archivos fuente: core/document-source-wire-p05.js; core/extraction-proposal-p05.js
Estado backend: IMPLEMENTADO_BACKEND / CI_VISIBLE_PENDIENTE
Estado prototipo: PENDIENTE_PROTOTIPO
Estado Academia: DOCUMENTADO / PENDIENTE_IMPLEMENTACION
Estado enviado a Claude: NO_ENVIADO
Condición de cierre: primer archivo real sanitizado + inventario + diff + validación + smoke visible
```

## Avance visible

- Wire con rol activo.
- Auditoría metadata-only.
- Dry-run para `documentos` y `aseguradoras.docs[]`.
- Versionado por hash/combinación.
- Fingerprint de concurrencia.
- Propuestas con evidencia.
- Diff y conflictos.
- Confirmar/corregir/rechazar.
- Estado `validado_pendiente_habilitacion`.
- Segundo gate para Cotizador/Comparativo.

## Carril C obligatorio siguiente

No continuar agregando contratos abstractos después de P0.5 sin una fuente real.

Siguiente fuente requerida:

```txt
Un cotizador Excel completo y representativo de Autos,
preferiblemente Banrural o BAM,
con hojas de entrada, tarifas/cálculo y salida/impresión.
```

Motivo:

- prueba simultáneamente cálculo, catálogos, hojas ocultas, impresión y presentación;
- evita iniciar con Aseguradora Guatemalteca, cuyo archivo de tasas no prueba hoja de salida;
- permite comparar después con Bantrab Autos/Motos y Gastos Médicos;
- permite ajustar el parser con evidencia real antes del adapter PDF.

## Pendientes documentados

1. CI visible.
2. Provider/wire real desde Drive.
3. Primer inventario sanitizado.
4. Primer reporte semántico con hoja/rango.
5. Ajustes del parser basados en evidencia.
6. Soporte `.xls/.xlsb`.
7. Adapter PDF.
8. UX Claude.
9. Gate de habilitación.
10. Integración posterior con Cotizador y Comparativo.

## Regla anti-desviación

CRM/Clientes permanece cerrado como baseline. Aseguradoras continúa como bloque activo. Cotizador y Comparativo no comienzan hasta que el flujo de fuente real esté validado.
