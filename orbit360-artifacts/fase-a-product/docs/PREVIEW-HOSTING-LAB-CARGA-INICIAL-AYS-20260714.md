# Preview Firebase Hosting LAB y carga inicial A&S

Fecha: 2026-07-14  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Carriles: A/B/C

## Objetivo

Permitir que Paula abra Orbit 360 desde una URL de preview, inicie sesión normalmente y cargue un único archivo sanitizado desde:

```txt
Importar → Carga inicial A&S
```

Sin `.cmd`, `.ps1`, PowerShell, servidor local, configuración Firebase seleccionada manualmente ni service account en su computador.

## Carril A — experiencia y Academia

Se añadió una tarjeta de carga inicial dentro de Importar mediante un bridge aditivo. La UI:

- acepta un único JSON local;
- muestra crear/actualizar/retenidos/bloqueos;
- exige confirmación humana;
- descarga reporte;
- ofrece rollback;
- nunca muestra secretos ni lenguaje técnico al usuario final.

Impacto Academia:

- enseñar diferencia entre archivo validado, dry-run y dato escrito;
- enseñar que los 26 clientes retenidos no se escriben;
- enseñar que portales y credenciales están separados de contactos;
- enseñar rollback y trazabilidad del lote.

## Carril B — backend protegido y Hosting

Cambios:

- el bridge extiende de forma aditiva el contrato de escritura para `aseguradoras` además de `clientes`;
- `core/backend-lab-loader.js` usa la configuración reservada `/__/firebase/init.js` en Firebase Hosting y conserva la configuración local ignorada fuera de Hosting;
- `firebase.json` publica `orbit360-platform/` y excluye docs, archivos locales y datos de importación;
- el workflow despliega únicamente el canal `orbit360-ays-lab`, con expiración de 30 días y sin `live`.

El workflow acepta uno de estos secretos existentes:

```txt
FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB
FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB
FIREBASE_SERVICE_ACCOUNT
```

El project ID se deriva del JSON del service account. No se versiona `.firebaserc`, project ID ni credenciales.

## Carril C — datos reales

El repositorio no contiene datos reales.

Archivo local generado por ChatGPT/Codex:

```txt
CARGA-INICIAL-AYS-CLIENTES-ASEGURADORAS-SANITIZADA-20260714.json
```

Conteos:

```txt
clientes escribibles: 414
clientes retenidos: 26
aseguradoras canónicas: 26
contactos retirados por mezcla con accesos: 51
```

Controles:

- `secretValuesIncluded=false`;
- credenciales solo como `credentialRef`;
- portales separados de contactos;
- pólizas/cobros/finmovs/usuarios/roles/permisos fuera de alcance;
- resolución de asesores contra el store vivo;
- coincidencia ambigua bloquea la escritura;
- escritura por `Orbit.store`;
- auditoría y rollback.

## Estado de despliegue

La configuración queda lista en la rama autorizada. El deploy efectivo depende de que GitHub Actions disponga de un service account LAB en alguno de los nombres admitidos. Si no existe, el workflow falla antes de cualquier deploy con `BLOQUEO_SECRET`.

No se toca producción, `main`, pólizas, cobros ni finmovs.
