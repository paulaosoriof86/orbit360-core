# Bloque 1 · STOP THE LINE por ciclo de mutaciones del owner visual

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Estado

```txt
STOP_THE_LINE
NO_MORE_AUTOMATED_RETRIES
```

## Evidencia del último run autorizado

```txt
Run: 29874622250
Artifact: 8512525513
Digest: sha256:508fd1416b25db10b744708f4c5364b7aac6b6ce21a17a526ef094eb0cf1f7c3
HEAD desplegado: c835e88bb4df0c617c7c06fba32252933a739e13
```

Pasaron correctamente:

- autorización sin credenciales;
- contrato `1.0.31`;
- validación estática de owners y sintaxis;
- identidad LAB;
- instalación read-only;
- conteos 414 clientes, 26 aseguradoras y 7 asesores;
- publicación Hosting LAB dirigida;
- verificación del SHA publicado;
- ejecución del script conjunto del gate.

La validación final rechazó el resultado sanitizado porque:

```txt
ok: false
stage: desktop_direction_client360
error: locator.click timeout al abrir [data-tab="plataformas"]
```

El log confirma que el botón estaba visible, habilitado y estable, el navegador inició el clic y el evento no logró finalizar dentro de 15 segundos.

## Datos y entorno

```txt
Hosting LAB: publicado correctamente
Firestore: lectura solamente
Clientes: 414
Aseguradoras: 26
Asesores: 7
Escrituras operativas: 0
Functions desplegadas: no
Rules desplegadas: no
Producción: no tocada
Bóveda: no leída
Colombia: intacta
```

## Clasificación

```txt
FUNCTIONAL_DEFECT
```

No es un fallo de datos, recuperación, autorización, Hosting, contrato, sintaxis, secretos ni entorno.

## Causa raíz

La corrección del owner canónico eliminó el diferimiento a `requestAnimationFrame`, pero hizo que el `MutationObserver` llamara a `runEnhance()` en el mismo microtask para cualquier mutación dentro de `#asg-ficha`.

El mismo `runEnhance()` produce mutaciones propias. En particular:

```txt
enhancePortals()
```

reescribe incondicionalmente la nota de la pestaña con `note.innerHTML = ...` en cada ejecución, incluso cuando el contenido ya es el mismo.

Secuencia resultante:

```txt
clic en Plataformas
→ modules/aseguradoras.js reemplaza #af-body
→ MutationObserver ejecuta runEnhance()
→ enhancePortals() transforma las filas y vuelve a escribir la nota
→ esa escritura genera otra mutación dentro de #asg-ficha
→ el mismo observer ejecuta runEnhance() otra vez
→ la nota se vuelve a escribir
→ ciclo de microtasks
→ el evento de clic no retorna
```

La guardia `enhancing` solo evita reentrada dentro de la misma llamada síncrona. No bloquea la siguiente entrega del `MutationObserver`, que ocurre después de que `enhancing` vuelve a `false`.

## Conclusión metodológica

La causa raíz anterior —owner diferido— era real, pero la forma elegida para volverlo sincrónico introdujo una autorretroalimentación. No corresponde otro parche inmediato ni otro gate.

El problema debe corregirse primero con una estrategia de ownership idempotente y demostrable, por ejemplo:

1. el observer solo procesa nodos base nuevos que aún no tienen marca canónica;
2. el owner no vuelve a escribir atributos, clases, `innerHTML` o `textContent` si el valor ya coincide;
3. el observer se desconecta durante las mutaciones propias y se reconecta al finalizar;
4. se evita observar toda la ficha cuando basta con observar reemplazos directos de `#af-body`;
5. preferentemente, los controles obligatorios de lectura se integran en el renderer propietario de Aseguradoras en vez de depender de una transformación posterior.

Antes de cualquier nuevo navegador deben existir pruebas estáticas o unitarias que demuestren:

```txt
una mutación base → una transformación canónica → cero mutaciones propias posteriores
```

## Impacto Claude / prototipo

Clasificación:

```txt
REPLICABLE_CLAUDE_ACUMULADO
```

Patrón reusable: un `MutationObserver` no puede reaccionar indefinidamente a las mutaciones que él mismo provoca. Toda transformación visual posterior al renderer debe ser idempotente, limitada y con ownership explícito.

No se comparte backend, datos A&S, credenciales ni bóveda.

## Impacto Academia

Agregar el caso práctico:

- diferencia entre reentrada síncrona y nueva entrega del observer;
- cómo una escritura aparentemente inocua de `innerHTML` puede crear un ciclo;
- por qué un gate puede pasar sintaxis y contrato, pero bloquearse en interacción real;
- por qué después de repetición se detienen reintentos y se exige prueba determinista antes de navegador.

## Siguiente acción exacta

```txt
No ejecutar otro gate.
No desplegar nuevamente.
No modificar otro módulo.
Diseñar y probar estáticamente una estrategia idempotente del owner visual que produzca cero mutaciones propias recurrentes.
Solo después de evidencia determinista se podrá registrar un nuevo contrato y solicitar autorización separada.
```
