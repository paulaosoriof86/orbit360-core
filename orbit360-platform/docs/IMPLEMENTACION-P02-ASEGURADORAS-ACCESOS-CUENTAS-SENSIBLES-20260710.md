# IMPLEMENTACIÓN P0.2 — ASEGURADORAS / ACCESOS Y CUENTAS SENSIBLES

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy y sin `main`.

## 0. Carril y continuidad

Carril principal: B, con traducción obligatoria a A y Academia.

Este bloque continúa el orden aprobado:

```txt
CRM/Clientes cerrado como baseline
→ Aseguradoras como fuente primaria
→ Cotizador
→ Comparativo
→ validación transversal
```

No reabre Clientes, Pólizas, Cobros, Cartera, Comisiones ni cruces ya cerrados.

## 1. Necesidad operativa

El directorio de Aseguradoras tiene como objetivo permitir que el equipo autorizado opere con:

- portales de las compañías;
- usuario y contraseña;
- enlaces clicables;
- cuentas bancarias;
- copia rápida de datos;
- Drive y repositorios;
- información operativa por país.

Por decisión funcional de A&S, las credenciales y cuentas **sí deben ser consultables** dentro de Orbit 360. No deben eliminarse ni sustituirse por un estado sin utilidad.

La seguridad correcta es:

```txt
oculto por defecto
→ consulta bajo demanda
→ validación del rol activo
→ resolución mediante backend seguro
→ revelado temporal
→ copia controlada
→ auditoría sin guardar el valor
```

## 2. Causa raíz

La ficha existente incluía:

- usuario visible;
- un `input type=password` vacío;
- `credentialRef: backend_required`;
- cuentas bancarias visibles como campos comunes.

Eso representaba parcialmente la necesidad, pero no resolvía:

- permisos por rol activo;
- consulta real de la contraseña;
- Mostrar/Ocultar;
- copiar usuario, contraseña o cuenta;
- revelado temporal;
- proveedor backend inyectable;
- auditoría saneada;
- bloqueo completo para Asesor;
- protección del snapshot cuando el campo está enmascarado.

## 3. Decisiones funcionales cerradas

### 3.1 Roles que pueden consultar

```txt
SuperAdmin
Dirección
Admin
AdminTenant
Operativo
```

### 3.2 Roles que pueden administrar referencias sensibles

```txt
SuperAdmin
Dirección
Admin
AdminTenant
```

Operativo puede consultar y copiar para ejecutar su trabajo, pero no administrar la bóveda ni cambiar referencias sensibles por defecto.

### 3.3 Roles bloqueados

Asesor y cualquier rol no incluido no pueden:

- revelar contraseñas;
- copiar usuarios de portal desde la capa sensible;
- copiar contraseñas;
- revelar cuentas;
- copiar cuentas;
- ver los últimos cuatro dígitos.

### 3.4 Multirol

El permiso depende del **rol activo**, no de cualquier rol asignado.

Ejemplo:

```txt
Roles asignados: Dirección + Asesor + Operativo
Rol activo: Asesor
Resultado: datos sensibles bloqueados
```

Al cambiar la vista activa a Operativo, la consulta puede habilitarse si ese rol está realmente asignado.

Un rol elegido en el selector que no esté asignado al usuario no habilita el acceso.

El backend seguro debe volver a validar este contrato. El frontend no es la única barrera.

## 4. Arquitectura implementada

### 4.1 Contrato reusable

Archivo:

```txt
orbit360-platform/core/aseguradoras-sensitive-p02.js
```

Responsabilidades:

- resolver identidad y rol activo;
- validar roles asignados;
- definir permisos de consulta y administración;
- enmascarar contraseña y cuenta;
- sanear metadata de auditoría;
- construir eventos de auditoría;
- solicitar credenciales a un proveedor seguro;
- solicitar cuentas protegidas;
- copiar datos únicamente para rol autorizado;
- devolver estados honestos cuando falta backend;
- crear borrador neutral para una fuente documental nueva.

El contrato no depende de Firebase ni de un proveedor concreto.

Proveedor esperado:

```js
window.OrbitSensitiveProvider = {
  resolveCredential(request) {},
  resolveAccount(request) {}
}
```

También admite nombres equivalentes controlados por el adapter.

El request incluye:

```txt
tenantId
aseguradoraId
portalId / accountId
credentialRef / accountRef
campo
actor
rol activo
roles asignados
```

El proveedor real deberá:

- validar autenticación;
- validar tenant;
- validar rol activo y rol asignado;
- validar permiso concreto;
- registrar acceso del lado servidor;
- devolver el valor solo por un canal seguro;
- aplicar expiración o sesión corta cuando corresponda;
- no devolver secretos en logs.

### 4.2 Patch visual aditivo

Archivo:

```txt
orbit360-platform/modules/aseguradoras-p02-sensitive.js
```

Capacidades preparadas:

#### Portales

- contraseña oculta;
- copiar usuario;
- Mostrar/Ocultar contraseña;
- copiar contraseña;
- aviso de acceso restringido;
- aviso honesto si no existe backend seguro;
- ocultamiento automático después de 30 segundos.

#### Cuentas

- número enmascarado para roles autorizados;
- Mostrar/Ocultar;
- copiar;
- bloqueo total para roles no autorizados;
- Operativo sin edición administrativa;
- restauración del valor original antes del snapshot para no guardar la máscara.

#### Portapapeles

Se usa Clipboard API cuando está disponible. El fallback utiliza un elemento oculto temporal; no muestra el secreto en un `prompt`.

### 4.3 Estado de empalme

El contrato y el patch visual están en la rama, pero el patch **todavía no está cargado por `index.html`**.

Estado real:

```txt
CONTRATO_IMPLEMENTADO
PATCH_VISUAL_PREPARADO
NO_CARGADO_EN_INDEX
PROVEEDOR_SEGURO_NO_CONECTADO
SIN_SECRETOS_REALES
```

No se editó directamente `index.html` porque la documentación viva del backend advierte riesgo de encoding/mojibake y exige un empalme aditivo controlado.

Antes de considerar la UI activa debe ejecutarse un empalme seguro que cargue, en este orden:

```txt
core/aseguradoras-sensitive-p02.js
modules/aseguradoras.js
modules/aseguradoras-p02-sensitive.js
```

## 5. Auditoría

Colección objetivo:

```txt
auditoria
```

Cada evento puede registrar:

- tenant;
- módulo;
- categoría;
- acción;
- aseguradora;
- portal o cuenta;
- campo consultado;
- resultado;
- motivo;
- actor;
- rol activo;
- roles asignados;
- fecha;
- metadata operativa segura.

Nunca registra:

- contraseña;
- valor copiado;
- número completo de cuenta;
- token;
- secreto;
- contenido del portapapeles.

Se bloquean variantes de claves como:

```txt
password
pass
contraseña
secret
token
value
numero_cuenta
account_number
```

La auditoría de frontend complementa, pero no sustituye, la auditoría del proveedor backend.

## 6. Estados honestos

### Sin referencia

```txt
Sin credencial registrada
La cuenta no tiene número o referencia segura
```

### Con referencia, sin proveedor conectado

```txt
Conexión segura pendiente
La credencial no está disponible en este entorno
```

### Rol bloqueado

```txt
Tu rol activo no permite consultar este dato
```

### Consulta autorizada

El valor se muestra temporalmente o se copia. No permanece en el DOM más tiempo del necesario.

## 7. Fuente nueva neutral

El contrato incorpora:

```txt
neutralSourceDraft(country)
```

Una fuente nueva debe iniciar como:

```txt
tipoFuente: otro
contieneTarifas: false
contieneReglasCalculo: false
contieneHojaSalida: false
contieneFormatoCotizacion: false
contieneAreaImpresion: false
```

Esto evita que una fila nueva aparezca falsamente como cotizador Excel o como fuente tarifaria antes de clasificarla.

La acción actual `+ Fuente` de `modules/aseguradoras.js` aún debe conectarse con este helper durante el empalme controlado.

## 8. Smokes implementados

### Contrato general

```txt
tools/orbit360-test-aseguradoras-sensitive-p02.mjs
```

Valida:

- roles autorizados;
- rol Asesor bloqueado;
- Operativo consulta pero no administra;
- máscaras;
- sanitización de auditoría;
- proveedor ausente;
- proveedor conectado;
- consulta de cuenta;
- copia autorizada;
- copia denegada sin tocar portapapeles;
- borrador neutral.

### Multirol y rol activo

```txt
tools/orbit360-test-aseguradoras-sensitive-multirol-p02.mjs
```

Valida:

- usuario con varios roles;
- vista activa Asesor bloqueada;
- proveedor no invocado al denegar;
- vista Operativo habilitada;
- Admin no asignado bloqueado;
- auditoría con rol activo;
- ausencia del secreto en auditoría.

### Contrato visual

```txt
tools/orbit360-test-aseguradoras-sensitive-ui-p02.mjs
```

Valida estáticamente:

