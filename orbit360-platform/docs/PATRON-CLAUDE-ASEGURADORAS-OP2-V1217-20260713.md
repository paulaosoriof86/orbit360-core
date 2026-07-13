# Patrón reusable para Claude — Aseguradoras OP-2 v1.217

Fecha: 2026-07-13  
Proyecto: Orbit 360  
Aplicación: prototipo comercializable y todos los tenants

## Propósito

Registrar el comportamiento que una futura candidata Claude debe conservar cuando modifique Aseguradoras, Importador, Cotizador, Comparativo o Academia. No contiene datos, credenciales, cuentas, usuarios ni configuraciones exclusivas de A&S.

## 1. Aseguradoras es un módulo operativo y estratégico

No debe presentarse como una pantalla técnica de tarifas. La ficha debe reunir, según permisos:

- identidad, país y moneda;
- código de intermediario;
- oficina, emergencias y WhatsApp;
- contactos por área;
- plataformas y estado de acceso;
- bancos y medios de pago;
- productos, planes y requisitos;
- documentos y Drive;
- fuentes para Cotizador/Comparativo;
- comisiones configurables;
- calidad, trazabilidad y actividad.

Debe existir directorio, KPI con detalle, ficha-página con regreso y pestañas operativas.

## 2. Visibilidad por rol

```txt
Dirección/Admin: consulta y administración según matriz
Operativo: consulta y edición operativa según permiso central
Asesor: consulta del directorio y creación de gestiones de corrección
```

Mostrar el módulo no amplía automáticamente:

- scope de clientes;
- acceso a secretos;
- permisos de importación;
- edición administrativa;
- habilitación de tarifas.

La visibilidad final sigue siendo módulos base + extras - restricciones.

## 3. Una sola seguridad para importar y editar

Importación y edición manual deben usar la misma política.

Nunca guardar en `Orbit.store`:

```txt
password
pass
contrasena
usuario completo sensible
numero de cuenta completo
accountNumber
```

Persistir únicamente:

```txt
usuarioHint
credentialRef
numeroHint
accountRef
estado
fuenteTraza
secretoExpuesto = false
```

Si el prototipo contiene valores legacy en claro, debe migrarlos a referencias protegidas, marcar `requiereValidacion` y auditar la migración real.

El editor manual debe bloquear campos de usuario, contraseña y cuenta completa; debe ofrecer “Gestionar de forma segura”.

## 4. Estados honestos

Usar lenguaje operativo:

```txt
Inventario recibido
Fuentes incompletas
Lectura pendiente
Extracción en prueba
Requiere validación
Calibrado
Validado y habilitado
Reemplazado por versión
Bloqueado
Conexión segura pendiente
Referencia protegida
```

No mostrar `backend_required`, `accountRef`, `credentialRef`, `Orbit.store`, Firebase, Firestore o nombres de almacenamiento en UI cliente.

## 5. Importador de directorios

Requisitos:

- Excel multihoja;
- país explícito antes de leer;
- GT y CO como fuentes separadas;
- exclusión de índices, diagnósticos y hojas de soporte;
- identidad, contactos, plataformas y bancos por bloques;
- archivo/hoja/fila/bloque/país;
- dry-run crear/actualizar/bloquear/requiere validación;
- motivo y frase reforzada;
- aplicación únicamente de filas validadas;
- sensibles en memoria temporal y proveedor seguro;
- sin backend seguro: análisis disponible, aplicación bloqueada.

La frase de confirmación es:

```txt
CONFIRMO DIRECTORIO
```

## 6. Alias y duplicados probables

Además de duplicados exactos, detectar:

- números de versión;
- sufijos “copia”, “actualizado”, “backup”;
- sufijos societarios;
- abreviaturas o diferencia de una letra;
- coincidencia probable con el directorio existente.

Ante ambigüedad:

```txt
requiereValidacion = true
validationStatus = requiere_validacion
```

Nunca fusionar automáticamente.

## 7. Entidades aliadas

Una red, aliado, agencia o intermediario no debe convertirse automáticamente en aseguradora directa.

```txt
entityType = partner_network
requiereValidacion = true
```

Su clasificación y uso deben confirmarse antes de habilitar productos o tarifas.

## 8. Relación con Cotizador y Comparativo

```txt
contactos importados != tarifa validada
plataforma registrada != conexión activa
cotización ejemplo != regla de cálculo validada
póliza ejemplo != tarifa habilitada
```

La habilitación debe ser default-deny y exigir combinación completa:

- aseguradora;
- país;
- moneda;
- ramo/producto/plan;
- segmento/tipo de riesgo;
- fuente y versión;
- vigencia;
- tarifas/reglas;
- presentación;
- casos de prueba;
- validación explícita.

## 9. Gestión de correcciones

Asesor y otros roles sin edición deben poder crear una gestión con:

- aseguradora;
- país;
- detalle del dato faltante/incorrecto;
- solicitante;
- rol activo;
- fecha y prioridad.

No deben editar directamente recursos protegidos.

## 10. Academia

Actualizar los cursos existentes:

```txt
cur_dir_aseg_dir_v1202
cur_dir_aseg_op_v1202
cur_dir_aseg_asesor_v1202
```

No crear cursos duplicados. Conservar progreso y certificados.

Enseñar:

- directorio operativo;
- roles y permisos;
- seguridad uniforme;
- alias/duplicados;
- entidades aliadas;
- estados honestos;
- correcciones;
- relación con Cotizador/Comparativo.

## 11. Pruebas obligatorias

1. Dirección abre directorio, KPI y ficha completa.
2. Operativo ve el módulo y acciones permitidas por `Orbit.access`.
3. Asesor ve el módulo, no ve edición ni revelado/copia de sensibles.
4. Editor manual no persiste usuario, contraseña ni cuenta completa.
5. Importador no persiste sensibles.
6. Alias con diferencia de una letra queda bloqueado.
7. Nombre con versión queda bloqueado o asociado para revisión.
8. Red/aliado queda como `partner_network` y requiere validación.
9. Importar contactos no habilita Cotizador.
10. Documentos usan visor común.
11. Copy técnico no aparece.
12. Desktop 1366, tablet 768 y móvil 390 sin overflow global ni errores.

## Aplicación local y estado Claude

```txt
Carril A: UX, copy, responsive, Academia
Carril B: permisos, sanitización, referencias seguras, auditoría
Carril C: directorios GT/CO separados y dry-run
Estado local: cierre funcional implementado; pendiente gate visual y dry-run real
Estado Claude: obligatorio al modificar estos módulos
```

Claude debe incorporar este comportamiento en los módulos principales de su candidata. No debe copiar runtime A&S, datos reales, referencias concretas, hashes, Auth, secretos o bindings LAB.
