# Delta reutilizable para Claude y Academia — matriz de rutas read-only

Fecha: 2026-07-14

## ¿Aplica a Claude/prototipo?

Sí, únicamente como comportamiento y lenguaje operativo. No se solicita interrumpir el trabajo actual de Claude; verificar este delta en la próxima candidata.

## Comportamiento de prototipo

- Si una identidad, rol o acceso no se resuelve, mostrar acceso pendiente/restringido y no montar el módulo.
- El alcance se aplica también al detalle y a las acciones directas, no solo a listas.
- `none` no consulta.
- Registros sin asesor no aparecen en own/team; van a calidad/corrección.
- Cuentas bancarias están disponibles para usuarios de Aseguradoras.
- Credenciales de plataformas requieren acción autorizada y proveedor seguro.
- “Acceso restringido” no debe mostrarse como “sin datos”.
- Lectura verificada no habilita escritura.

## Academia

Actualizar las rutas existentes con escenarios:

1. Asesor intenta abrir un cliente ajeno.
2. Operativo con scope equipo intenta abrir otro equipo.
3. Usuario intenta acceder a una ruta directa restringida.
4. Asesor consulta/copia una cuenta bancaria.
5. Asesor intenta revelar credenciales de plataforma.
6. Dirección consulta auditoría en solo lectura.
7. Usuario ve “Escritura bloqueada” después de una verificación read-only.

## Lenguaje visible

Usar:

- Acceso pendiente de validación.
- Tu acceso no incluye esta sección.
- Lectura verificada.
- Escritura bloqueada.
- Pendiente de conexión segura.

No usar nombres de rutas, reglas, Firestore, backend, tenant, hash o emulador en UI cliente.
