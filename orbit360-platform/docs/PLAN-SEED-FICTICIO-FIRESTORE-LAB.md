# PLAN SEED FICTICIO FIRESTORE LAB - Orbit 360

Fecha: 2026-06-30 22:51:54
Rama: feat/ays-auth-lab-correction-20260630
Firebase LAB: ays-orbit-360-lab
Tenant LAB: alianzas-soluciones

## 1. Objetivo

Preparar un seed ficticio minimo para validar colecciones criticas en Firestore LAB sin usar datos reales.

Este documento NO ejecuta carga de datos. Solo prepara la estructura y deja lista la siguiente fase bajo autorizacion expresa.

## 2. Restricciones

- No datos reales.
- No produccion.
- No Hosting deploy.
- No push.
- No hardcodear A&S como cliente en codigo.
- Datos claramente ficticios con prefijo lab_.
- Tenant usado solo como LAB: alianzas-soluciones.
- Monedas separadas por pais: GTQ y COP no se suman en crudo.
- Produccion, metas y comisiones sobre prima neta recaudada.

## 3. Archivo de datos preparado

- docs/SEED-FICTICIO-FIRESTORE-LAB.json

## 4. Colecciones incluidas

- clientes
- asesores
- aseguradoras
- vehiculos
- polizas
- cobros
- finmovs
- comisiones
- reclamos
- negocios
- gestiones
- actividades
- metas

Tambien quedan declaradas vacias para futuro:
- documentos
- contenidos
- cursos
- acreedores
- facturas
- notificaciones
- automatizaciones
- integraciones
- plantillas
- auditoria
- configuracion

## 5. Regla de carga posterior

Cuando Paula autorice cargar seed ficticio LAB, se debe ejecutar una carga temporal autenticada con orbit.lab@demo.com, usando Firestore LAB y creando documentos bajo:

tenants/alianzas-soluciones/data/{coleccion}/items/{id}

Antes de cargar:
1. Confirmar Git limpio.
2. Confirmar proyecto ays-orbit-360-lab.
3. Confirmar index-dev-firestore sin proyecto viejo.
4. Confirmar que el JSON solo contiene datos ficticios.

Despues de cargar:
1. Validar lectura por Orbit.store.
2. Validar render visual de modulos con datos ficticios.
3. Documentar en bitacora.
4. Commit local de documentacion, sin push.

## 6. Estado

PREPARADO. No ejecutado.
