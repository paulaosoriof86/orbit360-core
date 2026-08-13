# Implementación P0.9i — acciones administrativas del lote Aseguradoras

Fecha: 2026-07-10  
Módulo: Aseguradoras / conocimiento documental  
Carril: B + C, con traducción a A  
Estado: `CONTRATO_IMPLEMENTADO / SMOKE_SINTETICO / SIN_EJECUCION_LAB_REAL`

## 1. Necesidad

P0.9g y P0.9h ya permitían procesar el lote, guardar historial y reanudar documentos. Faltaba una frontera administrativa que impidiera que la interfaz o un consumidor confundieran:

```text
previsualizar
≠ ejecutar dry-run
≠ persistir conocimiento
≠ persistir historial
≠ habilitar Cotizador/Comparativo
```

Sin esta frontera, un flujo de UX podía llamar directamente al orquestador con parámetros incompletos o presentar una sola acción como si hiciera todo.

## 2. Esperado

La operación debe ocurrir en cuatro momentos independientes:

1. Preview administrativo.
2. Confirmación reforzada.
3. Dry-run o reanudación sin persistencia de conocimiento.
4. Persistencia separada del historial metadata-only.

Cada momento debe conservar actor, rol activo, tenant, motivo, alcance y estado honesto.

## 3. Causa raíz

Los contratos P0.9g/P0.9h eran correctos a nivel de orquestación, pero estaban pensados como APIs técnicas. No existía una capa que:

- construyera un preview sanitizado;
- exigiera fingerprint;
- exigiera frase de confirmación;
- restringiera por rol activo;
- separara el dry-run de la persistencia del historial;
- garantizara que la UI no pudiera persistir conocimiento accidentalmente.

## 4. Archivo implementado

```text
orbit360-platform/core/aseguradoras-batch-admin-actions-p09i.js
```

El contrato expone:

```text
preview()
execute()
buildHistoryPlan()
persistHistory()
status()
```

No escribe directamente en `Orbit.store`, no llama red, no usa almacenamiento local y no contiene referencias reales.

## 5. Preview administrativo

`preview()` valida:

- tenant;
- lote;
- actor;
- rol activo;
- rol activo asignado;
- motivo;
- acción solicitada;
- documentos seleccionados;
- referencias disponibles o faltantes.

Acciones soportadas:

```text
dry_run
resume
```

El preview devuelve:

- documentos incluidos;
- aseguradora;
- tipo de archivo/tarea;
- país, moneda, producto y versión;
- cantidad de referencias presentes;
- documentos sin referencia;
- fingerprint;
- frase de confirmación;
- estado de cero persistencia.

No devuelve el valor de ninguna referencia.

## 6. Roles

### Preview y ejecución dry-run

Permitidos:

```text
SuperAdmin
Dirección
Admin
AdminTenant
Operativo
```

Operativo puede revisar y ejecutar la inspección sin escritura de conocimiento.

### Persistencia del historial

Permitidos:

```text
SuperAdmin
Dirección
Admin
AdminTenant
```

Operativo no puede persistir historial global. Asesor no puede preparar ni ejecutar acciones administrativas.

La autorización depende del rol activo, no de la mera existencia de otro rol asignado.

## 7. Confirmación reforzada

El preview genera un fingerprint basado en:

- tenant;
- lote y versión;
- acción;
- documentos;
- actor;
- rol activo;
- motivo.

La ejecución exige:

```text
expectedFingerprint
confirmExecution: true
confirmationText exacto
```

Frases:

```text
EJECUTAR DRY-RUN
REANUDAR DRY-RUN
```

Si cambia el motivo, actor, alcance o fingerprint, debe reconstruirse el preview.

## 8. Ejecución

`execute()` fuerza:

```text
mode: dry_run
persistHistory: false
confirmHistoryPlan: false
knowledgePersisted: false
historyPersisted: false
```

