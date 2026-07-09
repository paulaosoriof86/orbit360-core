# Prompt de continuidad blindado anti-desviación — Orbit 360 A&S

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Prompt para próxima conversación

Pega esto al iniciar una nueva conversación si el contexto empieza a fallar:

```txt
CONTINUIDAD ORBIT 360 A&S — ANTI-DESVIACIÓN OBLIGATORIA

Estás trabajando en Migración Alianzas y Soluciones — Orbit 360.
Repo: paulaosoriof86/orbit360-core.
Carpeta: orbit360-platform/.
Rama activa obligatoria: ays/backend-tenant-lab-v99-20260703.
PR vigente: #5 draft/open, sin merge, sin deploy, sin main.

Antes de responder, leer fuentes maestras disponibles:
- DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
- ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
- ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
- PROTOCOLO-ANTI-DESVIACION-PLAN-OPERATIVO-DATOS-REALES-AYS-20260709.md
- MATRIZ-FUENTES-REALES-RECIBIDAS-FALTANTES-AYS-20260709.md

Regla principal:
Siempre trabajar sobre la última versión incremental. La última candidata recibida es:
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add

No empalmar ZIP completo a ciegas. Usar empalme seguro preparado:
orbit360-platform/docs/scripts/APLICAR-EMPALME-SEGURO-ULTIMA-CANDIDATA-183042-V1330.ps1

Regla anti-desviación:
Toda respuesta debe mantener tres carriles visibles:
Carril A — Última candidata/prototipo/empalme.
Carril B — Backend protegido/seguridad/Orbit.store.
Carril C — Datos reales/migración operativa A&S.

Antes de actuar, contestar internamente:
1. ¿Cuál es la última candidata?
2. ¿Qué carril se está trabajando?
3. ¿Qué avance visible produce este bloque?
4. ¿Qué fuente real ya recibida uso o cuál falta pedir?
5. ¿Estoy repitiendo auditoría ya hecha o convirtiéndola en acción?
6. ¿Qué registro/documento actualizo?
7. ¿Qué bloquea operación real?

Fuentes reales ya recibidas:
- Directorio Aseguradoras Guatemala 2026.xlsx
- Directorio - Aseguradoras Colombia 2024.xlsx
- Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
- AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx
- Manual de Identidad Básica – Versión 1 – Vigente.docx
- Logo V. 2026.jpeg
- comparativo_final_v110.html

Valor ya identificado:
- Directorios aseguradoras -> aseguradoras/contactos/configuración.
- Movimientos financieros -> financiero_historico/finmovs; NO clientes, NO pólizas, NO cartera, NO cobros aplicados.
- Calendario -> marketing.
- Manual/logo -> configuración marca/Academia.
- comparativo_final_v110 -> Cotizador/Comparativo aislado/configurable.

Fuentes faltantes, pedir una a una en este orden:
1. Clientes.
2. Pólizas.
3. Vehículos si no vienen en pólizas.
4. Recibos/cobros realizados.
5. Planilla aseguradora.
6. Planilla comisiones.
7. Estado cuenta bancario conciliable.
8. Siniestros.
9. Documentos soporte.

Siguiente acción concreta si no se ha hecho:
Pedir a Paula el archivo CLIENTES y preparar matriz de mapeo/dry-run. No seguir dando vueltas en auditorías abstractas.

Formato obligatorio de cada respuesta:
Carril actual:
Avance visible:
Fuente real usada o siguiente fuente a pedir:
Pendiente documentado:
Siguiente acción:

Circuit breaker:
Si pasan dos bloques sin avance visible o sin carril C, detener y corregir rumbo.
No repetir auditorías ya hechas si no hay nuevo archivo/candidata.
No pedir más contexto que ya esté documentado.
No tocar backend protegido ni main.
No subir datos reales al repo.
No hardcodear A&S.
No mezclar GTQ/COP.
No inferir clientes/pólizas desde movimientos financieros.
```

## Estado

Prompt blindado creado para evitar pérdida de rumbo en conversaciones futuras.