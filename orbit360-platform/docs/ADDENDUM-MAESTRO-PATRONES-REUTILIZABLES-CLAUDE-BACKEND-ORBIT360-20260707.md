# Addendum maestro — patrones reutilizables Claude/backend Orbit 360 — 2026-07-07

## Propósito

Este addendum complementa el documento maestro de Orbit 360 A&S para asegurar que todo avance de backend, seguridad, arquitectura, importadores, tenant, integraciones, Academia y reglas de negocio que sea reutilizable para futuros clientes se traduzca también en instrucciones de prototipo/UX para Claude.

Objetivo doble:

1. Construir backend propio, seguro y multi-tenant.
2. Mantener el prototipo frontend afinado para que pueda conectarse al backend de A&S y de próximos clientes sin rehacer módulos ni rediseñar reglas.

Este addendum no reemplaza el documento maestro. Debe incorporarse en la próxima consolidación del documento maestro.

---

## Regla permanente nueva

Cada vez que ChatGPT/Codex documente, corrija o implemente una regla de backend que sea reutilizable, debe decidir si también debe producir una instrucción para Claude.

Formato obligatorio:

```txt
¿Aplica a Claude/prototipo? Sí/No
Si sí: patrón UX/módulo/Academia que Claude debe conservar
Si no: motivo — backend interno, secreto, dato real o lógica exclusiva protegida
```

---

## Qué debe compartirse con Claude

Claude debe recibir arquitectura, contratos y reglas de producto que permitan crear una UI compatible con backend real.

### 1. Arquitectura SaaS multi-tenant

Compartir:

```txt
Orbit 360 es SaaS/white-label/multi-tenant.
A&S es primer tenant, no fork.
La personalización se hace por configuración.
Orbit.tenant define marca, país, moneda, roles, módulos, aseguradoras, glosario, tarifas e integraciones.
```

Claude debe diseñar componentes pensando en:

```txt
tenant actual
país actual
moneda actual
módulos visibles por rol
configuración variable por cliente
```

No debe crear:

```txt
hardcode A&S
hardcode de logo cliente fuera del slot white-label
hardcode de usuarios reales
hardcode de aseguradoras/tarifas reales
```

### 2. Contrato de datos frontend/backend

Compartir:

```txt
Los módulos no acceden a almacenamiento operativo directo.
Los módulos deben usar Orbit.store.
```

Contrato conceptual:

```txt
all(collection)
get(collection, id)
where(collection, predicate)
insert(collection, record)
update(collection, id, patch)
remove(collection, id)
_emit(collection)
```

Claude debe crear UI y flujos compatibles con ese contrato, sin depender de `localStorage`, Firebase, Firestore, mocks o APIs externas directas.

### 3. Estados honestos y no técnicos

Compartir:

```txt
Pendiente de configuración
Pendiente de conexión
Requiere validación
Propuesta de conciliación
Reportado por cliente
En revisión
Validada por confirmar
Pendiente de conciliación
Conciliado
Histórico / sin cartera
Credencial pendiente de bóveda segura
Tarifa pendiente de validación
Documento pendiente de lectura
```

Claude no debe mostrar en UI cliente:

```txt
Firestore
Firebase
backend
LAB
mock
demo
smoke
localStorage
credenciales
```

### 4. Seguridad de secretos y credenciales

Compartir:

```txt
No se guardan contraseñas ni secretos reales en frontend/store.
```

Patrón reusable:

```txt
credentialRef: backend_required
```

UX requerida:

```txt
Capturar referencia o solicitar conexión segura.
Mostrar estado de bóveda/backend seguro.
Nunca precargar contraseña.
Nunca imprimir token/API key/contraseña.
```

### 5. Importación segura por fuentes separadas

Compartir la lógica reutilizable:

```txt
Cada fuente tiene alcance propio.
No mezclar fuentes.
No inferir clientes/pólizas desde movimientos financieros.
No escribir cartera desde financiero histórico.
No escribir cobros desde estado bancario sin conciliación.
Documentos soporte solo proponen datos hasta confirmación/diff.
```

Fuentes:

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

UX requerida:

```txt
dry-run
resumen crear/actualizar/omitir
validaciones bloqueantes
trazabilidad archivo/hoja/fila/bloque/país/moneda/periodo
reporte de importación
confirmación antes de escritura
```

### 6. País, moneda e impuestos

Compartir:

