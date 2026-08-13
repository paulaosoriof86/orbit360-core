# ACTUALIZACIÓN DELTA PARA CLAUDE — ASEGURADORAS v1.202

Fecha: 2026-07-11  
Estado: cambios posteriores a candidata Claude v1.197.  
Uso: obligatorio en el siguiente paquete acumulado Claude.

## Baseline que no puede perderse

```txt
Aseguradoras v1.197 empalmada
+ motor _fuentes vivo
+ contratos recursos seguros v1.197
+ importador GT/CO v1.202
+ guard backend v1.202
+ campos sensibles por referencia v1.202
+ ficha operativa y Academia v1.202
```

## Fuente real y separada

```txt
directorio_aseguradoras
```

Los directorios de Guatemala y Colombia son libros multihoja y deben importarse por país, sin mezclarlos.

El importador:

- excluye índices/diagnósticos/soporte;
- detecta identidad por hoja;
- clasifica aseguradora vs aliado/red;
- mapea contactos, plataformas y bancos/pagos;
- deduplica país + nombre;
- bloquea mismatch y duplicados;
- genera dry-run;
- exige motivo y `CONFIRMO DIRECTORIO`;
- aplica solo filas validadas;
- crea gestiones para bloqueadas.

## Seguridad obligatoria

Nunca colocar en prototipo, seed, DOM persistente, ZIP o documentación:

- usuarios completos;
- contraseñas;
- números bancarios completos;
- URLs privadas o con tokens.

Patrones:

```txt
credentialRef = backend_required
accountRef = backend_required
documentRef
urlRef = backend_required
```

La ficha puede mostrar hints enmascarados. Ver/copiar solo se habilita cuando un proveedor backend seguro devuelve estado `disponible`, con permiso, auditoría y TTL.

La escritura de datos reales queda bloqueada en el store local del prototipo. El dry-run sí puede visualizarse.

## UX que la próxima candidata debe conservar

- directorio operativo, no módulo técnico;
- ficha en página completa con regreso;
- resumen, contactos, plataformas, bancos/pagos, productos, documentos, conocimiento y actividad;
- origen y calidad de datos;
- país y moneda visibles;
- recursos sensibles con estado honesto;
- alta manual con país obligatorio y deduplicación;
- importación multihoja desde Aseguradoras;
- KPI con detalle;
- responsive móvil/tablet/escritorio;
- sin notas técnicas en UI cliente.

## Relación con Cotizador/Comparativo

Importar un directorio NO habilita por sí solo una aseguradora en Cotizador.

La disponibilidad requiere:

```txt
aseguradora vinculada
+ país/moneda
+ ramo/producto/plan
+ fuente tarifaria vigente y validada
+ habilitación explícita
```

No inferir tarifas desde contactos, plataformas, cuentas o pólizas.

## Bloqueos reales que deben mantenerse

Colombia:

- aliado/red no es aseguradora directa;
- duplicados internos deben resolverse;
- identidad de hoja y contenido debe coincidir.

No resolver estos casos con supuestos visuales.

## Archivos que Claude no debe sobrescribir

```txt
core/importa-dryrun-p0.js
core/insurer-directory-import-v1202.js
core/insurer-directory-import-v1202-security.js
core/secure-resource-fields-v1202.js
modules/aseguradoras-v1202-import-bridge.js
modules/aseguradoras-v1202-resources-bridge.js
data/academia-v1202-directorios-aseguradoras.js
```

Claude debe traducir el impacto a UX/Academia, no reimplementar backend ni incluir datos reales.

## Academia obligatoria

Enseñar por rol:

- país explícito;
- hojas operativas vs soporte;
- dry-run;
- duplicados y validación;
- contactos por área;
- plataformas;
- cuentas/pagos;
- seguridad de referencias;
- Aseguradoras → Cotizador → Comparativo;
- límites del Asesor.

## Rechazo automático

Rechazar una candidata futura si:

- vuelve a una aseguradora piloto como centro del módulo;
- crea borradores sin país;
- mezcla GT/CO;
- muestra o persiste secretos/cuentas;
- importa directo sin dry-run;
- crea clientes/pólizas/cobros desde el directorio;
- habilita tarifas por tener contactos o accesos;
- elimina el motor `_fuentes`;
- omite cambios v1.198–v1.202 del CRM/Academia;
- sustituye la ficha en página por modal como única vista.
