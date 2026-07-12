# Metodología canónica — auditoría, retroalimentación y paquetes para Claude

Fecha: 2026-07-12  
Proyecto: Orbit 360 A&S  
Rama protegida: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5` draft/open; sin merge, deploy, producción ni `main`.

## 1. Propósito

Esta metodología regula toda recepción, inspección, retroalimentación, corrección y empalme de candidatas generadas por Claude.

Busca evitar cinco errores recurrentes:

1. aceptar como implementado lo que solo aparece en documentación o en la respuesta de Claude;
2. volver a pedir trabajo ya resuelto;
3. entregar paquetes demasiado extensos o contradictorios;
4. mezclar prototipo reusable con backend protegido o configuración específica A&S;
5. frenar el carril operativo A&S con ciclos innecesarios de retroalimentación.

## 2. Regla de baseline

Toda auditoría parte de:

```txt
última candidata física de Claude
+ candidata inmediatamente anterior aceptada/auditada
+ último paquete realmente enviado
+ cambios locales reutilizables posteriores
+ documentación viva de pendientes
```

Nunca partir de memoria, de una versión antigua ni de la afirmación verbal de Claude.

Claude siempre corrige sobre su última candidata física. No reconstruye desde cero ni recibe una copia vieja como nueva base, salvo rollback explícito.

## 3. Carriles y propiedad

Antes de generar cualquier instrucción, cada hallazgo se clasifica:

```txt
A — Claude/prototipo reusable: UX, navegación, módulos, copy, responsive, Academia y contratos visibles.
B — Backend protegido: seguridad, Auth, Orbit.store, Firestore, writers, runners, reglas y contratos internos.
C — Tenant A&S/datos reales: tasas, reglas, fuentes, links, documentos, directorios, bindings y operación real.
```

También se marca:

```txt
YA_IMPLEMENTADO — conservar; no reprocesar.
REUSABLE_LOCAL — adaptar en la próxima candidata.
EXCLUSIVO_A&S — no enviar a Claude.
BACKEND_PROTEGIDO — compartir solo comportamiento esperado, nunca implementación ni archivos.
NO_DEMOSTRADO — puede existir, pero falta evidencia física/funcional.
```

## 4. Auditoría de cada candidata como mini-release

### Fase 1 — Identidad e integridad

Registrar obligatoriamente:

- nombre exacto del ZIP;
- SHA256;
- versión interna;
- número total de archivos;
- inventario de `index`, `core`, `modules`, `data`, `styles`, `docs`;
- archivos añadidos, modificados y eliminados respecto de la candidata anterior;
- hashes de archivos protegidos;
- errores de extracción o estructura.

Una entrada de `CHANGELOG` no demuestra implementación.

### Fase 2 — Delta físico primero

Antes de leer la explicación de Claude, determinar qué archivos cambiaron realmente.

Si Claude afirma haber corregido un módulo y el archivo correspondiente permanece idéntico, la afirmación queda como `NO_EVIDENCIADA` hasta demostrar un bridge o contrato externo que altere el comportamiento.

### Fase 3 — Verificación de afirmaciones

Cada afirmación de “ya implementado” requiere:

```txt
archivo
+ función/bloque
+ comportamiento observable
+ prueba ejecutada
+ resultado
```

No son evidencia suficiente:

- documentación;
- comentarios de código;
- nombre de una función;
- existencia de un botón sin flujo;
- una pantalla que no persiste;
- una respuesta verbal de Claude;
- un grep aislado sin revisar contexto.

### Fase 4 — Matriz de estado

Cada requisito se clasifica como:

```txt
IMPLEMENTADO_Y_VERIFICADO
IMPLEMENTADO_PARCIAL
PENDIENTE
REGRESIÓN
NO_DEMOSTRADO
FUERA_DE_ALCANCE_CLAUDE
SUPERADO_NO_REPETIR
```

La matriz debe indicar archivo/función, evidencia, impacto y siguiente acción.

### Fase 5 — Validación técnica y funcional

Como mínimo:

- sintaxis de todos los JS/MJS;
- scripts del `index` existentes, ordenados y sin duplicados;
- rutas y módulos visibles;
- almacenamiento únicamente mediante `Orbit.store`;
- permisos y rol activo;
- país, moneda e impuestos configurables;
- estados honestos;
- persistencia y recuperación tras recarga;
- trazabilidad y auditoría en acciones sensibles;
- copy técnico visible;
- responsive en escritorio/tablet/móvil;
- impacto Academia;
- hashes byte-identical de protegidos.

Los validadores deben eliminar comentarios antes de buscar patrones ejecutables y revisar contexto semántico para evitar falsos positivos.

## 5. Severidad y decisión de paquete

### P0 — crítico/bloqueante

Incluye:

- cálculo falso o hardcode comercial peligroso;
- pérdida, corrupción o persistencia engañosa de datos;
- flujo principal roto;
- bypass de validación, permisos o confirmación;
- secretos/copy técnico sensible visible a roles no autorizados;
- afirmar enviado, guardado, habilitado o conciliado sin confirmación real;
- contaminación A&S en prototipo reusable;
- sobrescritura de backend protegido;
- regresión de una capacidad aceptada.

### P1 — importante no bloqueante

UX profunda, responsive, Academia incompleta, viewer no transversal, estados vacíos, ficha secundaria o mejora funcional que no compromete cálculo, seguridad, datos ni operación principal.

### P2 — mejora/pulido

Copy menor, alineación visual, microinteracciones o documentación secundaria.

### Gate de decisión

```txt
Si existe al menos un P0 real:
→ NO empalmar la candidata completa.
→ rescatar únicamente mejoras independientes si es seguro.
→ generar UN paquete crítico pequeño para Claude.

