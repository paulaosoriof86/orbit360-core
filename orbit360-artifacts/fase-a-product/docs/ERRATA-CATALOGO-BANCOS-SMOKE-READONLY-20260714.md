# Errata vinculante — catálogo read-only y cuentas bancarias

Fecha: 2026-07-14  
Carril: B — backend protegido  
Estado: corregido en contrato; sin Firebase, sin reglas, sin deploy.

## Contradicción corregida

El catálogo inicial de smoke read-only marcaba `cuentasBancariasAseguradora` como denegada para Operativo y Asesor. Esa regla contradice la decisión operativa vigente:

> Toda persona con acceso al módulo Aseguradoras puede consultar y copiar las cuentas bancarias de las aseguradoras para orientar a los clientes.

La restricción corresponde a credenciales de plataformas, no a cuentas bancarias.

## Fuente efectiva

A partir de este bloque, la política efectiva es:

```txt
tenantAccessPolicyP0
+ aseguradorasBankAccountVisibilityPolicyP0.COLLECTION_POLICY_OVERRIDE
= tenantAccessPolicyEffectiveP0
```

El catálogo corregido incluye cuentas bancarias como colección requerida para:

- Dirección;
- Operativo;
- Asesor.

Mantiene:

- plataformas/credenciales restringidas para Asesor;
- edición bancaria como permiso separado;
- cero escrituras durante el smoke;
- cero autorización de deploy.

## Archivos reemplazados/añadidos

- `core/tenant-access-policy-effective-p0.js` — nuevo.
- `core/product-readonly-smoke-catalog-p0.js` — corregido sin cambiar la API pública.
- validador, generador y workflow del catálogo — actualizados.

## Carriles

- A: Claude sigue trabajando sobre la candidata; no requiere interrupción.
- B: contradicción de contratos corregida.
- C: no se escribieron ni leyeron datos reales.
