# Corrección canónica — cuentas bancarias de aseguradoras

Fecha: 2026-07-13  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`

## Regla vigente

Esta corrección prevalece sobre cualquier paquete, catálogo, smoke o contrato anterior que haya indicado que las cuentas bancarias deben quedar denegadas para Operativo o Asesor.

1. Todos los usuarios con acceso al módulo **Aseguradoras** pueden ver y copiar las cuentas bancarias de las aseguradoras, incluido **Asesor**.
2. Deben estar disponibles: banco, tipo de cuenta, moneda, titular, número completo, uso y enlace de pago cuando exista.
3. Las cuentas bancarias son información operativa para orientar pagos de clientes. No son contraseñas, tokens ni credenciales de plataforma.
4. Ver/copiar cuentas no concede permiso para crear, editar o eliminar cuentas. La edición permanece separada y auditable.
5. Las credenciales de plataformas sí conservan control diferenciado:
   - Dirección, SuperAdmin, AdminTenant/Admin y Operativo: acceso por proveedor seguro y revelación temporal.
   - Asesor: sin credenciales salvo permiso extra explícito.
6. Una restricción de credenciales nunca puede ocultar cuentas bancarias.
7. El permiso de editar Aseguradoras tampoco equivale a permiso de credenciales.

## Corrección de candidata v1.239

La candidata usa `puedeBancosOperativos()` y deja a Asesor fuera por defecto. Claude debe corregirlo en v1.240+:

- cuentas bancarias visibles completas y copiables para todos los usuarios con acceso al módulo;
- retirar el gate de lectura/copia `aseguradoras_bancos_operativos`;
- conservar un permiso independiente únicamente para **editar** bancos si se necesita;
- no pasar el número bancario como campo secreto restringido por rol;
- mantener credenciales de plataforma mediante `credentialRef` y proveedor seguro.

## Contrato backend reusable

Se agrega `core/aseguradoras-bank-account-visibility-policy-p0.js`, que:

- habilita lectura/copia a Dirección, SuperAdmin, AdminTenant, Admin, Operativo y Asesor cuando Aseguradoras es visible;
- mantiene edición separada;
- mantiene credenciales de plataformas restringidas;
- expone un override canónico para `cuentasBancariasAseguradora` con `advisorRead: true`;
- no lee datos, no escribe y no autoriza deploy.

Validación local: 29/29 pruebas PASS.

## Paquete Claude corregido

Archivo: `PAQUETE-RESIDUAL-EXCLUSIVO-CLAUDE-ORBIT360-POST-V1239-CORREGIDO-20260713.zip`  
SHA-256: `25f345d4446d8d2bff3fb3dca324d19c5b4a742890efb881cc1babac767dacb6`

El paquete anterior sin la palabra `CORREGIDO` queda invalidado y no debe enviarse a Claude.
