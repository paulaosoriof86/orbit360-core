# Bloque 1 · Integridad de `modules/ia.js` antes del navegador

Fecha: 2026-07-21  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Clasificación

```txt
PIPELINE_MECHANISM_FAILURE
```

## Evidencia

```txt
Run: 29877794593
Artifact: 8513644909
Digest: sha256:a99deb840759da7fdeb5e93fcbc623658aa29fab3468740c0edcfa16a2122523
HEAD: ab109ea5e00727663dfc756753dfd898e178c8de
```

Pasaron correctamente:

- autorización y contrato `1.0.33`;
- owners, sintaxis cubierta y prueba de 27 disparadores;
- identidad LAB;
- conteos 414 clientes, 26 aseguradoras y 7 asesores;
- deploy Hosting LAB dirigido;
- verificación de SHA y runtime publicado.

El navegador se detuvo antes de Auth:

```txt
stage: canonical_auth_ui_ready
AUTH_UI_PAGE_ERROR
/modules/ia.js
SyntaxError: Unexpected end of input
línea reportada: 127
longitud recibida: 6787
```

La ejecución no alcanzó Cliente 360 ni Aseguradoras, por lo que no invalida los fixes del owner visual ni demuestra un nuevo defecto en esos módulos.

## Causa metodológica

El preflight estático no incluía `node --check orbit360-platform/modules/ia.js` y el deploy solo verificaba `runtime-build.json`. El primer consumidor que detectaba un script incompleto era el navegador, demasiado tarde para clasificar de forma determinista si el problema estaba en el checkout o en el artefacto servido por Hosting.

## Corrección del pipeline

Se agregó:

```txt
tools/orbit360-verificar-integridad-script-hosting-v20260721.mjs
```

La prueba:

1. analiza sintácticamente el archivo local con `vm.Script`;
2. confirma su cierre propietario `})();`;
3. calcula bytes, líneas y SHA-256;
4. después del deploy descarga la copia pública con `no-store`;
5. vuelve a analizar la sintaxis remota;
6. compara bytes y SHA-256 exactos;
7. bloquea el navegador si existe cualquier diferencia.

El workflow canónico ahora ejecuta:

```txt
preflight: sintaxis e integridad local
post-deploy: integridad exacta local = Hosting
solo después: navegador y tres vistas
```

No se modificaron datos, Store, Auth, `modules/ia.js`, backend, reglas ni producción.

## Siguiente acción exacta

1. registrar contrato `1.0.34`;
2. ejecutar un único preflight estático;
3. exigir sintaxis local válida de `modules/ia.js` y script de integridad válido;
4. si pasa, autorizar un deploy LAB dirigido;
5. después del deploy, exigir huella local = huella Hosting antes de abrir navegador;
6. si la huella no coincide, detener sin navegador ni reintento;
7. si coincide, ejecutar el gate final único.
