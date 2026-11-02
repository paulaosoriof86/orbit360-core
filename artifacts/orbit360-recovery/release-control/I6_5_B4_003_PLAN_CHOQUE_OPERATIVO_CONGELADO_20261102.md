# GRAVICENTRA INSURANCE — B4-003 | Plan de choque operativo congelado (2-nov-2026)

**Objeto:** ejecutar y cerrar, sin reiniciar diagnósticos ni abrir otra candidata de producto. Esta hoja es un *delta operativo* de los freezes del 29-oct y de los controles históricos; no sustituye `CONTROL_PLANE.json`, la excepción de riesgo de Rules otorgada por Paula el 28-oct, los 15 linajes preservados ni la secuencia I6.

**Única candidata de producto:** `paulaosoriof86/orbit360-core`, `recovery/fase-a-clean-20260831`; fuente operacional congelada para el lote de Preview: `9d1839da8717757baf9adbf1fdfad83cddc41791`. No se crea otra línea de producto. El transporte técnico de GitHub Actions está fijado a ese SHA, despliega `orbit360ScopedPolicyReadPreview` y un Hosting Preview efímero, nunca la función LIVE.

**Prohibiciones:** no declarar UAT real por tests sintéticos, no mezclar GTQ/COP, no ampliar privilegios por un UID observado, no reimportar, no tocar datos reales antes de backup/rollback verificables, no borrar trazas QA ni publicar identificadores personales en GitHub, no promover LIVE sin comprobación de los otros gates.

## Datos físicos reconciliados, sin ambigüedad contable

Fuente: dry-run read-only LAB del 2-nov, run `41462171976`, 443 clientes, 1.425 pólizas, 33 aseguradoras. La investigación privada en la consola autenticada de Firestore cotejó 443 fichas y 1.425 referencias por ID sin emitir PII en CI.

| Partición disjunta | Cantidad | Acción exacta |
| --- | ---: | --- |
| País ya indexado correctamente | 408 (391 GT, 17 CO) | No editar |
| País verificable pero índice físico desalineado | 32 (1 GT, 31 CO) | Copia/ensayo de restore, aplicar solo diferencias, leer después y probar GT/CO/roles |
| País ambiguo sin conjunto de pólizas que lo acredite | 3 | Dirección decide país GT/CO por cliente; no inferir ni modificar antes |
| Referencias de póliza a documento de cliente ausente | 3 distintas | Origen de QA B2 comprobado en fichas (`sourceRef` B2 QA firme y póliza B2-REN); separar el inventario sintético del comercial con trazabilidad, sin borrar ni crear clientes ficticios |

La inferencia por aseguradora es **transversal** y solo procede cuando el país explícito del cliente falta/es ambiguo y el conjunto **completo** de pólizas y aseguradoras verificadas coincide en un único GT/CO. Un domicilio válido del cliente se preserva aun si una póliza es transfronteriza. Las tres decisiones propietarias personales se preguntan en la conversación privada, **no se suben al repositorio público**.

## Ruta crítica, en este orden; nada se convierte en PASS por documentación

