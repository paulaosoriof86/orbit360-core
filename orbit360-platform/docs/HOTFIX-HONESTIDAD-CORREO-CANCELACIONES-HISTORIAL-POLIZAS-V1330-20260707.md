# Hotfix honestidad — Correo/Cancelaciones/Historial/Pólizas v1330 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
Main: no tocado
```

## Objetivo

Aplicar el hotfix recomendado en la auditoría de cierre parcial del núcleo CRM, priorizando cambios seguros desde GitHub sin tocar backend protegido.

## Archivos modificados

```txt
orbit360-platform/modules/historial.js
orbit360-platform/modules/cancelaciones.js
orbit360-platform/modules/correo.js
orbit360-platform/modules/polizas.js
orbit360-platform/docs/HOTFIX-HONESTIDAD-CORREO-CANCELACIONES-HISTORIAL-POLIZAS-V1330-20260707.md
```

## Commits aplicados

```txt
1b02f7ae30474135698157f86156933f11f9d234 — historial
458ef4beaddf7ca574aa28ddadea12d84a9f2597 — cancelaciones
49a9710ba50aeb4a57c4e7610be07a40b78a1cca — correo
 a084e371820a747e0b3af519da87c20d8532545d — pólizas
```

## Cambios aplicados

### Historial

Archivo:

```txt
orbit360-platform/modules/historial.js
```

Cambio:

- Se amplió `TIPOS` para reconocer:

```txt
correo
recuperacion
siniestro
```

Resultado esperado:

- El historial sigue siendo trazabilidad.
- Nuevas actividades no caen como etiqueta cruda.

### Cancelaciones

Archivo:

```txt
orbit360-platform/modules/cancelaciones.js
```

Cambios:

- Se agregó helper `hoy()` usando `Orbit.ui.today()` cuando exista.
- La recuperación comercial no recuperada mantiene destino correcto a Leads.
- El toast ahora dice:

```txt
Acción de recuperación guardada · visible en ficha y Leads
```

- Cuando se marca `Recuperada`, el toast ahora dice:

```txt
Cliente recuperado · reemisión operativa creada en Ops
```

Resultado esperado:

```txt
Cancelación = histórico.
Recuperación comercial = Leads.
Reemisión por recuperación = Ops.
No genera cartera automática.
```

### Correo

Archivo:

```txt
orbit360-platform/modules/correo.js
```

Cambios:

- Si no hay cuenta conectada, la carpeta se muestra como:

```txt
Preparados
```

- La UI indica que se pueden preparar correos, pero el envío real requiere backend/OAuth conectado.
- Redacción usa botón:

```txt
Preparar correo
```

cuando no hay cuenta conectada.

- Al preparar, el toast indica:

```txt
Correo preparado · envío pendiente de cuenta conectada
```

- Configurar Outlook/Gmail ya no llama a `Orbit.correo.conectar()` ni marca cuenta como conectada; solo registra intención visual y deja claro que requiere backend/OAuth.

Resultado esperado:

```txt
Correo preparado ≠ correo enviado por proveedor.
Cuenta configurada visualmente ≠ OAuth/backend conectado.
```

### Pólizas

Archivo:

```txt
orbit360-platform/modules/polizas.js
```

Cambios:

- KPI `Prima vigente` pasó a:

```txt
Prima neta vigente
```

- El cálculo usa:

```js
p.primaNeta != null ? p.primaNeta : p.prima
```

- El pie aclara:

```txt
anualizada · no producción
```

Resultado esperado:

```txt
No confundir prima total vigente con producción, metas o comisiones.
Producción/metas/comisiones siguen basadas en prima neta recaudada.
```

## No aplicado por seguridad desde conector

No se reemplazó `orbit360-platform/modules/cliente360.js` completo porque es un archivo grande/sensible y el conector GitHub solo permite reemplazo completo de archivo, no parche parcial seguro.

Puntos pendientes en Cliente360:

```txt
1. Botón comparativo: cambiar “Enviar comparativo al cliente” por “Preparar comparativo para cliente”.
2. Redactar desde pestaña correos: idealmente abrir compositor del módulo Correo con window.__orbitCompose.
3. Endoso importado: no prometer Drive si Storage/Drive no está conectado.
```

Mitigación parcial:

- `Orbit.correo.enviar()` ya registra como correo preparado desde la capa central.
- La UI principal de Correo ahora muestra estados honestos.

Pendiente recomendado:

```txt
fix(ays): cliente360 honestidad comparativo correo endoso v1330
```

Debe aplicarse localmente o con herramienta de parche parcial, no por reemplazo manual completo desde GitHub.

## Validaciones pendientes

No se pudo ejecutar Node desde conector GitHub. Antes de demo ejecutiva o producción:

```bash
node --check orbit360-platform/modules/historial.js
node --check orbit360-platform/modules/cancelaciones.js
node --check orbit360-platform/modules/correo.js
node --check orbit360-platform/modules/polizas.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

## Protegidos

No se tocaron intencionalmente:

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

Nota: se intentó endurecer `core/correo.js` para exponer un estado interno de conexión pendiente, pero la llamada fue bloqueada por controles de herramienta. No se forzó ni se intentó workaround riesgoso.

## Impacto Claude / prototipo reutilizable

Aplica a Claude/prototipo: Sí.

Patrones a conservar:

```txt
Historial = trazabilidad, no confirmación de ejecución.
Cancelación = histórico.
Recuperación comercial = Leads.
Reemisión = Ops.
Correo preparado ≠ enviado por proveedor.
Configurar correo ≠ OAuth/backend conectado.
Prima neta vigente ≠ producción recaudada.
```

## Impacto Academia

Actualizar rutas/cápsulas:

```txt
Historial y trazabilidad.
Cancelaciones y recuperación.
Correo preparado vs envío real.
Prima neta vigente vs prima neta recaudada.
Estados honestos de integración.
```

## Estado

```txt
Hotfix parcial aplicado.
Cliente360 queda pendiente por seguridad técnica del conector.
Sin merge.
Sin deploy.
```
