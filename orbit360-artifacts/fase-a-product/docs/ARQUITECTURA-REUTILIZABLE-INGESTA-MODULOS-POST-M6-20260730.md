# Arquitectura reutilizable de incorporación de módulos después de M6

Fecha: 2026-07-30  
Proyecto: Orbit 360  
Rama: `ays/backend-tenant-lab-v99-20260703`

## Objetivo

Evitar que Pólizas, Vehículos, Recibos/cartera, Cobros/conciliación, Comisiones/planillas, Siniestros, Documentos y módulos posteriores repitan el acondicionamiento de M6. La infraestructura transversal se construye una vez y se reutiliza; cada módulo nuevo aporta únicamente su contrato de datos y reglas de negocio propias.

## Capa transversal ya reusable

1. **Tenant/Auth/membership:** identidad real, roles asignados, scopes y asesor vinculado; sin identidad demo.
2. **Orbit.store productivo:** read-only durante gates, sin fallback local y con write guard explícito.
3. **Manifiesto de colecciones:** solo fuentes canónicamente migradas y cubiertas por política; no se inventan colecciones para pasar un smoke.
4. **Alias lógico → físico:** las políticas pueden hablar en nombres conceptuales y el adaptador traduce al esquema canónico antes de consultar.
5. **Readiness de datos:** la aplicación espera todas las colecciones activas, no el primer snapshot.
6. **Readiness de Hosting:** propagación acotada y comprobada, sin inferir fallo por un GET inmediato.
7. **Readiness de navegador:** antes de probar un módulo se resuelven gates bloqueantes diferidos mediante ventana de llegada + ventana de quietud. Patrón: `arranque → gates bloqueantes → datos listos → viewport → interacción → resultado`.
8. **Smoke multirol/multivista:** Dirección desktop, Operativo tablet y Asesor móvil reutilizan el mismo harness.
9. **Integridad before/after:** conteos y digests deben permanecer estables cuando el gate es read-only.
10. **Cero escrituras:** monitoreo de write guard y candidatos de escritura de red.
11. **Rollback común:** Firestore fail-closed + Hosting neutro; Storage opcional permanece diferido si no existe.
12. **Control de causa raíz:** `FUNCTIONAL_DEFECT`, `VALIDATOR_STALE`, `DATA_CONTRACT_FAILURE`, `ENVIRONMENT_FAILURE`, `PIPELINE_MECHANISM_FAILURE`, `SECURITY_FAILURE`.
13. **STOP_RETRY:** un nuevo fallo no autoriza una cadena de recoveries; primero causa raíz y prueba estática reproducible.
14. **Trigger inmutable:** una autorización de riesgo crea un solo request y una sola ejecución.

## Regla de aceleración obligatoria

A partir de M6 queda prohibido crear para cada módulo una variante nueva de estas capas si la capacidad ya existe en el harness común. Un módulo solo puede añadir lógica transversal cuando existe una necesidad general demostrada; en ese caso la mejora se incorpora al owner reusable y se prueba sintéticamente antes de usarla en producción.

## Qué cambia realmente por módulo

| Módulo | Específico del dominio | Infraestructura que debe reutilizar |
|---|---|---|
| Pólizas | campos de póliza, estados, vigencias, periodicidades, renovabilidad, prima neta/gastos/impuestos/total, relaciones cliente/aseguradora | Auth/scopes, importador, manifiesto, aliases, readiness, smoke, integridad, rollback |
| Vehículos | identificación del vehículo y relación con póliza/cliente | misma capa transversal |
| Recibos / cartera | generación solo desde Vigente/Por renovar y periodicidad | misma capa transversal |
| Cobros / conciliación | fuente separada, conciliación obligatoria, banco no escribe cobros por inferencia | misma capa transversal |
| Comisiones / planillas | prima neta recaudada, liquidación y planillas por fuente | misma capa transversal |
| Siniestros | fuente y expediente propios, relaciones explícitas con cliente/póliza | misma capa transversal |
| Documentos | propuesta/diff/confirmación; nunca escritura silenciosa | misma capa transversal |
| Cotizador / Comparativo | conocimiento validado, gates de elegibilidad y fuentes autorizadas | misma capa transversal |

## Gates futuros

El gate de un módulo nuevo debe enfocarse en su contrato de dominio. No debe volver a demostrar desde cero que existen Auth, Hosting readiness, rollback, manejo de gates legales o semántica general de interacción; debe consumir las primitivas comunes y comprobar que siguen PASS.

## Evidencia que originó esta regla

M6 6.1.14 probó correctamente 414 clientes, 26 aseguradoras, alias `country → pais`, snapshots completos, write guard e integridad. El fallo restante fue `VALIDATOR_STALE — LEGAL_GATE_DEFERRED_RENDER_RACE`: el acuerdo legal aparece 520 ms después de `showApp`. Se creó `settleBlockingGates()` como owner reusable y una prueba sintética reproduce el gate diferido a 520 ms con PASS.

Clasificación para réplica: `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR`. Infraestructura real, Secrets, Rules y datos A&S permanecen `BACKEND_PROTEGIDO_NO_CLAUDE` / `TENANT_AYS_ONLY`.
