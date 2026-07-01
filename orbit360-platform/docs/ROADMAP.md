# Roadmap de productización

Alineado con el documento maestro (sección 14). Esta base cubre el **MVP comercial navegable**; lo siguiente lo lleva a producción vendible.

## Dónde estamos

✅ **MVP comercial navegable (esta entrega)**
- Arquitectura modular limpia (un archivo por módulo).
- Los 22 módulos presentes; core a fidelidad completa, resto funcional.
- Multi-proyecto e IA-adaptable (3 proyectos de ejemplo, rubros distintos).
- White-label por configuración.
- Dos perfiles: consola Admin + portal Shopper.
- Soporte IA con asistente real (cuando hay API disponible) + respaldo guionado.
- Datos ficticios, sin marca ni datos de T&A.

## Oleadas de profundización (producto)

### Oleada A — profundizar módulos
- Postulaciones: reasignación, standby/liberar, historial completo.
- Liquidaciones/Lotes: cálculo real por reglas de proyecto, exportación.
- Certificación: banco de preguntas editable, intentos, scoring real.
- Cuestionarios: editor de preguntas y lógica por escenario.
- Reportes: exportación a Excel/PDF real (ya hay XLSX en el stack T&A).

### Oleada B — backend y seguridad (hardening) · ver SECURITY.md
- Firebase Auth + 4 roles validados en backend.
- Multi-tenant con reglas por `tenantId`.
- Ambientes dev/staging/prod aislados + backups.
- Adapter de datos (mock → Firebase) sin tocar módulos.

### Oleada C — integraciones
- HR (Google Sheets) como fuente operativa.
- WhatsApp (aprobaciones, recordatorios).
- Exportación BI / CRM / SSO (enterprise).

### Oleada D — comercial
- Onboarding de tenant guiado (crear cliente en minutos).
- Planes y límites (visitas/mes, shoppers activos, países, proyectos).
- Panel de facturación y uso.

## Fases (horizonte del documento maestro)

| Fase | Horizonte | Objetivo | Entregable |
|---|---|---|---|
| 0 · Decisión | 1–2 sem | Marca, alcance MVP, propiedad | Acta, nombre, paquete piloto |
| 1 · Hardening | 2–4 sem | Base segura para demo/piloto | Auth, reglas, datos demo aislados |
| 2 · Producto piloto | 4–8 sem | Core vendible + demo limpia | **Esta base** + manuales admin/shopper |
| 3 · Pilotos | 8–12 sem | Validar con 1–2 clientes | Contrato piloto, métricas de ahorro |
| 4 · Comercialización | 3–6 m | Escalar ventas | Web, deck, pricing, soporte, CRM |

## Métricas de éxito del piloto
- Horas de coordinación por visita (antes/después).
- Visitas asignadas sin duplicidad.
- Cumplimiento de fecha/rango.
- Tiempo de respuesta a reprogramaciones.
- Reclamos de pago de shoppers.
- Horas de preparación de reportes.

## Decisión recomendada sobre T&A
Congelar el monolito actual para operación en vivo; **no** invertir en refactors grandes sobre él. Construir hacia adelante en esta base y migrar T&A como **tenant #1** cuando el core + hardening estén listos. Así se rompe el bucle de correcciones.
