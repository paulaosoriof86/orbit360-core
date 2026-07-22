# Cierre técnico del gate final M1 — Cliente 360 y Aseguradoras

Fecha: 2026-07-22  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Resultado ejecutivo

```text
GATE FINAL: PASS
EVIDENCIA SANITIZADA: ok:true
REVISIÓN VISUAL CON PAULA: AUTORIZADA Y PENDIENTE
M1: pendiente únicamente de la revisión visual humana
```

Aseguradoras y Cliente 360 superaron el gate conjunto en Dirección escritorio, Operativo tableta y Asesor móvil. No se abrió otro frente, no se reimportaron datos y no se modificaron credenciales, cuentas bancarias, Colombia, Functions, Rules ni producción.

## Preflight vinculante

```text
Run: 29924901781
Artifact: 8531491135
Digest: sha256:789072d1ee73dd020bb5e0f4ba35c2f187d16794f2de37c9df93b8018363547b
HEAD: e426b9ec6de9dfadaf8565337969e48f28212ff1
Gate contract: 1.0.36
Status: GO_GATE_CONTRACT
Checks: 1254/1254
Architecture: GO_STATIC_ARCHITECTURE
Access contract: PASS
```

Alcance del preflight:

```text
writesExecuted:false
runtimeExecuted:false
browserExecuted:false
deployExecuted:false
containsPII:false
containsSecrets:false
```

## Gate final

```text
Run: 29925156385
Artifact: 8531633698
Digest: sha256:582d6523730a859f5197ae13ae9b220c771ef778feb27e65d49dfa280c481f8a
HEAD: 3a334d81393dc2b05fb5e271b8b1108e87f733ad
Hosting LAB: https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app
Resultado: ok:true
Stage: completed
```

El runtime validator conserva su versión interna `1.0.29`; el contrato vinculante del gate y owners es `1.0.36`.

## Datos e integridad

```text
Clientes: 414
Aseguradoras: 26
Asesores: 7
Referencias bancarias válidas: 91
Referencias pendientes: 2
Credenciales de portal preservadas: 26
Colombia: intacta
```

Los nueve activos críticos publicados coincidieron exactamente con el HEAD en bytes y SHA-256:

```text
remoteAllExact:true
exactMatch:true
assetCount:9
```

## Tres vistas

### Dirección escritorio

```text
PASS completo
scope: all
clientes visibles: 414
aseguradoras visibles: 26
Plataformas: PASS
cajas de acceso protegido en ficha validada: 2
campos contraseña dentro de Aseguradoras: 0
campo oculto de login excluido correctamente: 1
importador: flujo autorizado y honesto
cancelación del importador: cero escritura
```

### Operativo tableta

```text
PASS completo
scope: team
clientes visibles según equipo: 374
aseguradoras visibles: 26
Plataformas: PASS
cajas de acceso protegido en ficha validada: 2
campos contraseña dentro de Aseguradoras: 0
importador restringido por permiso activo
modal no abierto y cero escritura
```

### Asesor móvil

```text
PASS completo
scope: own
clientes visibles asignados al asesor de prueba: 374
ownConsistent:true
menú móvil: PASS
aseguradoras visibles: 26
Plataformas: PASS
importador restringido por permiso activo
modal no abierto y cero escritura
```

El conteo 374 no representa scope de equipo: corresponde a los clientes asignados al asesor usado por la cuenta multirol de LAB. El gate verificó `scope:own` y consistencia por `actorAdvisorId`.

## Aseguradoras y contraseñas

El gate confirmó:

- directorio y ficha en las tres vistas;
- motivo de aseguradora inactiva;
- contactos;
- Plataformas;
- cajas de acceso protegido;
- cero campos de contraseña persistidos en la ficha;
- cuentas bancarias y copia completa según permisos;
- conocimiento y estados honestos;
- importador sin falso éxito ni escritura no autorizada.

El gate no leyó la bóveda (`vaultReadAllowed:false`). Por seguridad, la comprobación del valor real de las contraseñas se reserva para la única revisión visual de Paula mediante `Ver temporalmente` y `Copiar acceso seguro`.

## Alcance preservado

```text
writesExecuted:false
Functions desplegadas:false
Rules desplegadas:false
producción tocada:false
reimportación Clientes:false
reimportación Aseguradoras:false
cambios Colombia:false
cambios credenciales:false
cambios cuentas bancarias:false
```

El deploy ejecutado fue exclusivamente Hosting LAB del frontend autorizado.

## Estado y siguiente acción exacta

```text
Gate técnico M1: CERRADO EN PASS
Revisión visual única: AUTORIZADA
M1 formal: pendiente solo de aprobación visual de Paula
```

Revisión visual acotada:

1. abrir Cliente 360 y confirmar lista/ficha;
2. abrir Aseguradoras y confirmar directorio/ficha;
3. entrar a Plataformas;
4. usar `Ver temporalmente` y `Copiar acceso seguro` en una muestra representativa;
5. revisar Dirección escritorio, Operativo tableta y Asesor móvil;
6. si la revisión es satisfactoria, cerrar M1 y continuar a Pólizas conforme al Plan Maestro.

No corresponde reabrir importadores ni modificar Aseguradoras antes de esta revisión, salvo defecto visual real comprobado.
