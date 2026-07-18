# Bloque 1 · Propagación exacta del canal LAB

Fecha: 2026-07-18  
Gate: `block1-client360-insurers-lab-v20260717`  
Evidencia: run `29662512024`, HEAD `53a4f37c39729f4f1cac45ed1fb71362b27b9807`  
Clasificación: `ENVIRONMENT_FAILURE`

## Primer fallo real

El preflight, la validación estática, la cuenta de servicio y los conteos 414/26/7 fueron aprobados. Firebase devolvió éxito y una URL válida del canal. El navegador no se instaló porque el verificador leyó un `runtime-build.json` que todavía no coincidía con el commit y run recién desplegados.

`curl --retry` reintentaba errores de transporte, pero una respuesta HTTP correcta con contenido anterior no activaba otro intento.

## Corrección

El workflow realiza hasta 20 lecturas acotadas con cache-busting por run e intento. Solo continúa cuando coinciden exactamente:

```txt
commit
run
gateId
runtimeVersion
```

El diagnóstico sanitizado v2 registra:

```txt
propagationAttempts
buildExact
phase
```

Las fuentes del runtime también se consultan con cache-busting y `Cache-Control: no-cache` antes de instalar el navegador.

## Alcance preservado

- Carril A: frontend y módulos intactos.
- Carril B: únicamente workflow, contrato y diagnóstico de deploy.
- Carril C: 414 clientes, 26 aseguradoras y 7 asesores sin reimportación.
- Sin cambios en Auth, Store, reglas, datos, `main`, merge o producción.

## Claude y Academia

- Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Patrón reusable: un deploy exitoso no equivale a contenido propagado; el gate debe verificar el manifiesto exacto servido antes de abrir navegador.

## Cierre

Solo el manifiesto exacto permite continuar al gate visual. M1 se cierra únicamente con evidencia sanitizada `ok:true`.
