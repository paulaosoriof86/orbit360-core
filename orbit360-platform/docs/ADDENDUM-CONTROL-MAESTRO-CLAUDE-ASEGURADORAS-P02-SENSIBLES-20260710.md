# ADDENDUM AL CONTROL MAESTRO CLAUDE — ASEGURADORAS P0.2 / ACCESOS Y CUENTAS SENSIBLES

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Estado de envío a Claude: `NO_ENVIADO`  
Estado técnico: `CONTRATO_IMPLEMENTADO / PATCH_VISUAL_PREPARADO / PENDIENTE_EMPAlME_Y_BACKEND_SEGURO`.

## 1. Jerarquía

Este documento actualiza de forma acumulativa:

```txt
CONTROL-MAESTRO-ACUMULADO-CLAUDE-BACKEND-UX-ACADEMIA-ORBIT360-AYS-20260709.md
```

Debe leerse junto con:

- `ADDENDUM-CONTROL-MAESTRO-CLAUDE-ASEGURADORAS-MULTIFUENTE-20260710.md`;
- `IMPLEMENTACION-P01B-ASEGURADORAS-COBERTURA-POR-COMBINACION-20260710.md`;
- `IMPLEMENTACION-P02-ASEGURADORAS-ACCESOS-CUENTAS-SENSIBLES-20260710.md`;
- auditoría forense de Cotizador/Comparativo v110;
- decisiones maestras de Aseguradoras, fuentes, tarifas y presentación.

No reemplaza los documentos técnicos. Fija lo que Claude debe conservar y mejorar visualmente.

## 2. Registro acumulado

```txt
Fecha: 2026-07-10
Carril: B con traducción a A y Academia
Módulo: Aseguradoras
Necesidad: credenciales y cuentas consultables para operación real.
Esperado: mostrar/ocultar/copiar con permisos por rol activo y auditoría.
Causa raíz: el módulo solo representaba credentialRef y campos comunes sin flujo seguro completo.
Contrato reusable: core/aseguradoras-sensitive-p02.js
Patch visual: modules/aseguradoras-p02-sensitive.js
Smokes: contrato + multirol + UI
Impacto Claude: alto
Impacto Academia: alto
Estado backend: proveedor seguro real pendiente
Estado prototipo: patch preparado, todavía no cargado por index
Estado enviado a Claude: no enviado
Condición de cierre: empalme seguro, proveedor real, smoke visual y rediseño Claude sin pérdida funcional
```

## 3. Regla de producto

Aseguradoras es un directorio operativo. No basta con indicar que existe una credencial.

Los roles autorizados deben poder:

- abrir URL del portal;
- copiar usuario;
- revelar contraseña temporalmente;
- copiar contraseña;
- consultar cuenta bancaria;
- copiar número de cuenta;
- abrir Drive;
- ejecutar su trabajo sin pedir los datos por fuera de Orbit.

Esto debe coexistir con seguridad, trazabilidad y aislamiento tenant.

## 4. Roles y multirol

### Consulta

```txt
SuperAdmin
Dirección
Admin
AdminTenant
Operativo
```

### Administración de referencias seguras

```txt
SuperAdmin
Dirección
Admin
AdminTenant
```

### Bloqueados

```txt
Asesor
ClientePortal
roles no autorizados
```

El rol activo gobierna la vista.

Claude debe representar correctamente:

```txt
usuario con Dirección + Asesor
rol activo Asesor
→ no ve datos sensibles
```

No debe habilitarse una acción porque el usuario tenga otro rol administrativo asignado pero no activo.

## 5. UX obligatoria

### Portal

Cada portal debe mostrar:

- nombre;
- URL clicable;
- usuario;
- estado de credencial;
- botón copiar usuario;
- contraseña oculta;
- botón Mostrar/Ocultar;
- botón copiar contraseña;
- fecha de última verificación si existe;
- estado pendiente si no hay backend;
- acceso restringido si el rol activo no autoriza.

### Cuenta bancaria

Cada cuenta debe mostrar:

- banco;
- tipo;
- titular;
- país;
- moneda;
- uso o referencia;
- número enmascarado;
- Mostrar/Ocultar;
- copiar;
- estado activa/inactiva;
- auditoría de consulta y edición.

Operativo puede consultar. No administra la referencia segura ni las reglas de acceso.

### Revelado

- temporal;
- cierre automático;
- no persistente;
- se vuelve a ocultar al cambiar de rol o cerrar la ficha;
- no queda en logs;
- no queda en exportaciones;
- no queda en Academia;
- no queda en capturas de demo preparadas.

### Copia

- acción separada;
- mensaje breve de confirmación;
- auditoría sin valor;
- fallback oculto;
- nunca mostrar el secreto dentro de un prompt.

## 6. Estados honestos

Claude debe usar estados como:

```txt
Sin credencial registrada
Credencial registrada · oculta
Conexión segura pendiente
Acceso restringido por rol activo
Cuenta registrada · oculta
Proveedor no conectado
Última verificación pendiente
```