```txt
GT → GTQ
CO → COP
No sumar monedas en crudo.
Moneda debe venir explícita o de configuración confiable.
Si falta país/moneda: REQUIERE_VALIDACION.
IVA por país desde configuración tenant.
```

Claude debe diseñar KPIs y tablas con separación por país/moneda y etiquetas que eviten sumas mezcladas.

### 7. Producción, metas y comisiones

Compartir:

```txt
Producción, metas y comisiones se calculan sobre prima neta recaudada.
Prima separada: neta, gastos, impuestos/IVA, total.
Factura emitida no es ingreso real.
Ingreso real nace cuando hay cobro/conciliación.
Comisiones a asesores se pagan según configuración, sobre prima neta/comisión/fijo, no sobre venta bruta sin recaudo.
```

Claude debe evitar KPIs que mezclen:

```txt
prima total
prima neta
recaudo
facturación
caja
```

sin aclaración.

### 8. Cobros, cartera, finmovs y conciliación

Compartir:

```txt
Cobros/recaudos no son finmovs.
finmovs es financiero histórico/operativo.
Estado de cuenta bancario no aplica cobros directo.
Estado de cuenta de aseguradora no marca pagado directo.
Conciliación propuesta no es pago aplicado.
Pago reportado por cliente no es pago confirmado.
```

Estados recomendados para Claude:

```txt
Reportado por cliente
En revisión
Pendiente de validación
Validado para aplicar
Pagado por conciliar
Conciliado
Rechazado/Bloqueado
```

### 9. Pólizas, renovaciones y cartera

Compartir:

```txt
Solo Vigente/Por renovar genera cartera automática.
Cancelada/Vencida/Anulada/Rechazada/Requiere validación es histórico o recuperación.
Renovación activa ≠ recuperación comercial.
```

Claude debe separar visualmente:

```txt
Renovaciones activas
Histórico sin cartera
Cancelaciones/retención/recuperación
```

### 10. Integraciones

Compartir:

```txt
Integración configurada ≠ integración activa.
Mientras no hay backend/proveedor conectado, mostrar pendiente de conexión.
Eventos se registran con trazabilidad.
No llamar proveedores externos directo desde módulos.
```

Claude debe diseñar paneles con estados honestos, no botones que simulen envío real si no está conectado.

### 11. Cotizador/Comparativo y tarifas

Compartir:

```txt
Cotizador/Comparativo debe ser modular y parametrizable por tenant.
Las tarifas oficiales vienen de configuración/documentos/aseguradoras, no hardcode.
Documentos pueden proponer tarifas, pero requieren validación.
comparativo_final_v110.html es fuente avanzada A&S para integrar después solo como Cotizador/Comparativo.
```

Claude debe saber que el cotizador general del prototipo no basta para A&S final. Debe respetar el avance v110 y conectarlo a:

```txt
aseguradoras
documentos de tarifa
configuración tenant
país/moneda
expediente cliente/póliza
```

### 12. Academia

Compartir todo patrón reusable que cambie operación:

```txt
importación segura
conciliación
renovación vs recuperación
credenciales seguras
integraciones pendientes
cotizador y tarifas validadas
roles/permisos
fuentes separadas
```

Cada cambio de módulo debe responder:

```txt
¿Requiere nueva lección?
¿Requiere quiz/caso práctico?
¿Requiere certificado por rol?
¿Requiere actualización de manual?
```

---

## Qué NO debe compartirse con Claude

No compartir:

```txt
secretos
credenciales reales
tokens
service accounts
config Firebase real sensible
datos reales A&S
clientes reales
pólizas reales
estados bancarios reales
planillas reales completas con datos sensibles
rutas privadas
lógica exclusiva A&S como código base
```

No permitir que Claude sobrescriba:

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

---

## Checklist obligatorio para futuras auditorías

Al cerrar cualquier bloque backend, agregar sección:

```txt
## Impacto Claude / prototipo reutilizable

- Patrón reusable detectado:
- Debe compartirse con Claude: Sí/No
- Módulos impactados:
- Texto/estado UI requerido:
- Academia impactada:
- Riesgo si Claude lo ignora:
```

---

## Decisión

Este addendum debe incorporarse al documento maestro consolidado en la próxima actualización mayor.

Hasta que se consolide, debe leerse junto con:

```txt
DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
GUIA-CLAUDE-PATRONES-REUTILIZABLES-ORBIT360-NO-EXCLUSIVOS-AYS-20260707.md
```