Para `resume`, reutiliza P0.9h y procesa solo documentos reanudables.

No puede:

- persistir manifiestos;
- persistir reglas;
- persistir presentaciones;
- persistir bindings;
- habilitar Cotizador;
- habilitar Comparativo.

## 9. Persistencia separada del historial

`persistHistory()` exige dos confirmaciones diferentes:

```text
confirmHistoryPlan: true
confirmHistoryPersistence: true
```

También exige un rol administrativo.

Solo puede utilizar el writer de P0.9h para:

```text
aseguradora_batch_runs
aseguradora_batch_items
actividades
```

La persistencia de historial no equivale a persistir el conocimiento extraído.

## 10. Seguridad

La sanitización elimina:

- referencias backend;
- rutas locales o montadas;
- URLs normales o firmadas;
- bytes/base64;
- texto completo;
- API keys y tokens;
- credenciales y secretos.

El estado público declara:

```text
referencesExposed: false
knowledgePersistenceAllowed: false
enablesCotizador: false
enablesComparativo: false
```

## 11. Bootstrap

Se actualizó:

```text
core/aseguradoras-runtime-bootstrap-p09f.js
```

El bootstrap carga ahora P0.9i después del historial P0.9h y antes del panel.

El preflight expone:

```text
batchAdminActionsReady
```

El inventario total pasa a 26 dependencias aditivas.

## 12. Panel

Se actualizó:

```text
modules/aseguradoras-knowledge-panel-p09f.js
```

El panel muestra:

- estado del preview;
- acción;
- documentos incluidos;
- referencias presentes/faltantes;
- frase de confirmación requerida;
- última ejecución;
- estado de persistencia del historial.

Continúa siendo solo lectura. No llama `execute()` ni `persistHistory()`.

## 13. Pruebas

```text
tools/orbit360-test-aseguradoras-batch-admin-actions-p09i.mjs
tools/orbit360-test-aseguradoras-runtime-bootstrap-p09f.mjs
tools/orbit360-test-aseguradoras-knowledge-panel-p09f.mjs
```

Escenarios:

- Asesor bloqueado;
- Operativo autorizado para preview/dry-run;
- rol activo no asignado;
- referencia faltante;
- referencias no expuestas;
- fingerprint incorrecto;
- confirmación ausente;
- frase incorrecta;
- dry-run correcto;
- reanudación selectiva;
- Operativo bloqueado para historial;
- doble confirmación;
- persistencia exclusiva del historial;
- panel sin escrituras;
- cero habilitación.

Workflow:

```text
.github/workflows/orbit360-aseguradoras-batch-admin-p09i-smoke.yml
```

## 14. Archivos protegidos

No se modificaron:

```text
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
core/auth.js
firestore.rules
```

## 15. Impacto

### Aseguradoras

Obtiene una frontera operativa segura para preparar la futura ejecución real del lote.

### Cotizador/Comparativo

No reciben habilitación ni conocimiento automático.

### Multi-tenant

El contrato es reusable. El lote, aliases y fuentes de A&S siguen separados en configuración tenant.

## 16. Estado real

```text
contrato administrativo: implementado
preview: implementado
confirmación reforzada: implementada
dry-run/reanudación: implementados
persistencia separada de historial: implementada
panel: actualizado
workflow: configurado

index aplicado: no
provider backend conectado: no
dry-run real: no ejecutado
historial Firestore LAB: no escrito
conocimiento Firestore LAB: no escrito
Cotizador: deshabilitado
Comparativo: deshabilitado
```

## 17. Siguiente paso

P0.9j debe preparar el formulario visible y accesible para:

1. elegir dry-run o reanudación;
2. seleccionar documentos;
3. mostrar preview;
4. registrar motivo;
5. pedir confirmación reforzada;
6. ejecutar sin persistencia de conocimiento;
7. ofrecer persistencia separada del historial únicamente a roles administrativos;
8. conservar el gate cerrado.
