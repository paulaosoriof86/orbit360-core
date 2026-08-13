# Bloque 1 · Precarga del núcleo genérico

Fecha: 2026-07-18

## Clasificación

`FUNCTIONAL_DEFECT` de ubicación del bootstrap.

## Evidencia

El core reusable de configuración de aseguradoras coincide con el archivo publicado y ejecuta correctamente en aislamiento, con y sin Service Worker controlado. Dentro de la plataforma completa, su carga tardía quedaba detenida después de finalizar la respuesta de red.

## Corrección

`core/tenant-insurer-config-p10.js` y `data/tenant-runtime-config-index.js` son dependencias genéricas y estables del producto. Se cargan con el shell antes del Router. No contienen datos personales, secretos ni configuración activa de Alianzas y Soluciones.

El Router conserva el ownership de readiness y secuencia. Cuando encuentra ambos owners listos, registra el estado y avanza sin volver a solicitarlos. Solo la configuración activa del tenant permanece dinámica.

## Carriles

- Carril A: Cliente 360, Aseguradoras y UX preservados.
- Carril B: shell y bootstrap genérico corregidos; Store, Auth, reglas y renderers intactos.
- Carril C: 414 clientes, 26 aseguradoras y 7 asesores; sin reimportación.

## Claude y Academia

- Clasificación Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Patrón reusable: separar núcleo estable, índice genérico y configuración tenant activa.
- Academia: enseñar que un owner genérico estable pertenece al bootstrap del producto, mientras los datos tenant se resuelven por configuración.

## Salida

Preflight vinculante primero. Después, una única ejecución oficial. M1 cierra exclusivamente con evidencia sanitizada `ok:true`.
