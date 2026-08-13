# Guía Claude — patrones reutilizables Orbit 360 no exclusivos A&S — 2026-07-07

## Propósito

Este documento resume qué información de backend/arquitectura puede compartirse con Claude para mejorar prototipo, UX y módulos sin exponer secretos, datos reales ni lógica exclusiva sensible de A&S.

Claude trabaja principalmente:

```txt
UX
módulos frontend
navegación
diseño
componentes visuales
documentación funcional
Academia
smoke visual
```

ChatGPT/Codex trabaja principalmente:

```txt
backend
Firestore LAB / Auth LAB
Orbit.store
tenant isolation
importadores backend
validadores
pipeline
PR
seguridad
```

## Sí se puede compartir con Claude

### 1. Contrato de almacenamiento frontend

Claude puede conocer que los módulos no deben escribir directo a almacenamiento operativo, sino usar:

```txt
Orbit.store
```

Contrato conceptual:

```txt
all
get
where
insert
update
remove
_emit
```

Claude debe diseñar módulos compatibles con ese contrato, sin acceder directamente a `localStorage`, Firebase, Firestore ni APIs externas.

### 2. Modelo SaaS / multi-tenant

Claude puede y debe conservar:

```txt
Orbit.tenant
configuración por tenant
white-label
país/moneda por tenant
módulos visibles por rol
aseguradoras configurables
glosario configurable
tarifas configurables
integraciones configurables
```

Regla:

```txt
A&S es primer tenant, no fork de código.
```

### 3. Reglas comerciales reutilizables

Claude puede recibir reglas generales del producto:

```txt
GT → GTQ
CO → COP
no sumar monedas en crudo
producción/metas/comisiones sobre prima neta recaudada
prima separada: neta, gastos, IVA/impuestos, total
cobros/recaudos no son finmovs
finmovs es financiero histórico/operativo
estado bancario no aplica cobros sin conciliación
planilla de comisión desde filas reales, no simulada
```

### 4. Estados honestos de UI

Claude debe usar etiquetas honestas reutilizables:

```txt
Pendiente de configuración
Pendiente de conexión
Requiere validación
Propuesta de conciliación
Reportado por cliente
En revisión
Validada por confirmar
Pagado por conciliar
Conciliado
Histórico / sin cartera
```

No debe mostrar:

```txt
backend
Firestore
LAB
mock
demo
localStorage
credenciales
smoke
```

en UI cliente.

### 5. Seguridad de credenciales

Claude puede conocer la regla:

```txt
No guardar secretos ni contraseñas reales en frontend/store.
```

Patrón reusable:

```txt
credentialRef: backend_required
```

UX sugerida:

```txt
Credencial pendiente de bóveda segura
Conectar integración
Pendiente de backend seguro
```

### 6. Patrones de importación segura

Claude puede diseñar UX de importación siempre que conserve:

```txt
fuentes separadas
dry-run antes de guardar
trazabilidad archivo/hoja/fila/bloque/país/moneda/periodo
REQUIERE_VALIDACION si falta país/moneda/estado/prima confiable
no crear/modificar clientes o pólizas desde documentos soporte sin confirmación y diff
```

Fuentes separadas:

```txt
clientes
aseguradoras
polizas
vehiculos
cobros_realizados
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
financiero_historico
siniestros
documentos_soporte
configuracion_catalogo
```

### 7. Academia

Claude debe actualizar Academia cuando cambien módulos:

```txt
rutas por rol
lecciones guiadas
evaluaciones prácticas
certificados
progreso
actualización continua
```

Temas reutilizables:

```txt
importación segura
conciliación
renovación vs recuperación
credenciales seguras
integraciones pendientes de conexión
cotizador/comparativo y tarifas validadas
```

## No se debe compartir con Claude

### 1. Secretos o credenciales

Nunca compartir:

```txt
API keys reales
tokens
contraseñas
service accounts
configuración privada sensible
credenciales de aseguradoras
credenciales de correo/WhatsApp/Make
```

### 2. Datos reales de A&S

No compartir ni quemar:

```txt
clientes reales
pólizas reales
movimientos reales
estados bancarios reales
planillas reales con datos sensibles
credenciales reales
```

### 3. Implementación backend protegida

Claude no debe sobrescribir ni modificar sin revisión ChatGPT/Codex:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
```

### 4. Lógica exclusiva o específica A&S como producto base

Lo exclusivo de A&S debe quedar en configuración o documentación tenant, no en código base.

Ejemplos:

```txt
logo A&S
paleta específica A&S si no es seleccionada por tenant
aseguradoras vinculadas reales
tarifas aprobadas reales
usuarios reales
roles internos reales
rutas/documentos privados
```

## Regla para Cotizador/Comparativo A&S v110

Existe fuente avanzada:

```txt
comparativo_final_v110.html
```

Claude puede saber que debe integrarse como avance funcional, pero no debe reemplazar Orbit 360 completo ni hardcodear tarifas reales.

Debe integrarse como:

```txt
Cotizador/Comparativo modular
configurado por tenant
ligado a aseguradoras/documentos/tarifas
con estados honestos de tarifa validada o pendiente
```

## Instrucción final para Claude

Antes de generar una candidata nueva:

1. Leer documento maestro y adendum de Academia.
2. Leer esta guía.
3. Conservar backend protegido.
4. Diseñar UX compatible con `Orbit.store` y `Orbit.tenant`.
5. No simular conexiones productivas.
6. No mostrar textos técnicos al cliente.
7. Documentar impacto en Academia.
