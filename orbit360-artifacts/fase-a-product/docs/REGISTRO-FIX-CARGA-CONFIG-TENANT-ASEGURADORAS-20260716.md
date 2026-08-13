# Registro de fix — carga de configuración tenant antes de proyección Aseguradoras

Fecha: 2026-07-16  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Tenant LAB: `alianzas-soluciones`

## Necesidad

El resumen sanitizado de conocimiento de Aseguradoras ya estaba mapeado, pero la vista `Tarifas y conocimiento` podía no localizarlo durante el arranque del runtime.

## Causa raíz

La proyección frontend podía cargarse antes de la configuración tenant que contiene `knowledgeSummarySrc`. El problema era de orden y disponibilidad de configuración, no de falta de mapeo, falta de datos ni necesidad de reconstruir la ficha.

## Fix aplicado

La carga aditiva queda secuenciada así:

1. contrato reusable `tenant-insurer-config-p10`;
2. configuración del tenant `alianzas-soluciones`;
3. proyección frontend de Aseguradoras;
4. refresco explícito del resumen al completar la configuración.

Se amplió el validador para bloquear cualquier regresión que vuelva a cargar la proyección antes de la configuración tenant.

## Carril A — frontend/prototipo

- Se conserva `modules/aseguradoras.js` como renderer canónico aprobado.
- No se reconstruye la ficha ni se reemplaza el DOM.
- La mejora es reusable y debe pasar a Claude/prototipo: contrato/configuración antes de proyección/render.
- Estado visible honesto: `mapeado, pendiente de sincronización/validación` mientras no exista persistencia operativa validada.

## Carril B — backend protegido

No se modificaron:

- `Orbit.store`;
- adaptador Firestore LAB;
- Auth;
- reglas Firestore;
- loaders/guards backend protegidos;
- importadores protegidos.

## Carril C — datos A&S

Se reutiliza el resumen sanitizado existente. No se repite importación ni mapeo. No se habilitan automáticamente Cotizador o Comparativo y no se introducen tasas comerciales, PII, secretos o documentos fuente en el repositorio.

Conteos LAB que deben conservarse en el gate conjunto:

- clientes: 414;
- aseguradoras: 26;
- asesores: 7.

La carga inicial de Clientes/Aseguradoras no creó pólizas, vehículos, cobros, cartera, recibos ni `finmovs`.

## Academia

Agregar el caso aplicado:

> Una fuente puede estar mapeada y todavía no aparecer porque falta cargar o sincronizar la configuración de proyección. La acción correcta es resolver el enlace/configuración y validar el estado; no reimportar, no duplicar y no habilitar tarifas sin validación.

## Validación obligatoria

El cierre requiere gate conjunto en una sola versión LAB:

- Dirección escritorio;
- Operativo tableta;
- Asesor móvil;
- cláusula legal una sola vez;
- Cliente 360 con 414 expedientes;
- Aseguradoras con 26 entidades;
- GT primero;
- ficha en lectura por defecto;
- conocimiento mapeado visible;
- menú móvil completo;
- sin copy técnico visible.

Producción permanece bloqueada hasta PASS comprobado y hasta completar los gates productivos de backend, Auth, reglas, secretos, cargas por fuente y smoke final.
