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

## Evidencia del run congelado

```txt
Run: 29872097446
Artifact: 8511575171
Digest: sha256:809e9f0148593eb24f1aed5340acf00a691d753ffd9548230a8c7dee6829a44a
HEAD: 0cdd36b3136b6fba5ee0f6be6df7b6bc42d90186
Etapa: desktop_direction_client360
Código: INSURER_SECURE_CREDENTIAL_UI_MISSING
```

La publicación Hosting LAB fue correcta y limitada al frontend. El canal sirvió el mismo SHA del run. No se desplegaron Functions ni rules; no hubo escrituras operativas ni producción.

Los conteos permanecieron:

```txt
clientes: 414
aseguradoras: 26
asesores: 7
```

## Hecho determinante

El validador logró esperar exitosamente una `.m1-credential-box` visible y falló inmediatamente después al contar cero cajas.

Esto prueba que el control protegido sí se construyó, pero fue eliminado por un rerender entre la espera y la lectura. El gate no capturó una ficha inexistente ni un dato ausente: capturó una ventana transitoria de DOM no canónico.

## Causa raíz de la primera barrera

La barrera `20260721.1` observaba únicamente scripts con:

```txt
data-orbit-insurer-summary-owner
```

El runtime real de conocimiento no utiliza ese owner para gobernar sus transiciones. Se carga mediante el bootstrap P0.9f, scripts `data-orbit-p09f`, eventos `orbit:aseguradoras:knowledge-loading/ready` y mutaciones posteriores de la ficha.

El contrato visual canónico ya tenía un `MutationObserver`, pero su reparación se programaba para el siguiente `requestAnimationFrame`. La ficha permanecía visible durante ese intervalo. Por eso el gate podía observar el DOM base después del rerender y antes de la reaplicación del contrato visual.

## Corrección en el propietario

Se corrigió la misma barrera, sin crear otro renderer ni otro bridge:

- versión `20260721.2`;
- escucha los eventos reales del runtime de conocimiento;
- intercepta las transiciones de pestañas antes del rerender;
- observa reemplazos dentro de `#asg-ficha`;
- oculta temporalmente la ficha cuando falta el contrato semántico esperado;
- reaplica el owner canónico en pases acotados;
- libera la vista solo cuando la pestaña activa tiene sus controles completos;
- no escribe `Orbit.store`;
- no reimporta;
- no lee ni expone secretos;
- no sustituye `modules/aseguradoras.js`.

El Router carga explícitamente la versión `20260721.2` para impedir que el service worker o el navegador reutilicen la barrera anterior.

## Datos y entornos tocados

```txt
Datos A&S: no modificados
Firestore operativo: sin escrituras
Secret Manager: sin escrituras
Bóveda: no leída
Colombia: intacta
Hosting LAB: el run fallido dejó publicado el SHA 0cdd36b...
Producción: no tocada
Main/merge: no realizados
```

## Impacto Claude / prototipo reutilizable

Clasificación:

```txt
REPLICABLE_CLAUDE_ACUMULADO
```

Patrón reusable: cuando un módulo base es enriquecido por un contrato visual después de cargas asíncronas, la UI no debe quedar visible durante una ventana intermedia sin controles canónicos. La estabilidad debe gobernarse por eventos reales y estado semántico del DOM, no por la mera existencia o carga de un script.

No se comparte backend, credenciales, datos A&S ni detalles de bóveda.

## Impacto Academia

Debe conservarse el aprendizaje ya incorporado sobre:

- diferencia entre dato ausente y render transitorio;
- owner visual canónico;
- eventos de carga y estados honestos;
- por qué no se reimportan datos para corregir visualización;
- por qué un gate puede detectar una ventana inestable aunque el control aparezca durante milisegundos.

No cambia el flujo funcional del usuario; cambia la garantía de estabilidad con la que se presenta.

## Siguiente acción exacta

1. actualizar contrato del gate a `1.0.29` con la barrera event-driven;
2. ejecutar un único preflight estático sin secretos, navegador, Firestore ni deploy;
3. aceptar solo `GO_GATE_CONTRACT` y `ok:true`;
4. únicamente después autorizar una nueva publicación Hosting LAB dirigida y un gate final único;
5. si vuelve a fallar la misma etapa, congelar sin reintento.
