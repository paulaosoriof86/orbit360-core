# ADDENDUM MAESTRO — CONTROL DE CAUSA RAÍZ, VALIDADORES Y GATES
## Orbit 360 — Alianzas y Soluciones

**Fecha:** 2026-07-17  
**Versión:** 1.0  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Carpeta:** `orbit360-platform/`  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Merge, main y producción:** no autorizados  

---

## 0. Carácter vinculante y precedencia

Este addendum complementa y no reemplaza:

1. `DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md`;
2. `ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md`;
3. `ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md`;
4. `ADDENDUM-MAESTRO-CONTINUIDAD-CLIENTES-MULTIROL-IMPORTADORES-20260709.md`;
5. `PLAN-MAESTRO-EJECUCION-PRODUCTIVA-ANTI-DESVIACION-SINCRONIZACION-CLAUDE-ORBIT360-AYS-20260716.md`.

Para cualquier conflicto sobre **validadores, smokes, gates, workflows, propietarios, bridges y clasificación de fallos**, este addendum es la regla metodológica prevalente.

No crea un plan paralelo. Su función es impedir que una validación antigua fuerce regresiones sobre una arquitectura nueva y evitar cadenas de intentos que corrigen síntomas sin resolver la causa raíz.

---

## 1. Causa raíz documentada

Durante el cierre del Bloque 1 se repitieron fallos porque el gate LAB todavía exigía:

- bridges ya retirados;
- Legal y menú móvil dentro de PWA;
- selectores o IDs pertenecientes a una proyección temporal;
- coincidencias literales demasiado rígidas;
- términos sensibles detectados dentro de comentarios negativos;
- parches dependientes del contexto de líneas.

El frontend propietario y el backend protegido no eran necesariamente la causa del fallo. La cadena de validación estaba desactualizada respecto del baseline que debía evaluar.

La causa raíz general es:

> **No existía un contrato versionado que obligara a actualizar juntos la arquitectura, el registro de propietarios y los gates que la validan.**

Por tanto, una validación antigua podía bloquear una arquitectura correcta o intentar reintroducir una capa retirada.

---

## 2. Regla de clasificación obligatoria antes de corregir

Todo fallo se clasifica antes de modificar código.

| Código | Significado | Primera acción |
|---|---|---|
| `FUNCTIONAL_DEFECT` | El comportamiento real del producto incumple el contrato vigente | Corregir el archivo propietario |
| `VALIDATOR_STALE` | El gate exige arquitectura, selectores, archivos o contratos retirados | Congelar código funcional y actualizar el contrato del gate |
| `DATA_CONTRACT_FAILURE` | El dato existe, pero no cumple el contrato canónico esperado | Corregir adapter/proyección/importador, sin reimportar por defecto |
| `ENVIRONMENT_FAILURE` | Secret, servicio, canal, dependencia o entorno impide ejecutar | Corregir únicamente entorno; no tocar UX o reglas de negocio |
| `PIPELINE_MECHANISM_FAILURE` | El mecanismo de aplicación falla por patch, contexto, permisos o herramienta | Sustituir el mecanismo; no alterar el cambio funcional aprobado |
| `SECURITY_FAILURE` | Existe exposición, cross-tenant, permiso excesivo o secreto | Detener gate y corregir seguridad antes de continuar |

### Regla bloqueante

No se permite modificar un módulo funcional mientras el fallo esté clasificado como `VALIDATOR_STALE`, `ENVIRONMENT_FAILURE` o `PIPELINE_MECHANISM_FAILURE`.

---

## 3. Protocolo de causa raíz

Ante el primer fallo:

1. identificar la primera etapa real fallida;
2. extraer el código de error o check exacto;
3. comparar ese check con el registro vigente de owners y temporales retirados;
4. clasificar el fallo;
5. corregir una sola capa;
6. ejecutar preflight estático;
7. ejecutar el mismo gate una vez;
8. documentar resultado y siguiente acción.

### Regla de repetición

Si se repite el mismo código de fallo o la misma etapa falla por segunda vez:

```txt
DETENER REINTENTOS
NO CREAR OTRO PARCHE
NO MODIFICAR OTRO MÓDULO
ABRIR DIAGNÓSTICO DE CAUSA RAÍZ DEL GATE/PIPELINE
```

No se permiten tres intentos consecutivos sobre el mismo síntoma.

---

## 4. Contrato versionado de gates

Todo gate activo debe estar registrado en:

```txt
tools/orbit360-gate-contract-registry-v20260717.json
```

Cada registro debe declarar:

- `gateId`;
- bloque del Plan Maestro;
- workflow ejecutor;
- validadores;
- owners canónicos;
- bridges/archivos retirados;
- rama autorizada;
- proyecto/entorno autorizado;
- conteos o invariantes esperados;
- versión del contrato;
- evidencia de salida.

### Regla atómica

Cuando cambia un owner, bootstrap, ruta, selector o bridge, el mismo bloque debe actualizar:

1. código propietario;
2. registro del gate;
3. validador/preflight;
4. workflow consumidor;
5. documentación de antes/después;
6. impacto Claude y Academia.

