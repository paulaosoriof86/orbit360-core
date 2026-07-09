# Addendum maestro de continuidad — Clientes, multirol, importadores y anti-desviación

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR vigente: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Este addendum concentra las reglas más recientes que deben quedar disponibles para cualquier conversación futura, Claude/prototipo, ChatGPT/Codex y backend.

Debe cargarse como fuente del proyecto y leerse siempre junto con:

```txt
DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
PROTOCOLO-ANTI-DESVIACION-PLAN-OPERATIVO-DATOS-REALES-AYS-20260709.md
MATRIZ-FUENTES-REALES-RECIBIDAS-FALTANTES-AYS-20260709.md
```

## Frase corta para instrucciones del proyecto

Agregar a las instrucciones del proyecto:

```txt
Antes de continuar Orbit 360 A&S, leer y aplicar siempre el addendum maestro de continuidad de clientes, multirol, importadores y anti-desviación del 2026-07-09; toda respuesta debe mantener carriles A/B/C, última candidata, fuentes reales y documentación para Claude/backend.
```

## Regla anti-desviación

Toda respuesta debe indicar o respetar:

```txt
Carril A — Última candidata/prototipo/empalme.
Carril B — Backend protegido/seguridad/Orbit.store.
Carril C — Datos reales/migración operativa A&S.
```

No avanzar más de dos bloques sin fuente real, acción visible o siguiente insumo concreto.

## Última candidata/prototipo

Regla permanente:

```txt
Trabajar siempre sobre la última versión incremental auditada.
No volver a versiones anteriores salvo rollback explícito.
No empalmar ZIP completo a ciegas.
Documentar pendientes y rescatar/empalmar de forma segura.
```

