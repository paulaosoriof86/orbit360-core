# DELTA CLAUDE REPLICABLE — REGLAS TARIFARIAS Y SEGUNDO GATE v1.208

Fecha: 2026-07-12  
Estado: `REGISTRADO_PARA_AUDITAR_PROXIMA_CANDIDATA`  
Acción inmediata sobre Claude: `NO INTERRUMPIR / NO REINICIAR / NO ENVIAR COMO NUEVA BASE`

## 1. Regla de continuidad

Claude continúa sobre su última candidata. Cuando entregue la siguiente versión:

1. esa candidata será la única base visual;
2. se verificará qué patrones de este delta ya incorporó;
3. no se pedirá nuevamente lo atendido;
4. solo se adaptarán faltantes reutilizables;
5. no se copiarán configuraciones, fuentes, reglas ni decisiones de un tenant.

## 2. Patrón reusable — ciclo de capacidad

La interfaz debe distinguir claramente:

```txt
Sin configuración
Fuente recibida
Extracción propuesta
Requiere revisión
Reconciliada
Binding completo
Lista para aprobación
Aprobación pendiente de guardado
Habilitada y verificada
Deshabilitada
Bloqueada por incompatibilidad
```

No son sinónimos:

- archivo cargado;
- regla extraída;
- regla validada;
- binding completo;
- plan de habilitación construido;
- habilitación persistida;
- capacidad operativa.

## 3. Patrón reusable — segundo gate

Una acción que habilita Cotizador, PDF externo o Comparativo debe mostrar:

- combinación concreta que se habilita;
- país y moneda;
- aseguradora;
- producto/plan/riesgo;
- fuente y versión;
- regla y presentación asociadas;
- validaciones superadas;
- bloqueos pendientes;
- estado anterior;
- estado propuesto;
- motivo obligatorio;
- confirmación reforzada;
- rol activo;
- resultado de guardado/verificación.

El botón debe permanecer deshabilitado mientras exista cualquier bloqueo.

## 4. Patrón reusable — habilitación granular

La habilitación no aplica automáticamente a toda una aseguradora. Se realiza por combinación:

```txt
aseguradora
+ país
+ moneda
+ ramo/producto
+ plan o variante
+ tipo de riesgo
+ versión de fuente
+ presentación
```

Una variante no puede heredar reglas de otra solo porque pertenece a la misma compañía o ramo.

## 5. Patrón reusable — cálculo no soportado

Cuando el motor no soporta un esquema tarifario, la UX debe mostrar lenguaje operativo:

```txt
Esta forma de cálculo todavía requiere configuración adicional.
No se generó una prima automática.
Puedes registrar una cotización recibida para continuar con revisión humana.
```

No debe:

- calcular parcialmente;
- usar una tasa genérica;
- sustituir por cero;
- presentar un total estimado como cotización;
- exponer códigos técnicos del motor.

## 6. Patrón reusable — trazabilidad del cálculo

Para roles autorizados, el detalle debe permitir conocer:

- configuración utilizada;
- versión de fuente;
- fecha del cálculo;
- componentes aplicados;
- prima neta;
- gastos;
- impuestos;
- financiamiento;
- total;
- estado de validación.

Para el cliente final solo se muestra la información comercial pertinente, no IDs internos ni arquitectura.

## 7. Patrón reusable — deshabilitación

Deshabilitar una capacidad debe requerir:

- rol autorizado;
- motivo;
- confirmación;
- antes/después;
- auditoría;
- confirmación de guardado.

Deshabilitar no elimina:

- documentos;
- reglas;
- presentaciones;
- historial;
- comparativos previos;
- auditoría.

## 8. Estados honestos sugeridos

| Estado interno | Texto visible sugerido |
|---|---|
| `requires_validation` | Requiere revisión |
| `complete_requires_gate` | Lista para aprobación |
| `approved_pending_external_write` | Aprobación pendiente de guardado |
| `ready_for_external_write` | Lista para guardar |
| `enabled` | Habilitada y verificada |
| `disabled` | Deshabilitada |
| `unsupported_calculation` | Configuración adicional requerida |
| `binding_changed` | La configuración cambió; revisa nuevamente |
| `read_model_pending` | Guardado en proceso de verificación |

Los códigos internos no deben mostrarse literalmente.

## 9. Academia reusable

### Dirección / AdminTenant

Debe aprender:

- diferencia entre validar y habilitar;
- cómo revisar una combinación;
- por qué se exige motivo y confirmación;
- cómo interpretar antes/después;
- cómo deshabilitar sin borrar historial;
- qué hacer cuando cambia la fuente o versión;
- por qué una aprobación debe repetirse si cambia el binding.

### Operativo

Debe aprender:

- cómo identificar una fuente pendiente;
- cómo revisar prima, gastos, impuestos y financiamiento;
- cuándo registrar una cotización recibida;
- cómo reportar una inconsistencia;
- qué significa “Configuración adicional requerida”.

### Asesor

Debe aprender:

- qué productos están realmente habilitados;
- cómo reconocer un estado pendiente;
- por qué no debe usar una prima bloqueada;
- cómo continuar mediante cotización recibida;
- cómo explicar al cliente que una propuesta está en revisión.

### Evaluación mínima

La evaluación debe comprobar que la persona distingue:

1. regla validada vs capacidad habilitada;
2. plan construido vs guardado confirmado;
3. variante compatible vs variante distinta;
4. cálculo bloqueado vs prima real;
5. deshabilitación vs eliminación.

## 10. Backend reusable como referencia, no para reimplementar

Claude solo debe representar visualmente estos contratos:

```txt
build enablement plan
validate role/reason/confirmation
show blockers
show expected before/after
persist through external writer
confirm read model
show enabled/disabled
```

Claude no debe:

- crear un writer propio;
- tocar Orbit.store;
- usar Firebase/Firestore directo;
- copiar runtime tenant;
- declarar una habilitación real;
- inventar respuestas de backend.

## 11. Exclusiones absolutas

No incluir en la candidata:

- nombres o IDs de fuentes reales;
- aseguradoras reales como datos operativos;
- tasas;
- fórmulas particulares;
- documentos;
- aliases internos;
- credenciales;
- links;
- configuraciones tenant;
- decisiones reales de aprobación.

## 12. Criterio para la próxima auditoría

La próxima candidata se revisará buscando:

```txt
[ ] estados de capacidad diferenciados
[ ] segundo gate comprensible
[ ] motivo y confirmación reforzada
[ ] antes/después
[ ] mensajes honestos de cálculo no soportado
[ ] deshabilitación trazable
[ ] Academia por rol
[ ] cero datos específicos de tenant
[ ] cero backend reimplementado
```

Solo se solicitarán los puntos que realmente falten en la candidata entregada.
