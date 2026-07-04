# Bitácora backend A&S — Adelanto parser y protecciones

Fecha: 2026-07-04
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5
Estado: RESUELTO como documentación/protección; implementación parser pendiente.

## Necesidad

Mientras Claude corrige el candidato frontend, se puede avanzar backend en tareas seguras que no dependan del nuevo ZIP.

## Cambios aplicados

### Protección de artefactos locales

Archivo actualizado:

- .gitignore

Se agregaron exclusiones para:

- previews de overlay;
- manifiestos privados;
- fuentes privadas;
- payloads privados;
- reportes privados;
- archivos `.private`, `.payload` y manifiestos locales/privados.

### Plan de parser por fuentes separadas

Archivo agregado:

- orbit360-platform/docs/PLAN-IMPLEMENTACION-PARSER-FUENTES-SEPARADAS-AYS-20260704.md

Define:

- adaptadores Excel, CSV, PDF/OCR, Word e imagen;
- tipos de fuente autorizados;
- contrato técnico de procesamiento;
- reglas por fuente;
- estados de salida;
- reporte dry-run obligatorio;
- pendientes de implementación.

## Impacto

Reduce riesgo de subir datos reales o artefactos temporales al repo y deja lista la arquitectura del parser backend que permitirá migrar A&S y futuros clientes sin hardcodear datos.

## Restricciones cumplidas

No deploy. No merge. No main. No carga LAB. No datos reales. No modificación de backend protegido. No empalme de candidato Claude.
