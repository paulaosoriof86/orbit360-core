# Pendientes Claude post reauditoría — Orbit 360 A&S — 2026-07-04T072304

Estado: abiertos antes de nuevo empalme.

## P0 obligatorios

1. **Trazabilidad real:** copiar `_origenHoja`, `_paisHoja`, `_monedaHoja`, `_periodoHoja`, `_bloqueOrigen`, `_numeroFila` desde cada fila hacia `rec` antes de build/dry-run/conciliación/importación.
2. **País/moneda:** eliminar autocompletado `monedaDe(pais)` como valor autorizado. Usarlo solo como `monedaSugerida`; si no hay moneda explícita, marcar `REQUIERE_VALIDACION`.
3. **Planillas de comisión:** implementar contrato real de filas de comisión con aseguradora, periodo, póliza/recibo si existe, prima neta, comisión esperada, comisión pagada, moneda, país, asesor y estado de conciliación. No simular tarifas ni actualizar tarifarios sin validación/diff.
4. **Documentos soporte:** no actualizar `clientes` directo. Crear `documentos`/`parchesPendientes` y pedir confirmación explícita con diff.

## P1 obligatorios

5. Reemplazar fechas fijas operativas por `Orbit.ui.today()`, tenant config o seed demo aislado.
6. Ocultar textos técnicos de UI cliente: backend, LAB, demo, localStorage, Firebase, Firestore, smoke, mock, simulación técnica.
7. Financiero histórico: bloquear conceptos que parezcan cobros/recaudos de clientes y mandarlos a conciliación/validación.
8. Reporte/smoke: actualizar reporte con navegación real clic por clic y evidenciar qué no pudo verificarse.

## P2 recomendados

9. Separar UI cliente de UI superadmin técnico.
10. Documentar qué mejoras aplican al prototipo base comercializable.
11. Mantener versión, changelog y bitácoras sincronizados.

## Instrucción a Claude

No basta actualizar documentación. Debe corregir archivos reales y entregar ZIP completo empalmable sin tocar backend ChatGPT/Codex.