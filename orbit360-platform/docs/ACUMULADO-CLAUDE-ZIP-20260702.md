# ACUMULADO CLAUDE - ZIP 2026-07-02

Fecha: 2026-07-02
Archivo auditado: Prototype Development Request - 2026-07-02T082711.916.zip
Estado: auditado como mini-release. No instalar directo. Empalmar con backend protegido.

## Alcance

Este documento acumula lo que Claude alcanzo a corregir y lo que queda pendiente para reenviar en una proxima sesion de Claude.

Claude debe trabajar solo prototipo, UX, modulos, pantallas, textos, encoding, flujos clickeables, configuracion y calidad comercial. No debe tocar backend, Firestore, Auth, reglas ni contrato Orbit.store.

## Archivos cambiados frente al ZIP anterior v1.73

- core/ui.js
- data/seed.js
- docs/BITACORA-CAMBIOS.md
- index.html
- modules/finanzas.js
- modules/inicio.js
- modules/portal.js

No se detectaron archivos nuevos ni eliminados frente al ZIP anterior.

## Avances detectados

1. Encoding/mojibake: el ZIP nuevo viene limpio en auditoria de archivos. Pendiente validar visualmente despues del empalme.
2. Fechas vivas: core/ui.js y data/seed.js usan fecha real; seed sube a version 33.
3. Metas: inicio.js y finanzas.js eliminan literales duros y derivan metas desde datos/asesores.
4. Portal a Siniestros: portal.js crea registro en reclamos cuando la solicitud es Reclamo/Siniestro, genera reclamoId, crea gestion Ops y actividad Historial.
5. Badges tecnicos: hay soporte parcial con hideTechnicalBadges y toggle en Configuracion.

## Pendientes que siguen para Claude

1. Validar que Portal -> Siniestros -> Cliente 360 -> Historial -> Ops quede completo.
2. Confirmar que el reporte de siniestro aparece en modulo Siniestros y ficha Cliente 360.
3. Eliminar uso directo de localStorage en modules/configuracion.js para logo/configuracion visual.
4. Ocultar badges tecnicos por defecto en modo cliente/comercial.
5. Limpiar referencias ajenas de UI/demo: CXOrbia, Orbia, TyA, shopper, Mystery Shopping, CX/Mystery.
6. Validar que encoding siga limpio tras empalme.
7. Confirmar que Finanzas lee desde finmovs y no desde arreglos locales duros.
8. Profundizar Plantillas, Reportes, Automatizaciones, Aseguradoras y Marketing.

## Criterio de prueba para Siniestros

1. Entrar a Portal cliente demo.
2. Reportar Reclamo/Siniestro.
3. Verlo en Ops.
4. Verlo en Historial.
5. Verlo en modulo Siniestros.
6. Verlo en Cliente 360, ficha del cliente, seccion Siniestros.
7. Cambiar estado en Siniestros y verificar reflejo en Ops/Historial.
8. Cerrar gestion Ops sin borrar el siniestro.

## Reglas para futuro ZIP de Claude

- Tratar cada ZIP como mini-release.
- Auditar antes de instalar.
- Preservar backend protegido.
- Reinsertar hook LAB si aplica.
- Sanear localStorage directo en modulos.
- Sanear referencias ajenas.
- Ejecutar smoke y validacion visual.
- Documentar antes de commit/push.

## Estado

ABIERTO. Mantener acumulado para reenviar a Claude cuando recupere capacidad.