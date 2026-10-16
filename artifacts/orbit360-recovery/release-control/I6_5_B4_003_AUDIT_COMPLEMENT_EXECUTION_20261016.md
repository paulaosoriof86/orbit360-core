# Gravicentra Insurance — arranque y continuidad del complemento

Fecha: 2026-10-16.
Estado: USER_AUTHORIZATION_RECORDED_LOCAL_CAUSAL_PROOF_READY_PRODUCT_INTEGRATION_PENDING.
Gate: I6.5/B4-003. Documento subordinado a CONTROL_PLANE.json; no crea gate, executor, rama ni autoridad paralela.

## Autorización registrada
Paula solicitó congelar, arrancar y conservar la ejecución independientemente de la conversación, e informar en cada entrega qué se logró, porcentaje, siguiente acción y cuándo visualizar cada bloque solucionado. Se conserva el plan de 86 tareas I6_5_B4_003_AUDIT_COMPLEMENT_PLAN_FROZEN_20261016.md, blob 4d617c53f30ff144d0914b7e1978f376d204796b, y los 295 IDs del ledger/carry existente.

Esta autorización habilita continuar la corrección causal y preparar la integración dentro del gate vigente. No declara aceptados cambios funcionales, no autoriza por sí sola publicación LIVE, cambios de reglas compartidas, permisos reales, eliminación de datos ni reimportaciones. Antes de integrar product source se debe reconciliar la autorización concreta en Control Plane y lock B4, manteniendo los límites de seguridad y el guard. Este comprobante no elude esa obligación.

## Trabajo material realizado
Tarea del complemento: C03.04, subcaso validación de registro anterior. No cierra toda C03.04 ni el P0 de permisos.
Owner existente: functions/product-operational-domain.js.
Source base: 61bbd6d4bc9e687fa698c129e4ffd4fb4fb085b7.
Patch candidato: 1411d6d3e40908e558547dfe2db71c4945439779.
El código anterior autorizaba el registro resultante sin comprobar separadamente el registro leído del servidor antes de la modificación. El parche verifica ese estado anterior y conserva la comprobación del estado posterior.

Prueba local reproducible: tools/gravicentra-b4-003-before-image-regression.test.cjs.
Base: 8/12 controles satisfechos; 4 fallos discriminantes.
Candidato: 12/12 controles satisfechos; 0 fallos. Sintaxis válida.
Casos recuperados: registro ajeno convertido a propio, país ajeno convertido a autorizado, registro externo convertido a miembro de equipo y lote mixto que no debe confirmar parcialmente.
Controles preservados: edición propia, rechazo de contenido ajeno y destino no autorizado, edición de miembro de equipo, reasignación con alcance autorizado, alta propia e idempotencia.
Solo ejecución aislada en memoria: 0 peticiones externas, 0 writes operativos. El parche NO se aplicó al product source del repositorio, no está desplegado y no existe Preview nueva certificada por este comprobante.

## Primera continuación obligatoria
1. Leer HEAD, Control Plane, lock B4, composición y evidencia vigente; no reconstruir desde este chat.
2. Reconciliar autorización exacta C03.04 con Control Plane/lock B4 sin retirar los HOLD de reglas, datos y LIVE.
3. Integrar parche y binding de composición en un commit atómico sobre la rama vigente con expected HEAD; no aplicar si cambió el blob base sin reconciliar el diff.
4. Ejecutar el discriminante antes/después y la regresión afectada en el executor ya existente. No crear un workflow transportador nuevo.
5. Solo con esas pruebas, construir el nuevo artefacto y ejecutar Preview aislada autorizada. La seguridad P0 general sigue abierta hasta completar negativos reales.
6. Publicar checkpoint terminal con commit, prueba, build/digest cuando exista, estado y siguiente tarea material. Un fallo conserva el checkpoint y no repite applies ni cierres válidos.

## Entrega incremental a Paula
Cada entrega indica: cambio en palabras; casos probados y no probados; IDs/tareas cerrados; porcentaje formal anterior, incremento y resultante; progreso por integración solo con denominador adjudicado; siguiente acción; tiempo real empleado; Preview exacta y guía de revisión cuando esté acreditada.
Estado formal de referencia verificado: I6 50%; incremento funcional de este comprobante 0 puntos; resultado 50%. 12/12 es cobertura del discriminante, NO 100% de permisos ni de plataforma. Integraciones N/D mientras se adjudica la evidencia vigente.

No esperar al final de toda la plataforma para visualizar. Un bloque se ofrece cuando su candidata acumulativa tiene identidad exacta, readback y pruebas funcionales pertinentes. Indicar expresamente lo que aún no debe probarse y no presentar una Preview vieja como corrección nueva. Conservar la aceptación humana requerida antes de avanzar de bloque.

## Límites de continuidad
La persistencia del trabajo sí queda en GitHub. Este commit NO instala ni afirma un ejecutor autónomo continuo. La vigilancia de avances no ejecuta correcciones. No prometer trabajo desatendido inexistente ni una fecha exacta sin ejecución medida.
