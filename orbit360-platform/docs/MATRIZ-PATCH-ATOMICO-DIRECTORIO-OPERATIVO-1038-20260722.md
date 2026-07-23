# MATRIZ DEL PATCH ATÓMICO 1.0.38 — DIRECTORIO OPERATIVO

**Fecha:** 2026-07-22  
**Rama de preparación:** `audit/m1-directorio-operativo-1038-20260722`  
**Rama de destino:** `ays/backend-tenant-lab-v99-20260703`  
**Gate:** `block1-client360-insurers-lab-v20260717`

## Causa raíz cerrada

La regresión clasificó como secretos tres campos distintos. El contrato corregido separa responsabilidades:

```text
usuario del portal = dato operativo visible
número de cuenta = dato operativo visible y copiable
contraseña = secreto con revelado temporal
```

El workflow deja de construir el producto. Solo valida un patch que ya existe en el repositorio.

## Matriz antes/después

| Archivo / owner | Antes | Después | Garantía |
|---|---|---|---|
| `core/operational-directory-field-policy-v20260722.js` | No existía owner explícito de clasificación | El importador conserva `usuario` y `numero` después de confirmación remota; aplica `credentialRef` y `accountRef`; nunca escribe contraseña | Evita que futuras importaciones vuelvan a borrar campos operativos |
| `core/client-insurer-operational-directory-owner-v20260722.js` | La cuenta dependía de revelado y el usuario podía quedar sustituido por texto protegido | Usuario visible; contraseña separada y temporal; número visible; copia bancaria directa | Elimina dependencia de Function/bóveda para mostrar o copiar cuentas |
| `core/router-tenant-config-bootstrap.js` | Cargaba proveedor, bridge y owner visual anterior | Carga en orden proveedor → bridge → política → visual base → owner operativo → Academia | Un solo orden canónico antes del Router |
| `data/academia-v1230-operational-directory-v20260722.js` | Academia anterior enseñaba cuenta enmascarada | Enseña usuario y número como operativos y contraseña como único secreto | Evita repetir la clasificación equivocada |
| `tools/orbit360-m1-operational-directory-contract-v20260722.js` | Validador aceptaba `Cuenta protegida` | Rechaza revelado bancario, ocultamiento del usuario, copia indirecta, persistencia de contraseña y workflows transformadores | Gate alineado con la conducta esperada |
| `tools/orbit360-gate-contract-overlay-v20260718.json` | Contrato 1.0.37 orientado a cuenta protegida | Contrato 1.0.38 orientado a directorio operativo | Owners, workflow, Academia y validadores cambian juntos |
| `tools/orbit360-incident-freeze-v20260721.json` | STOP por fallos del transformador | Autoriza una sola validación estática; datos, runtime y deploy siguen bloqueados | No se mezclan patch, datos y publicación |
| `.github/workflows/orbit360-aseguradoras-runtime-gate-v20260716.yml` | Transformaba archivos y confirmaba cambios durante la ejecución | `VALIDATION_ONLY`: preflight, contrato conductual, arquitectura y evidencia | El workflow no puede modificar el producto |

## Alcance protegido

No se modifican en este patch:

- `data/store.js` ni adaptadores Store;
- Auth, Rules o Functions;
- documentos de Clientes, Aseguradoras o bóveda;
- 414 clientes, 26 aseguradoras o 7 asesores;
- Pólizas, Cobros, Finanzas o M2;
- producción, `main` o merge.

## Predicado de validación estática

```text
GO_GATE_CONTRACT
+ operational-directory contract PASS
+ GO_STATIC_ARCHITECTURE
+ sourceTransformed=false
+ dataAccess=false
+ secretAccess=false
+ writes=false
+ runtime=false
+ browser=false
+ deploy=false
```

Solo después se podrá autorizar un dry-run separado para proponer la restitución selectiva de usuarios y números existentes.
