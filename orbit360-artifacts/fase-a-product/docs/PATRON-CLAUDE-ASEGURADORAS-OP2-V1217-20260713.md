# Patrón reusable para Claude — Aseguradoras OP-2 v1.218

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
Operativo: consulta, cuentas, accesos y edición operativa según permiso central
Asesor: consulta del directorio, cuentas bancarias y gestiones de corrección
```

Mostrar el módulo no amplía automáticamente:

- scope de clientes;
- permisos de importación;
- edición administrativa;
- habilitación de tarifas.

La visibilidad final sigue siendo módulos base + extras - restricciones.

## 3. Cuentas bancarias y credenciales no tienen la misma visibilidad

### Cuentas bancarias

Todo usuario que pueda consultar Aseguradoras debe poder:

- ver el número completo;
- copiarlo;
- identificar banco, tipo, moneda, titular y uso;
- abrir el medio de pago cuando exista.

La cuenta puede residir en un proveedor seguro y resolverse por referencia, pero la UI no debe ocultarla al equipo operativo autorizado.

```txt
accessClass = operational_all_viewers
requiredPermission = aseguradoras:view
```

### Usuarios y contraseñas de portales

Solo pueden verlos o copiarlos:

```txt
Dirección
SuperAdmin
AdminTenant
Admin
Operativo
permiso extra explícito
```

Asesor puede consultar la plataforma y su estado, pero no ve usuario ni contraseña salvo permiso extra.

```txt
accessClass = administrative_operational
```

Las restricciones explícitas siempre prevalecen.

## 4. Seguridad y migración sin pérdida

Para nuevas cargas o nuevas capturas, los valores completos deben ir a un proveedor seguro. `Orbit.store` conserva metadatos, indicios y referencias.

```txt
usuarioHint
credentialRef
numeroHint
accountRef
estado
fuenteTraza
secretoExpuesto = false
```

Si existen valores legacy en claro:

1. deben seguir disponibles según la política de rol;
2. se marcan como pendientes de migración;
3. se copian al proveedor seguro;
4. se verifica lectura y copia desde el proveedor;
5. solo entonces se retira el valor anterior;
6. se audita antes/después y resultado.

Nunca borrar primero para conectar después.

El editor puede bloquear la modificación directa del valor sensible, pero debe dirigir a las pestañas operativas:

```txt
Bancos y pagos
Plataformas
```

## 5. Estados honestos

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
Disponible · pendiente migración segura
Referencia protegida
```

No mostrar `backend_required`, `accountRef`, `credentialRef`, `Orbit.store`, Firebase o Firestore en UI cliente.

## 6. Importador de directorios

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
- recursos sensibles en memoria temporal y proveedor seguro;
- sin backend seguro: análisis disponible, aplicación bloqueada.

La frase de confirmación es:

```txt
CONFIRMO DIRECTORIO
```

## 7. Alias y duplicados probables

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

## 8. Entidades aliadas

Una red, aliado, agencia o intermediario no debe convertirse automáticamente en aseguradora directa.

```txt
entityType = partner_network
requiereValidacion = true
```

Su clasificación y uso deben confirmarse antes de habilitar productos o tarifas.

## 9. Relación con Cotizador y Comparativo

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

## 10. Gestión de correcciones

Asesor y otros roles sin edición deben poder crear una gestión con:

- aseguradora;
- país;
- detalle del dato faltante/incorrecto;
- solicitante;
- rol activo;
- fecha y prioridad.

No deben editar directamente credenciales ni habilitaciones.

## 11. Academia

Actualizar los cursos existentes:

```txt
cur_dir_aseg_dir_v1202
cur_dir_aseg_op_v1202
cur_dir_aseg_asesor_v1202
```

No crear cursos duplicados. Conservar progreso y certificados.

Enseñar:

- directorio operativo;
- cuentas para usuarios autorizados del directorio;
- credenciales para Dirección/Admin/Operativo;
- migración no destructiva;
- roles, extras y restricciones;
- alias/duplicados;
- entidades aliadas;
- estados honestos;
- correcciones;
- relación con Cotizador/Comparativo.

## 12. Pruebas obligatorias

1. Dirección abre directorio, KPI y ficha completa.
2. Dirección ve y copia cuenta, usuario y contraseña.
3. Operativo ve y copia cuenta, usuario y contraseña.
4. Asesor ve y copia la cuenta bancaria completa.
5. Asesor no ve usuario ni contraseña del portal.
6. Una restricción explícita bloquea la acción correspondiente.
7. Los valores legacy no desaparecen antes de una migración verificada.
8. Un recurso por referencia recibe contexto de tenant, entidad, rol y clase de acceso.
9. Alias con diferencia de una letra queda bloqueado.
10. Nombre con versión queda bloqueado o asociado para revisión.
11. Red/aliado queda como `partner_network` y requiere validación.
12. Importar contactos no habilita Cotizador.
13. Documentos usan visor común.
14. Copy técnico no aparece.
15. Desktop 1366, tablet 768 y móvil 390 sin overflow global ni errores.

## Aplicación local y estado Claude

```txt
Carril A: UX, copy, responsive, Academia
Carril B: política de acceso, proveedor seguro, permisos y auditoría
Carril C: directorios GT/CO separados y dry-run
Estado local: cierre funcional v1.218 implementado; pendiente gate visual y dry-run real
Estado Claude: obligatorio al modificar estos módulos
```

Claude debe incorporar este comportamiento en los módulos principales de su candidata. No debe copiar runtime A&S, datos reales, referencias concretas, hashes, Auth, secretos o bindings LAB.