- uso del contrato seguro;
- botones Mostrar/Copiar;
- ocultamiento sin nueva consulta;
- revelado temporal;
- fallback oculto de portapapeles;
- protección del snapshot;
- ausencia de `localStorage`/`sessionStorage`;
- ausencia de escrituras de contraseña al store.

### Workflow

```txt
.github/workflows/orbit360-aseguradoras-sensitive-p02-smoke.yml
```

Ejecuta:

- sintaxis del contrato;
- sintaxis del patch;
- sintaxis de los tres tests;
- smoke general;
- smoke multirol;
- smoke visual;
- búsqueda de posibles secretos embebidos;
- validador backend LAB.

La existencia del workflow no equivale a ejecución aprobada. Debe verificarse un run visible.

## 9. Archivos protegidos

No se modificaron:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
```

Tampoco se cargaron:

- credenciales reales;
- números bancarios reales;
- tokens;
- claves API;
- datos A&S hardcodeados.

## 10. Pendientes backend

### P0.2a — Proveedor seguro real

Pendiente definir e implementar:

- almacenamiento cifrado o bóveda;
- `resolveCredential`;
- alta/actualización de secreto;
- revocación;
- rotación;
- autorización por tenant y rol activo;
- auditoría servidor;
- expiración;
- manejo de MFA y accesos externos.

### P0.2b — Empalme del patch

Pendiente:

- cargar scripts en orden seguro;
- verificar encoding;
- smoke visual en navegador;
- probar cambio de rol sin recargar;
- comprobar responsive;
- comprobar 0 secretos en consola/DOM persistente;
- confirmar que guardar otros cambios no altera cuentas.

### P0.2c — Administración de referencias

La ficha final debe sustituir el campo de contraseña libre por un flujo seguro:

```txt
Registrar/actualizar credencial
→ proveedor seguro
→ devuelve credentialRef
→ Orbit.store conserva solo referencia y estado
```

El patch actual resuelve consulta, no alta o rotación real.

## 11. Impacto para Claude

Estado:

```txt
DOCUMENTADO
CONTRATO_IMPLEMENTADO
PATCH_VISUAL_PREPARADO
NO_ENVIADO_A_CLAUDE
PENDIENTE_UX_FINAL
```

Claude deberá conservar:

- utilidad operativa real del directorio;
- credenciales y cuentas consultables;
- contraseña oculta por defecto;
- Mostrar/Ocultar/Copiar;
- revelado temporal;
- permisos por rol activo;
- Asesor bloqueado;
- Operativo con consulta;
- Dirección/Admin/SuperAdmin con administración;
- estados honestos;
- auditoría sin valor;
- URLs clicables;
- diseño corporativo Orbit;
- integración con Drive;
- ausencia de secretos en prototipo o paquetes.

Claude no debe:

- eliminar contraseñas del directorio;
- limitar la ficha a `credentialRef` sin una acción útil;
- mostrar secretos permanentemente;
- mostrar últimos cuatro a roles bloqueados;
- asumir que tener un rol asignado basta si el rol activo es Asesor;
- guardar contraseñas en HTML, seed, localStorage o logs;
- inventar que el proveedor está conectado;
- tocar backend protegido.

## 12. Impacto Academia

### Dirección/Admin/SuperAdmin

- registrar y actualizar referencias seguras;
- asignar permisos;
- revisar auditoría;
- rotar o revocar accesos;
- distinguir referencia de valor secreto.

### Operativo

- abrir portal;
- copiar usuario;
- revelar/copy contraseña bajo demanda;
- consultar cuenta;
- interpretar estados pendientes;
- proteger el portapapeles y cerrar sesiones externas.

### Asesor

- comprender por qué no tiene acceso;
- solicitar una gestión operativa si necesita apoyo;
- no pedir credenciales por canales inseguros.

### Seguridad/IT

- bóveda;
- cifrado;
- autorización servidor;
- auditoría;
- rotación;
- incidente y revocación;
- aislamiento por tenant.

## 13. Condición de cierre

Cerrado en este bloque:

- contrato reusable;
- permisos por rol activo;
- auditoría saneada;
- provider interface;
- Mostrar/Ocultar/Copiar preparado;
- cuentas protegidas;
- revelado temporal;
- protección de snapshot;
- fuente neutral;
- tres smokes;
- workflow;
- documentación Claude/Academia.

Pendiente antes de declarar P0.2 operativo en navegador:

- run CI visible;
- empalme seguro en `index.html`;
- proveedor real;
- smoke visual;
- prueba con roles reales;
- alta/rotación de credenciales.
