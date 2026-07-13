# Reporte de cierre funcional CRM OP-1 — pendiente gate visual

Fecha: 2026-07-12  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main

## Decisión

```txt
Cierre funcional CRM OP-1: COMPLETADO
Validación estática/CI: configurada, pendiente resultado observable
Gate visual automático: preparado, pendiente ejecución local
Aprobación visual humana: pendiente
Estado final del módulo: EN VALIDACIÓN, no cerrado
```

No se avanza a OP-2 Aseguradoras hasta corregir cualquier hallazgo P0/P1 que aparezca en el smoke visual y revisar sus capturas.

## Carril actual

```txt
Carril A — CRM/UX/Portal/Póliza/Academia: avance funcional visible
Carril B — access-scope/Orbit.store/auditoría/backend protegido: conservado
Carril C — clientes sanitizados disponibles; fuente separada Pólizas aún pendiente
```

## Cambios funcionales cerrados

### 1. Calidad antes de Pólizas

Archivo:

```txt
orbit360-platform/modules/calidad.js
```

Resultado:

- `soloVig=false` por defecto;
- muestra clientes `pendiente_polizas`;
- scope `propios/equipo/todos/ninguno`;
- filtro por asesor;
- faltantes ampliados;
- catálogos geográficos;
- completar únicamente vacíos;
- motivo, auditoría y `REQUIERE_VALIDACION`;
- comunicación preparada, no enviada.

### 2. Calidad visible para Asesor

Archivo:

```txt
orbit360-platform/core/crm-op1-role-visibility.js
```

Resultado:

- agrega `calidad` a los módulos base del rol Asesor;
- no cambia el scope `own`;
- no habilita edición de Pólizas, cobros, auditoría interna o credenciales;
- conserva permisos críticos.

### 3. Estado de acceso al Portal en Cliente360

Archivo:

```txt
orbit360-platform/modules/crm-op1-closure-bridge.js
```

Estados implementados:

```txt
no_preparado
invitacion_preparada
activo_confirmado
suspendido
requiere_revision
```

Reglas:

- preparar invitación exige permiso, correo y motivo;
- registra `credentialRef=backend_required` sin exponer secretos;
- preparar no confirma entrega ni activación;
- confirmar exige evidencia y frase reforzada;
- suspender exige motivo;
- todas las acciones registran antes/después y actor.

### 4. Visor documental transversal

Cliente360, Portal y Póliza usan `Orbit.documentViewer`.

Sin conexión documental se muestra un estado honesto. No se presentan credenciales ni nombres técnicos del proveedor en la UI cliente.

### 5. Ficha-página de Póliza

Ruta:

```txt
#/polizas?p=<policyId>
```

Incluye:

- cliente y Aseguradora;
- país y moneda;
- estado y generación de cartera;
- vigencia;
- prima neta, gastos, impuestos y total;
- recibos;
- documentos;
- acciones según permiso;
- gestión operativa.

`cliente360.verPoliza()` ahora navega a la ruta propia y valida scope antes de abrir.

### 6. Copy visible del Portal

El puente traduce textos técnicos como:

```txt
Storage/backend conectado → servicio documental conectado
Storage pendiente → resguardo pendiente
chat en línea → asistente de orientación
```

No afirma conexiones activas o envíos confirmados sin evidencia.

### 7. Responsive

Archivo:

```txt
orbit360-platform/styles/crm-op1-v1216.css
```

Contiene adaptación desktop/tablet/móvil para el panel Cliente360 y la página de Póliza.

### 8. Academia profunda

Archivo:

```txt
orbit360-platform/data/academia-v1216-crm-portal-poliza.js
```

Rutas por:

- Dirección;
- Operativo;
- Asesor.

Cubre scope, Calidad antes de Pólizas, Portal, documentos, ficha de Póliza, gestiones, evaluaciones y seguridad. Conserva progreso y certificados.

## Patrón registrado para Claude

Documento:

```txt
orbit360-platform/docs/PATRON-CLAUDE-CRM-CALIDAD-PORTAL-POLIZA-V1216-20260712.md
```

Claude deberá reflejar este comportamiento en la fuente principal de una futura candidata que modifique estos módulos. No debe recibir backend protegido, datos reales, credenciales ni bindings A&S.

## Integración segura al index

Script:

```txt
tools/orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1
```

Funciones:

- verifica la rama exacta;
- crea backup;
- actualiza cache-bust de Calidad y Cotizador/Comparativo;
- inserta una sola vez rol Asesor, cierre CRM, estilos y Academia;
- restaura el index si falla la verificación;
- no hace commit, push ni deploy.

## Validadores

### Estático CRM

```txt
tools/orbit360-validar-crm-op1.mjs
```

Valida:

- scopes;
- visibilidad de Calidad para Asesor sin ampliar permisos;
- deduplicación y estado inicial;
- Calidad y geografía;
- Portal y auditoría;
- visor documental;
- ficha de Póliza;
- Academia;
- responsive;
- sintaxis;
- hashes protegidos.

### GitHub Actions

```txt
.github/workflows/orbit360-crm-op1-smoke.yml
```

El workflow fue configurado, pero no se afirma aprobado hasta que exista un estado/ejecución observable.

## Gate visual automático

### Motor

```txt
tools/orbit360-smoke-visual-crm-op1.mjs
```

Características:

- `localhost:5000`;
- Chrome o Edge en modo headless;
- autenticación demo con datos ficticios;
- no usa credenciales LAB;
- no ejecuta producción;
- genera PNG y `results.jsonl`;
- detecta errores JS, copy técnico y overflow global.

Matriz:

```txt
Dirección · Clientes lista · 1366x900
Dirección · Cliente detalle · 1366x900
Dirección · Calidad · 1366x900
Dirección · Póliza · 1366x900
Operativo · Cliente detalle · 768x950
Operativo · Calidad · 768x950
Asesor · Cliente detalle · 390x844
Asesor · Calidad · 390x844
Asesor · Póliza · 390x844
Dirección · Portal · 390x844
```

### Ejecutor único

```txt
tools/orbit360-run-crm-op1-visual.ps1
```

El ejecutor:

1. verifica rama;
2. sincroniza mediante fast-forward;
3. aplica integración segura con backup;
4. valida backend protegido;
5. valida CRM;
6. valida Cotizador/Comparativo empalmado;
7. ejecuta el smoke visual en el puerto 5000;
8. genera reporte maestro y lo copia al portapapeles.

No descarta cambios locales, no hace commit/push y no despliega.

## Pendientes reales

### P0/P1 antes de avanzar

- ejecutar el smoke visual local;
- revisar `10/10` escenarios y capturas;
- corregir cualquier pantalla vacía, desbordamiento, error de consola, acceso cruzado o copy técnico;
- registrar aprobación visual humana.

### Carril C

Después del cierre visual CRM:

```txt
siguiente fuente separada requerida = Pólizas
```

No inferir Pólizas desde Clientes, movimientos financieros, banco o documentos sin diff/confirmación.

## Siguiente acción exacta

Ejecutar desde PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core\tools\orbit360-run-crm-op1-visual.ps1"
```

El resultado esperado es un reporte en:

```txt
_orbit360_reports/RUN-CRM-OP1-VISUAL-*.txt
```

y capturas en:

```txt
_orbit360_reports/VISUAL-CRM-OP1-*/
```

Solo después de revisar ese resultado se cambia CRM a `CERRADO` y se inicia OP-2 Aseguradoras.