Si no existe P0:
→ NO generar otro paquete.
→ documentar P1/P2.
→ empalmar selectivamente.
→ actualizar baseline.
→ continuar inmediatamente carriles B/C.
```

No se genera paquete por acumulación histórica, por comodidad ni por asuntos que puede cerrar ChatGPT/Codex en A&S.

## 6. Forma obligatoria del paquete Claude

Máximo:

```txt
00_LEEME
01_AUDITORIA_Y_MATRIZ
02_PROMPT_UNICO
03_VALIDADOR_EJECUTABLE
04_CHECKLIST_ENTREGA
MANIFEST-SHA256
```

Opcional: hashes de protegidos, nunca sus contenidos.

El paquete no incluye:

- documentación histórica completa;
- múltiples prompts alternativos;
- fuentes o datos reales A&S;
- tasas, reglas, links o aseguradoras reales;
- runtime tenant;
- Auth/Firestore/backend;
- archivos protegidos;
- instrucciones que no correspondan a Claude.

## 7. Contenido del prompt único

Debe separar claramente:

1. **Conservar — no rehacer**.
2. **Corregir — P0 verificables**.
3. **No tocar — backend/protegidos/A&S**.
4. **Dejar documentado — P1/P2**.
5. **Pruebas y evidencia de entrega**.

No usar frases ambiguas como “mejorar”, “completar” o “revisar” sin criterio observable de aceptación.

## 8. Validación posterior a la entrega

Al recibir la siguiente candidata:

1. comparar únicamente contra la candidata que Claude corrigió;
2. ejecutar el validador entregado;
3. revisar manualmente las funciones críticas;
4. comprobar que el validador no falle por comentarios o documentación;
5. confirmar hashes de protegidos;
6. actualizar la matriz: atendido/parcial/pendiente/regresión;
7. decidir paquete o empalme mediante el gate P0.

No se envía otra corrección si no hay P0.

## 9. Cambios locales reutilizables

Todo cambio realizado por ChatGPT/Codex debe registrar:

```txt
cambio local
clasificación: reusable / A&S / backend / ya presente
módulos impactados
comportamiento visible esperado
copy/estado requerido
Academia impactada
riesgo si Claude no lo adapta
```

La próxima auditoría compara ese registro contra la candidata. No se envía automáticamente un nuevo paquete mientras Claude trabaja; se cosecha sobre su siguiente entrega.

## 10. Academia

Cada cambio operativo responde:

- ¿modifica una ruta por rol?;
- ¿requiere lección o caso práctico?;
- ¿requiere quiz/evaluación?;
- ¿cambia permisos, estados o gates?;
- ¿requiere actualizar manual/certificado?;

No crear cursos duplicados. Actualizar el curso existente cuando la competencia ya está cubierta.

## 11. Evidencia mínima de Claude

Toda entrega debe incluir un único manifiesto con:

```txt
ZIP SHA256
versión interna
inventario
delta exacto
requisito → archivo → función → prueba → resultado
pruebas ejecutadas
capturas/evidencia responsive cuando aplique
pendientes honestos
hashes de protegidos
```

La frase “ya estaba implementado” sin esa evidencia no cierra el requisito.

## 12. Refuerzo de instrucciones

### Frase corta para instrucciones del proyecto

```txt
Para cada candidata Claude, aplicar `METODOLOGIA-CANONICA-PAQUETES-CLAUDE-AUDITORIA-RETROALIMENTACION-20260712.md`: auditar delta físico y afirmaciones con evidencia; clasificar A/B/C y P0/P1/P2; generar un único paquete pequeño solo si queda P0; si no hay P0, documentar pendientes, empalmar selectivamente y continuar operación A&S.
```

### Documento maestro

El documento maestro debe referenciar esta metodología como obligatoria en la sección “Regla para cada nuevo candidato Claude”. No se debe copiar allí el texto completo para evitar divergencias.

## 13. Regla de velocidad operativa

Una candidata sin P0 no puede detener el plan operativo por otra ronda de Claude.

```txt
0 P0 → empalme selectivo + baseline + continuar B/C.
P0 → un único paquete crítico + continuar en paralelo B/C cuando sea seguro.
```

## 14. Regla final

Antes de creer una afirmación, comprobar el archivo. Antes de pedir trabajo, verificar que no esté hecho. Antes de crear paquete, comprobar que exista P0. Antes de empalmar, proteger backend. Después de empalmar, continuar operación.