| Gate material | Responsable | Salida verificable para mover el estado |
| --- | --- | --- |
| **P0-1. Una fuente y transporte actual** | Asistente | Guard íntegro CI PASS de SHA fuente, `PRODUCT_SOURCE_DRIFT=false`; backend **Preview** actualizado; Hosting efímero creado; `build.json` y hashes de archivos servidos iguales; LIVE sin cambios |
| **P0-2. Control de acceso real, transversal** | Asistente con sesiones que Paula autorice | UAT en la **misma** Preview con dos UIDs independientes (Dirección/Operativo/Asesor), GT/CO/TODOS, recarga y cambio de rol. Operativo `all` lee Clientes en países permitidos, Asesor solo los suyos; negativas comprobadas por UID, tenant, país, rol y módulo. No alcanza `ver:true` solo en UI |
| **P0-3. Datos y relaciones de Clientes/Pólizas** | Asistente; Paula solo 3 decisiones | Confrontación física 443/1.425; QA B2 separado; backup+restore aislado comprobado; actualización idempotente únicamente de los 32 índices con before/after y rollback; los 3 clientes sin referencia resueltos por Paula o explícitamente pendientes sin inventar país |
| **P0-4. Recorridos mínimos del piloto de tesis** | Asistente y Paula/CT01–CT02 | Conservar evidencias históricas S5 Cobros, S6 pago sintético y S7 Renovaciones; repetir solo el delta de país/rol en nueva Preview. Cerrar Lectura de Cliente 360→Póliza→Cobros/Recibo→Renovación/Historial, E4 Reportes GT/CO y totales por moneda, E8 Calidad, y observar E5 Marketing/E6 Plantillas-Notificaciones sin publicación/alta real. Evidencia saneada antes de tesis |
| **P0-5. Persistencia segura y salida** | Asistente; aprobación final Dirección | Ciclo sintético permitido de actualización→recarga→readback→restauración en Ops/Cronograma/Aseguradora/Cobros, copia y restauración de datos ensayada, origen Preview/rollback identificados, y matriz de negativos. Dictamen B4-003 GO/NO-GO sustentado antes de B4-004 a B4-007 e I6.6–I6.9 |

## Límites y priorización para no bloquear el piloto con 44 módulos

El inventario histórico de 44 áreas/15 capacidades se **conserva íntegro**, pero el trabajo de salida se ordena por dependencias y por recorridos del piloto: identidad/país → lectura transversal Cliente/Póliza → Cobros y Renovaciones → evidencia de tesis → persistencia/restore → dictamen. Una aprobación histórica sigue válida para la versión y caso que realmente cubrió; no se le cambia la etiqueta ni se extrapola a un build nuevo. Capacidades P1 sin efecto causal sobre ese recorrido no se reabren para retrasar B4-003, y tampoco se declaran certificadas.

La excepción de riesgo de las Firestore Rules compartidas, aceptada por Paula el 28-oct para LIVE controlado, **no necesita reconfirmación** y **no es SECURITY_PASS**. Se mantienen denegación efectiva del lector, segregación por usuario y los demás controles de backup, restauración y alcance que la excepción no dispensó.

## Disciplina obligatoria para cada siguiente lote

1. Primero comprobar si el hallazgo ya tiene corrección, aceptación o recibo vinculado al SHA; no repetir diagnóstico sin reproducir una diferencia actual.
2. Una corrección por causa raíz y para todos los usuarios afectados, con prueba contrafactual multi-UID/GT/CO, no parche por nombre, UID o cliente de muestra.
3. En el mismo lote: **fuente → CI → despliegue restringido Preview → bytes servidos → UAT real → evidencia**. Un fallo en cualquier flecha deja el caso `PENDING`, no `CLOSED`.
4. Las decisiones de negocio indeterminables se elevan a Paula con nombre/referencia y dos opciones claras; no ejecutar iteraciones técnicas para inventar una respuesta que es suya.
5. Reportar solo deltas medibles: SHA, URL/build, clientes físicos corregidos de 32, excepciones humanas resueltas de 3, UIDs/roles/países probados, restauración acreditada y recorrido del piloto certificado. **I6 formal 50% y B4-003 HOLD** hasta nueva evidencia.

**Estado al congelar:** fuente y pruebas CI PASS; dry-run real PASS; tres decisiones de cliente localizadas privadamente; tres referencias QA B2 identificadas. Workflow de sincronización `41467740294` **SUCCESS**: la función Preview quedó desplegada, el Hosting efímero `https://ays-orbit-360-lab--gi-i65-b4-ca-41467740294-0m0aj1d3.web.app/` pasó byte-readback y las raíces LIVE no cambiaron. Chrome verificó el formulario de inicio de sesión, **no la sesión autenticada ni los permisos de dos usuarios**. **32 escrituras físicas = 0; UAT del runtime actualizado = pendiente; producción = NO-GO**. Actualizar estado solo con recibo de ejecución, no por expectativa.
