# Bloque 1 — causa raíz del bridge Aseguradoras y arranque de contratos Router

Fecha: 2026-07-18  
Proyecto: Orbit 360 — Alianzas y Soluciones  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate único: `block1-client360-insurers-lab-v20260717`  
Contrato vigente: `1.0.12`  
Producción/main/merge: no autorizados

## 1. Bloque y necesidad

El Bloque 1 debe validar en una sola ejecución Cliente 360 y Aseguradoras con:

- 414 clientes;
- 26 aseguradoras;
- 7 asesores;
- Dirección escritorio;
- Operativo tableta;
- Asesor móvil;
- Legal una sola vez;
- menú móvil;
- lista, ficha, calidad y relaciones vacías honestas;
- directorio, ficha y conocimiento de Aseguradoras;
- multirol/scopes;
- cero copy técnico.

No se reimportaron datos ni se modificaron `Orbit.store`, Auth, Legal, Access, reglas o renderers canónicos.

## 2. Secuencia comprobada de fallos

### 2.1 `ENVIRONMENT_FAILURE`

Run `29627312435`, primer intento:

- preflight: `GO_GATE_CONTRACT`;
- conteos: 414/26/7;
- primera etapa fallida: publicación/verificación del canal LAB.

El workflow y el payload de Hosting no habían cambiado respecto del run anterior aprobado en esa etapa. Se autorizó un único reintento del mismo job. La publicación pasó sin cambio de código, confirmando fallo transitorio de entorno. No se permiten más reintentos automáticos si vuelve a repetirse esta etapa.

### 2.2 `FUNCTIONAL_DEFECT`

Run `29627312435`, segundo intento:

- el diagnóstico CDP identificó el archivo exacto: `modules/aseguradoras-v1197-ux-bridge.js`;
- línea reportada por navegador: 61;
- error: `SyntaxError: missing ) after argument list`;
- causa física: faltaba un paréntesis de cierre en la normalización del canal de contacto.

Corrección aplicada:

```txt
canal: clean(contact.canal || (contact.email ? 'Correo' : (contact.tel || contact.telefono ? 'Teléfono' : 'Correo'))),
```

Validaciones:

- blob original reconstruido y confirmado: `a7857e0fae66e622d28ed05805086f2754e6aa49`;
- diff: una sola línea;
- `node --check`: aprobado;
- commit del fix: `0d4de79844d019f66e6d36eeade0651cf64d4c14`;
- blob corregido: `b11a7e556892015f1d7827c6f228666bdd1e9ccd`.

### 2.3 `VALIDATOR_STALE`

Run `29628208249` después del fix:

- `failedScripts`: vacío;
- `exceptions`: vacío;
- `pageErrors`: vacío;
- preflight: 354/354 checks aprobados;
- conteos LAB: 414/26/7;
- la página seguía cargando el grafo estático de `index.html` (`importa-clientes` → `importa-polizas`);
- el gate exigía `Orbit.clientProjection` dentro de 12 segundos, antes de que el script inline invocara `Orbit.router.init()` y Router añadiera el primer contrato dinámico.

La espera era metodológicamente obsoleta: confundía “la proyección aún no ha sido solicitada” con “la proyección falló”.

## 3. Corrección de causa raíz del gate

Se actualizó `tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs` para:

1. incluir `modules/aseguradoras-v1197-ux-bridge.js` entre los scripts servidos que deben pasar sintaxis;
2. esperar primero la señal canónica de Router:

```txt
data-orbit-client-projection-runtime-v20260716
```

3. solo después exigir `Orbit.clientProjection.get`;
4. mantener límites explícitos y diagnóstico sanitizado;
5. no usar `document.readyState`, selectores visuales como prueba de bootstrap ni incrementos ciegos de timeout.

Se actualizó el ejecutor a contrato `1.0.12` y el registro de gates a revisión `runtime-contract-loader-signal-v1`.

## 4. Archivos modificados

Producto/frontend temporal:

- `orbit360-platform/modules/aseguradoras-v1197-ux-bridge.js`

Gate/pipeline:

- `tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs`
- `tools/orbit360-gate-runtime-crm-v20260716.mjs`
- `tools/orbit360-gate-contract-registry-v20260717.json`

Documentación:

- este documento.

Archivos protegidos preservados:

- `data/store.js`;
- `data/store-firestore-lab.local.js`;
- `core/auth.js`;
- `core/legal.js`;
- `core/access-scope.js`;
- `core/importa.js`;
- `firestore.rules`;
- renderers canónicos `modules/cliente360.js` y `modules/aseguradoras.js`.

## 5. Carriles

### Carril A — frontend/prototipo/UX

Avance visible en código: bridge de Aseguradoras vuelve a parsear y deja continuar el grafo del navegador. No se rediseñó ni sustituyó el renderer.

### Carril B — backend/seguridad/gates

Avance: el gate distingue ahora entre:

- script inválido;
- Router aún no iniciado;
- contrato dinámico solicitado;
- owner proyectado disponible.

### Carril C — datos A&S

Preservado sin reimportación:

- clientes: 414;
- aseguradoras: 26;
- asesores: 7;
- pólizas/vehículos/cobros: no cargados ni inferidos.

## 6. Claude/prototipo

Clasificación: `REPLICABLE_CLAUDE_INMEDIATO`.

Patrones reutilizables:

- cualquier bridge o complemento realmente servido debe entrar en el chequeo de sintaxis del runtime;
- la carga de módulos debe distinguir archivo descargado, archivo parseado, loader iniciado, owner registrado y render habilitado;
- no usar una espera corta de un owner como sustituto de comprobar que su loader ya comenzó;
- la proyección de datos importados sigue siendo aditiva, no mutante y sin reimportación;
- un defecto de bridge no autoriza sustituir el renderer canónico.

No se comparte con Claude:

- datos A&S;
- Firebase/LAB;
- credenciales;
- lógica interna de seguridad;
- payloads o artefactos de runtime.

## 7. Academia

Agregar el caso aplicado:

> Cliente 360 no aparece y el gate vence mientras el navegador todavía carga contratos. ¿Se reimportan clientes?

Respuesta correcta:

1. verificar si el dato ya existe;
2. revisar si hubo error de sintaxis;
3. comprobar si Router inició el loader del contrato;
4. clasificar `FUNCTIONAL_DEFECT` o `VALIDATOR_STALE`;
5. no reimportar, no modificar `Orbit.store` y no sustituir el renderer;
6. corregir una sola capa y ejecutar el mismo gate.

La evaluación debe distinguir:

- archivo servido;
- sintaxis válida;
- loader iniciado;
- owner disponible;
- dato hidratado;
- vista renderizada.

## 8. Estado y siguiente acción exacta

Estado: implementación de causa raíz completada; cierre del Bloque 1 pendiente de evidencia del contrato `1.0.12`.

Siguiente acción única:

```txt
Ejecutar el mismo gate block1-client360-insurers-lab-v20260717 sobre el HEAD final del cierre y aceptar únicamente evidencia sanitizada con ok:true.
```

Si el mismo check vuelve a fallar:

```txt
DETENER REINTENTOS
NO CREAR OTRO PARCHE
NO MODIFICAR OTRO MÓDULO
DIAGNOSTICAR EXCLUSIVAMENTE ESA ETAPA
```

Solo después de `ok:true` corresponde una revisión visual única con Paula. No avanzar a M2 ni a Pólizas antes de cerrar M1.