No debe mostrar:

```txt
Conectado
Activo
Disponible
```

si el backend no lo confirmó.

## 7. Registro y rotación

La UX final para Dirección/Admin no debe ser un input libre que guarde contraseña en el formulario.

Flujo esperado:

```txt
Registrar o actualizar credencial
→ modal seguro
→ backend/bóveda
→ credentialRef
→ estado registrado
→ auditoría
```

Debe prever:

- actualizar;
- rotar;
- revocar;
- verificar;
- marcar portal fuera de servicio;
- registrar MFA o instrucciones sin guardar códigos temporales;
- motivo obligatorio para cambios.

El prototipo puede representar el flujo, pero no debe contener secretos reales.

## 8. Auditoría

La UI debe dejar claro que consultar y copiar son acciones auditadas.

El registro interno debe incluir:

- actor;
- rol activo;
- tenant;
- aseguradora;
- portal/cuenta;
- acción;
- fecha;
- resultado;
- motivo cuando aplique.

Nunca incluye:

- contraseña;
- número completo;
- valor copiado;
- token;
- código MFA.

La auditoría no es visible para Asesor ni ClientePortal.

## 9. Relación con Equipo y Configuración

La visibilidad final debe derivarse de:

```txt
roles asignados
+ rol activo
+ módulos visibles
+ extras
- restricciones
+ scope de datos
+ países habilitados
```

Dirección/Admin configura:

- quién puede consultar;
- quién puede administrar;
- países;
- restricciones adicionales;
- estado del usuario;
- motivo de cambios.

El acceso a Aseguradoras como módulo no implica automáticamente acceso a sus secretos.

## 10. Relación con Drive y fuentes

La misma ficha integra:

- accesos;
- cuentas;
- Drive;
- contactos;
- fuentes múltiples;
- cobertura de conocimiento por combinación;
- versiones;
- estados de lectura.

Claude no debe separar esto en directorios redundantes.

Debe usar tabs o secciones claras, por ejemplo:

```txt
Resumen
Contactos
Portales y accesos
Cuentas
Drive
Fuentes y conocimiento
Comisiones
Requisitos
Auditoría restringida
```

La arquitectura visual final puede mejorar esta propuesta, pero debe conservar toda la funcionalidad.

## 11. Relación con Cotizador y Comparativo

Credenciales pueden ser necesarias para usar cotizadores en línea autorizados. Sin embargo:

- el modelo de IA no recibe la contraseña;
- no se evade MFA/CAPTCHA;
- la sesión del usuario autorizado realiza el acceso;
- cualquier captura asistida respeta autorización y términos;
- Cotizador/Comparativo consumen resultados normalizados, no secretos.

Las cuentas bancarias no alimentan tarifas, pero forman parte del directorio operativo de la misma aseguradora.

## 12. Fuente nueva neutral

Claude debe conservar que `+ Fuente` inicia neutral:

```txt
Otro documento
sin tarifa confirmada
sin reglas confirmadas
sin presentación confirmada
```

No debe aparecer como cotizador Excel hasta que el usuario o el lector lo clasifique.

## 13. Academia requerida

### Dirección/Admin/SuperAdmin

- permisos y rol activo;
- registro seguro;
- rotación y revocación;
- auditoría;
- incidentes;
- separación referencia/valor.

### Operativo

- abrir portal;
- copiar usuario y contraseña;
- ocultar después de usar;
- consultar cuentas;
- evitar canales inseguros;
- cerrar sesiones externas.

### Asesor

- límites de acceso;
- cómo solicitar una gestión operativa;
- por qué no debe recibir credenciales por WhatsApp o correo.

### IT/Seguridad

- cifrado;
- bóveda;
- autorización servidor;
- tenant isolation;
- logs saneados;
- rotación;
- recuperación e incidente.

## 14. Prohibiciones para Claude

Claude no debe:

- eliminar la función de contraseñas;
- dejar solo `credentialRef` sin Mostrar/Copiar;
- guardar secretos en HTML, seed, localStorage o store;
- mostrar contraseñas permanentemente;
- revelar últimos cuatro de cuenta a Asesor;
- ignorar el rol activo;
- dar a Operativo capacidad administrativa de bóveda por defecto;
- inventar conexión activa;
- exponer secretos en auditoría;
- reemplazar `modules/aseguradoras.js` por el directorio de v110;
- tocar backend protegido;
- romper P0.1b multifuentе.

## 15. Momento de intervención de Claude

Claude no es indispensable todavía.

Listo:

```txt
P0.1b dimensiones y grupos
P0.2 contrato sensible
P0.2 patch visual preparado
```

Falta antes de pedir candidata:

```txt
empalme seguro del patch
matching Drive
adapter Excel/PDF
primer flujo extracción → propuesta → diff
```

Cuando se solicite, Claude debe recibir el control maestro y todos los addenda relacionados, no un resumen parcial.
