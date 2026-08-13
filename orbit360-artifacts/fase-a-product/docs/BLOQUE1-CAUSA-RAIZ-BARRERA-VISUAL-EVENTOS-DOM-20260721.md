# Bloque 1 · Causa raíz definitiva de la inestabilidad visual de Aseguradoras

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Clasificación

```txt
FUNCTIONAL_DEFECT
```

No corresponde a datos, recuperación, Auth, Firestore, secretos, Hosting, caché ni validador obsoleto.

## Evidencia congelada

### Primer run dirigido

```txt
Run: 29872097446
Artifact: 8511575171
Digest: sha256:809e9f0148593eb24f1aed5340acf00a691d753ffd9548230a8c7dee6829a44a
HEAD: 0cdd36b3136b6fba5ee0f6be6df7b6bc42d90186
Etapa: desktop_direction_client360
Código: INSURER_SECURE_CREDENTIAL_UI_MISSING
```

### Segundo run, después de la barrera event-driven

```txt
Run: 29872987103
Artifact: 8511908838
Digest: sha256:2e960b74656f3b3dde6e31f363b67f741a3156a25398d79576dbe6cdbb7d3b40
HEAD: a8d435865ad93caa007dc974ec9f96d8a1a58892
Etapa: desktop_direction_client360
Código: INSURER_SECURE_CREDENTIAL_UI_MISSING
```

Ambas publicaciones Hosting LAB fueron correctas y limitadas al frontend. El canal sirvió el mismo SHA de cada run. No se desplegaron Functions ni rules; no hubo escrituras operativas ni producción.

Los conteos permanecieron:

```txt
clientes: 414
aseguradoras: 26
asesores: 7
```

## Hecho determinante

El validador logró esperar exitosamente una `.m1-credential-box` visible y falló inmediatamente después al contar cero cajas.

Esto demuestra que el control protegido sí se construyó, pero fue eliminado por un rerender entre la espera y la lectura. El gate no capturó una ficha inexistente ni un dato ausente: capturó una ventana transitoria de DOM no canónico.

## Causa raíz por capas

### Capa 1: barrera no conectada al mecanismo real

La barrera `20260721.1` observaba un owner de script que el runtime real no utilizaba para gobernar sus transiciones. Se corrigió en `20260721.2` para escuchar eventos de conocimiento, cambios de pestaña y mutaciones de la ficha.

### Capa 2: owner canónico diferido

El segundo run confirmó que la barrera no era la fuente de verdad correcta. La causa estructural estaba en el owner visual canónico:

1. `modules/aseguradoras.js` reemplaza sincrónicamente `#af-body` cuando cambia la pestaña o se reconstruye la ficha.
2. `core/client-insurer-visual-contract-v20260720.js` agregaba los controles protegidos después, mediante un `MutationObserver` que solo programaba `enhance()` para el siguiente `requestAnimationFrame`.
3. Durante ese intervalo, el DOM base quedaba visible sin `.m1-credential-box` ni las tarjetas bancarias canónicas.
4. Una barrera secundaria podía reducir la ventana, pero no eliminar la causa mientras el owner canónico siguiera siendo post-render.

Causa raíz definitiva:

```txt
El owner visual canónico reparaba las mutaciones de la ficha un frame después del rerender propietario, en lugar de hacerlo dentro del mismo ciclo de mutación del DOM.
```

## Corrección en el propietario canónico

Se corrigió únicamente:

```txt
orbit360-platform/core/client-insurer-visual-contract-v20260720.js
```

Commit inicial del fix:

```txt
e8d5374986ea735da8c2a4584bb66e5affb49110
```

Cambio aplicado:

- `MutationObserver` dirigido al owner canónico;
- detección de reemplazos de `#asg-ficha`, `#af-body` y filas de contactos, portales y bancos;
- ejecución inmediata de `runEnhance()` en el mismo microtask de la mutación;
- guardia contra reentrada;
- `requestAnimationFrame` se conserva solo para eventos externos de sesión, ruta o store;
- metadatos explícitos `synchronousMutationOwner:true` y `mutationMode:'same-microtask'`;
- la barrera `20260721.2` permanece como protección secundaria, no como renderer ni fuente de verdad;
- no se creó otro bridge ni otro renderer;
- no se modificó el módulo funcional de Aseguradoras.

## Datos y entornos tocados

```txt
Datos A&S: no modificados
Firestore operativo: sin escrituras
Secret Manager: sin escrituras
Bóveda: no leída
Colombia: intacta
Hosting LAB: conserva el SHA del segundo run fallido hasta nueva autorización
Producción: no tocada
Main/merge: no realizados
```

## Impacto Claude / prototipo reutilizable

Clasificación:

```txt
REPLICABLE_CLAUDE_ACUMULADO
```

Patrón reusable: si un renderer propietario reemplaza una región del DOM y otro owner aporta controles obligatorios de lectura, la transformación canónica no puede diferirse un frame. Debe ejecutarse atómicamente en el mismo ciclo de mutación o integrarse directamente al renderer propietario. Las barreras son protección secundaria, no sustitutos de ownership.

No se comparte backend, credenciales, datos A&S ni detalles de bóveda.

## Impacto Academia

Debe enseñar:

- diferencia entre dato ausente y render transitorio;
- diferencia entre barrera visual y owner canónico;
- por qué una corrección post-render puede fallar aunque el control aparezca brevemente;
- por qué no se reimportan datos para resolver una ventana de DOM;
- cómo distinguir defecto funcional de fallo de entorno o validador obsoleto.

No cambia el flujo funcional del usuario; cambia la garantía de estabilidad con la que se presenta.

## Siguiente acción exacta

1. registrar contrato `1.0.30` con el owner visual sincrónico;
2. congelar los runs `29872097446` y `29872987103` sin reintento;
3. ejecutar un único preflight estático sin secretos, navegador, Firestore, bóveda ni deploy;
4. aceptar solo `GO_GATE_CONTRACT` y `ok:true`;
5. únicamente después autorizar una publicación Hosting LAB dirigida y el mismo gate final único;
6. si vuelve a fallar la misma etapa, detener completamente la automatización y no crear otro parche.