Última candidata documentada al crear este addendum:

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add
```

Empalme seguro preparado:

```txt
orbit360-platform/docs/scripts/APLICAR-EMPALME-SEGURO-ULTIMA-CANDIDATA-183042-V1330.ps1
```

## Fuentes reales ya recibidas

```txt
Contratantes Datos de Contacto 2026-07-08.xlsx -> clientes Siga CRM.
Directorio Aseguradoras Guatemala 2026.xlsx -> aseguradoras/contactos/configuración GT.
Directorio - Aseguradoras Colombia 2024.xlsx -> aseguradoras/contactos/configuración CO.
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx -> financiero_historico/finmovs; no clientes, no pólizas, no cartera.
AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx -> marketing/calendario.
Manual de Identidad Básica – Versión 1 – Vigente.docx -> marca/Academia/Marketing.
Logo V. 2026.jpeg -> slot white-label del tenant.
comparativo_final_v110.html -> Cotizador/Comparativo fuente avanzada A&S, módulo aislado/configurable.
```

## Fuente clientes Siga CRM

Archivo:

```txt
Contratantes Datos de Contacto 2026-07-08.xlsx
```

Lectura inicial:

```txt
440 registros
30 columnas
1 hoja
```

Reglas confirmadas:

```txt
C.O -> Paula Osorio.
Grupos/SubGrupos -> omitir.
Puesto -> conservar como ocupación/cargo opcional para marketing.
Samuel Daza se agrega como asesor activo.
Vendedor vacío -> Paula Osorio temporal + alerta de calidad/validación.
```

Asesores iniciales:

```txt
Paula Osorio
Fernando Arias
Carlos Castro
Johanna Salgado
Braulio Hernández
Nicole Castro
Samuel Daza
```

## Importador inteligente multi-tenant

Debe:

```txt
- aceptar Excel/CSV de fuentes variables;
- detectar encabezados y sinónimos;
- proponer mapeo;
- mostrar confianza;
- permitir corrección humana;
- normalizar valores;
- detectar duplicados exactos y probables;
- calcular calidad de datos;
- generar dry-run antes de escritura;
- separar crear/actualizar/omitir/requiere validación;
- registrar trazabilidad archivo/hoja/fila/campo;
- omitir campos irrelevantes;
- mantener reglas propias del tenant en configuración, no hardcodeadas.
```

Sinónimos mínimos para asesor:

```txt
asesor
vendedor
ejecutivo
productor
comercial
agente
responsable
owner
usuario
seller
salesperson
```

## Clientes — calidad de datos

Calidad debe marcar alertas como:

```txt
FALTA_ASESOR_REAL_CONFIRMADO
ASESOR_ASIGNADO_TEMPORALMENTE
FALTA_CONTACTO_TELEFONICO
FALTA_WHATSAPP
FALTA_CORREO
FALTA_DOCUMENTO
FALTA_DEPARTAMENTO
FALTA_CIUDAD
DUPLICADO_EXACTO
DUPLICADO_PROBABLE
PENDIENTE_POLIZAS
CONTACTO_PRINCIPAL_INCOMPLETO
```

Cada asesor debe tener vista:

```txt
Mis clientes incompletos
Mis clientes sin WhatsApp/teléfono
Mis clientes sin correo
Mis clientes sin ciudad/departamento
Mis clientes con documento faltante
Mis solicitudes de corrección abiertas
Mis clientes pendientes de pólizas
```

## Multirol y visibilidad

Un usuario puede tener varios roles y cambiar vista activa:

```txt
rolesAsignados
rolActivo
rolDefault
puedeCambiarRol
modulosExtraPermitidos
modulosRestringidos
dataScopes por módulo/colección
```

Visibilidad final:

```txt
módulos base por rol + módulos extra permitidos - módulos restringidos = módulos visibles finales
```

El alcance de datos es independiente de la visibilidad de módulo:

```txt
propios
equipo
todos
ninguno
```

## Roles A&S iniciales

```txt
Paula Osorio: Dirección/SuperAdmin/AdminTenant/Asesor/Operativo; scope todos; puede cambiar rol.
Carlos Castro: Operativo/Asesor; default sugerido operativo; scope todos si Paula habilita.
Samuel Daza: Asesor/Operativo; default configurable; scope según habilitación.
Fernando Arias: Asesor principalmente; módulos adicionales configurables.
Johanna Salgado: Asesor.
Braulio Hernández: Asesor.
Nicole Castro: Asesor.
```

## Permisos de asesor

Asesor ve solo sus clientes, incluyendo:

```txt
ficha cliente propia
pólizas propias
recibos/cobros propios
solicitudes del portal de sus clientes
estado de acceso portal del cliente
invitación/reenvío de acceso si está permitido
gestiones del cliente
documentos visibles al asesor
calidad de datos de sus clientes
```

Asesor puede completar datos faltantes, pero no borrar ni cambiar datos críticos.

Puede completar si faltan:

```txt
WhatsApp
teléfono alterno
correo
dirección
zona/sector/barrio
departamento/provincia
ciudad/municipio
fecha nacimiento
sexo
ocupación/cargo
contacto principal
observaciones de contacto no sensibles
```

No puede:

```txt
borrar datos
cambiar asesor principal
fusionar duplicados
modificar estado operativo
modificar documentos validados
modificar pólizas/cobros/finmovs
ver auditoría interna completa
ver contraseñas/tokens/secretos del portal
```

## Gestiones de corrección

Cuando un asesor no encuentre cliente/póliza o detecte asignación incorrecta, debe crear gestión:

```txt
cliente_no_aparece
poliza_no_aparece
cliente_asignado_a_otro_asesor
asesor_incorrecto
documento_incorrecto
dato_validado_incorrecto
posible_duplicado
```

## Geografía y dropdowns

Obligatorio:

```txt
País -> Departamento/Provincia -> Ciudad/Municipio -> Zona/Sector/Barrio
```

Reglas:

```txt
usar dropdown cuando exista catálogo;
evitar escritura libre;
permitir Otro/Requiere validación;
normalizar tildes, mayúsculas y minúsculas;
no contaminar catálogo final con variantes mal escritas.
```

## Estado operativo de cliente

Mientras solo exista fuente clientes:

```txt
estadoOperativo = pendiente_polizas
```

Después de importar pólizas:

```txt
activo = tiene póliza Vigente o Por renovar.
activo_en_mora = tiene póliza vigente/por renovar y cobros vencidos.
inactivo = no tiene pólizas vigentes/por renovar.
reactivable = histórico/inactivo útil para recuperación comercial.
```

## Metas por asesor

```txt
Metas comerciales aplican a identidad/rol de asesor, aunque el usuario también tenga rol operativo o admin.
Producción/metas/comisiones sobre prima neta recaudada.
Separar GTQ/COP.
Configurable por asesor, país, ramo, periodo y moneda.
```

## Portal Cliente y asesores

Asesor puede ver solicitudes del portal de sus propios clientes y estado de acceso, pero nunca contraseña/token/secreto.

```txt
Puede ver: estado de activación, correo/usuario, solicitud de reenvío/invitación.
No puede ver: contraseña, token, secreto, enlace sensible permanente.
```

## Academia y Claude

Todo lo anterior aplica a Claude/prototipo y Academia:

```txt
Academia debe enseñar multirol, cambio de vista activa, alcance de datos, calidad de datos por asesor, importador inteligente, datos faltantes, gestiones de corrección y límites de permisos.
Claude debe conservar UX compatible con backend: roles múltiples, módulos extra/restringidos, data scopes, edición segura por asesor, portal propio, calidad de datos y dry-run.
```

## Siguiente acción operativa

```txt
Crear/ejecutar dry-run local de clientes Siga CRM sin subir payload real al repo.
Luego pedir fuente de Pólizas.
```

## Estado

Addendum creado para fuentes del proyecto y continuidad. Debe leerse en toda conversación futura de Orbit 360 A&S.