Un cambio arquitectónico sin actualización del gate se considera incompleto.

---

## 5. Preflight obligatorio antes de Firebase o runtime

Todo workflow de gate debe ejecutar primero:

```txt
node tools/orbit360-validar-gate-contracts-v20260717.mjs <gateId>
```

El preflight debe finalizar antes de:

- leer secrets;
- instalar Firebase Admin;
- sincronizar usuarios o datos;
- desplegar canal LAB;
- instalar Playwright;
- abrir navegador;
- generar comentarios o artefactos runtime.

### Resultado esperado

```txt
GO_GATE_CONTRACT
```

### Resultado bloqueante

```txt
VALIDATOR_STALE
```

Cuando el resultado sea `VALIDATOR_STALE`, el workflow debe detenerse sin tocar Firebase, datos, Hosting ni código funcional.

---

## 6. Propietarios y temporales

Un gate nunca puede exigir un archivo clasificado como retirado.

El registro machine-readable es la fuente para distinguir:

- owner canónico;
- adapter contractual vigente;
- temporal con retiro;
- archivo retirado;
- evidencia histórica no ejecutable.

### Regla de propietarios

```txt
PWA → instalación, manifest, branding, service worker/cache
Router → rutas, menú móvil, gate de navegación, bootstrap explícito
Legal → idempotencia y cola legal
Access → roles, scopes, países, permisos y fail-closed
Cliente projection → aliases visuales no mutantes
Aseguradoras owner → directorio, ficha, conocimiento, orden y gates por consumidor
```

Ningún validador puede volver a exigir que Legal, Router o módulos operativos vivan dentro de PWA.

---

## 7. Prohibición de cadenas de parches

No se permiten como metodología normal:

- patch sobre patch;
- staging temporal acumulado;
- workflow de un solo uso que genera otro workflow de un solo uso;
- sustituciones por contexto de líneas sin hash o contrato;
- pruebas que reproducen manualmente la lógica en vez de ejecutar el flujo real;
- aceptar verde por existencia nominal de funciones.

Cuando sea indispensable una transformación automática:

1. debe verificar hash o contenido de partida;
2. debe limitar archivos permitidos;
3. debe ejecutar validadores antes del commit;
4. debe retirar staging en el mismo cierre;
5. no debe convertirse en el owner permanente.

---

## 8. Regla de un solo gate del Bloque 1

El Bloque 1 conserva el orden del Plan Maestro:

1. preflight de contrato del gate;
2. gate conjunto Cliente 360 + Aseguradoras;
3. corregir únicamente el primer check real fallido;
4. reejecutar el mismo gate;
5. obtener evidencia sanitizada `ok: true`;
6. una sola revisión visual con Paula.

No se crean gates paralelos para resolver el mismo cierre.

---

## 9. Evidencia y reporte obligatorio

Cada intento permitido debe registrar:

```txt
BLOQUE
GATE_ID
CONTRACT_VERSION
HEAD
CLASIFICACION_DEL_FALLO
PRIMER_CHECK_REAL_FALLIDO
CAPA_CORREGIDA
ARCHIVOS_MODIFICADOS
PRECHECK
RESULTADO_RUNTIME
DATOS/ENTORNO_TO­CADOS
IMPACTO_CLAUDE
IMPACTO_ACADEMIA
SIGUIENTE_ACCION_EXACTA
```

No basta informar “falló” o “se ajustó”.

---

## 10. Claude y Academia

### Claude

Toda mejora reusable debe enseñar que:

- owner y validator evolucionan juntos;
- un bridge retirado no puede reaparecer en una candidata;
- tests verifican conducta real;
- estados de gate son honestos;
- no se corrige UX para satisfacer un validator antiguo.

Clasificación:

```txt
REPLICABLE_CLAUDE_ACUMULADO
```

### Academia

Academia debe incluir:

- diferencia entre defecto funcional y validador obsoleto;
- lectura de un gate;
- clasificación de causa raíz;
- owners, bridges y retiro;
- por qué no se reimportan datos para corregir visualización;
- por qué un error de pipeline no se corrige cambiando el producto.

---

## 11. Lock corto para instrucciones del proyecto

El texto oficial está documentado en:

```txt
orbit360-platform/docs/LOCK-INSTRUCCIONES-PROYECTO-CAUSA-RAIZ-GATES-20260717.md
```

Debe ubicarse al inicio de las instrucciones de Orbit 360 A&S o incorporarse en su siguiente actualización consolidada.

---

## 12. Estado inicial al aprobar este addendum

```txt
Bloque 0: CERRADO — GO_STATIC_ARCHITECTURE
Bloque 1: ACTIVO — gate LAB pendiente
Causa raíz vigente: cadena de validación desactualizada
Acción inmediata: instalar registro + preflight y alinear el único gate LAB
Cobros/Pólizas: no avanzar antes del cierre del Bloque 1
Backend protegido: intacto
Datos A&S: sin reimportación
Producción/main/merge: no autorizados
```
