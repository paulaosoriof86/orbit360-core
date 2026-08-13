# Reporte dry-run aislado — primera fuente A&S P0.9c

Fecha: 2026-07-10  
Tenant: Alianzas y Soluciones  
Fuente: tarifario Excel de Aseguradora Guatemalteca  
Estado: `DRY_RUN_AISLADO_OK / STORE_OPERATIVO_SIN_CAMBIOS / VALIDACION_PENDIENTE`

## 1. Propósito

Comprobar que una fuente real ya auditada puede recorrer la cadena P0.9c y quedar asociada a una aseguradora del tenant sin activar Cotizador ni Comparativo.

Este ejercicio no fue una carga productiva ni una escritura en Firestore LAB.

## 2. Cadena ejecutada

```text
referencia autorizada ficticia de Drive
→ resolver backend de prueba
→ archivo real montado
→ validación de ruta
→ cálculo de hash
→ runner P0.9c
→ bridge P0.9c
→ registry P0.9
→ service Aseguradoras
→ plan metadata-only
→ store aislado en memoria
→ read model
→ auditoría
```

## 3. Fuente

Se utilizó el archivo real previamente auditado:

```text
Tasas AseGuate.xlsx
```

Datos operativos del archivo usados únicamente para la prueba:

```text
tamaño: 10,683 bytes
hojas detectadas en preflight: 1
```

No se publicaron:

- tasas;
- primas mínimas;
- fórmulas;
- nombres de clientes;
- payload completo;
- hash completo;
- ruta local.

## 4. Alcance de la extracción en este dry-run

La extracción tarifaria completa ya había sido ejecutada y documentada en P0.6b.

Para este dry-run P0.9c se utilizó un adaptador ligero y aislado que comprobó:

- apertura del contenedor Excel;
- cantidad de hojas;
- hash de integridad;
- propagación de tenant/aseguradora/documento;
- contrato metadata-only;
- orquestación hasta `Orbit.store`.

Por tanto, este reporte valida el **wire y la persistencia aislada**, no reemplaza la extracción numérica P0.6b ni constituye una segunda auditoría de tarifas.

## 5. Asociación utilizada

```text
tenantId: alianzas-soluciones
aseguradora: Aseguradora Guatemalteca
documento: tarifario v1
país: GT
moneda: GTQ
ramo: Vehículos
producto: Seguro de vehículo
estado: requiere_validacion
```

La referencia visible se incorporó al arreglo `aseguradoras.docs[]` del store aislado.

El manifiesto y la propuesta se almacenaron en las colecciones profundas correspondientes.

## 6. Resultado del read model

```text
fuentes: 1
manifiestos: 1
propuestas: 1
reglas tarifarias: 0
presentaciones: 0
bindings: 0
pendientes de validación: 2
Cotizador habilitado: 0
Comparativo habilitado: 0
```

Código del writer:

```text
METADATA_PERSISTED_PENDING_ENABLEMENT
```

## 7. Auditoría

Se verificó un evento de persistencia con:

```text
containsRawPayload: false
containsCustomerPayload: false
containsSecrets: false
enablesCotizador: false
enablesComparativo: false
```

La auditoría conserva actor, rol activo, tenant, aseguradora, documento, motivo y operaciones, pero no el contenido tarifario.

## 8. Qué demuestra

El dry-run confirma que:

1. una fuente A&S puede asociarse a su aseguradora desde el runtime reusable;
2. la ruta local no llega al frontend ni al store;
3. el manifiesto queda tenant-scoped;
4. la fuente visible y el conocimiento profundo permanecen sincronizados;
5. el read model devuelve el estado esperado;
6. persistir no habilita módulos;
7. la misma arquitectura sirve para otros tenants.

## 9. Qué no demuestra todavía

- provider Drive/upload productivo;
- ejecución del extractor real desde un backend desplegado;
- escritura en Firestore LAB;
- persistencia definitiva del tarifario AseGuate;
- revisión humana de reglas;
- binding automático;
- activación de Cotizador o Comparativo.

## 10. Estado operativo real

```text
fuente identificada y auditada: sí
runner/bridge implementados: sí
dry-run aislado de asociación: sí
persistencia en store operativo: no
persistencia en Firestore LAB: no
habilitación: no
```
