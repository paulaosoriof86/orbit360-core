# Bitácora backend A&S — Auditoría candidato Claude

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** auditoría forense de candidato frontend/prototipo  
**Estado:** RESUELTO como auditoría; ABIERTO para corrección por Claude.

## Entrada

- **Módulo / área:** Empalme frontend Claude + backend ChatGPT/Codex.
- **Síntoma/necesidad:** Paula compartió un nuevo candidato de prototipo para auditarlo completo antes de empalmarlo con backend.
- **Esperado:** identificar mejoras, pendientes, riesgos de empalme y actualizar paquete de Claude.
- **Causa raíz:** el flujo de trabajo separa candidato Claude/frontend y backend LAB protegido; se requiere auditoría para no pisar backend ni repetir errores de alcance.
- **Archivo/función:** candidato `Prototype Development Request - 2026-07-03T202245.322.zip` auditado localmente.
- **Fix/mejora aplicada:** se generó auditoría, paquete actualizado para Claude y documento de control en `docs/AUDITORIA-CANDIDATO-CLAUDE-20260703-202245.md`.
- **Impacto en prototipo comercializable:** aplica al prototipo base. Los hallazgos son reglas de importador, finanzas, UI limpia y empalme seguro.
- **Estado:** RESUELTO documentalmente / PENDIENTE CORRECCIÓN CLAUDE.

## Validación realizada

- Inventario completo del ZIP.
- Sintaxis JS con `node --check`: 53 archivos, 0 errores.
- Validador técnico Marketing/Integraciones: OK.
- 30 módulos presentes.
- 20 core presentes.
- Sin escritura operativa directa al almacenamiento local desde módulos.

## P0 documentados

1. No empalmar por reemplazo; el candidato trae capa demo de datos y no los archivos backend LAB protegidos.
2. El importador financiero histórico debe conservar hoja, país, periodo, moneda, bloque y fila.
3. El importador no debe asumir GT si no reconoce país.
4. Pólizas sin país/moneda/estado explícito no deben generar cartera.

## P1 documentados

1. Separar cobros/recaudo de movimientos financieros.
2. Excluir hojas soporte antes de mapear movimientos históricos.
3. Corregir alcance documental de documentos.
4. Separar prima neta de prima total.
5. Ocultar textos técnicos de la UI cliente.

## Paquete actualizado

Se generó paquete descargable local para Claude con:

- auditoría forense;
- pendientes actualizados;
- prompt maestro;
- reglas de empalme backend;
- checklist visual;
- inventario;
- hallazgos CSV;
- manifest.

## Restricciones cumplidas

- No deploy.
- No merge.
- No main.
- No Firestore.
- No carga LAB.
- No datos reales en repo.
- No modificación de backend LAB protegido.
