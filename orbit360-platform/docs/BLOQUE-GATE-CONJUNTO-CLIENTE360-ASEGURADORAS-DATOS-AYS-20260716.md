# Bloque — gate conjunto Cliente 360 + Aseguradoras con datos A&S

Fecha: 2026-07-16  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado de publicación: LAB temporal únicamente; sin producción, merge ni `main`.

## 1. Corrección metodológica

La validación visual posterior a una carga real no se cierra por módulo aislado ni por conteo administrativo. Debe comprobar simultáneamente:

1. dato escrito en la colección correcta;
2. hidratación mediante `Orbit.store`;
3. adaptación al contrato canónico del frontend aprobado;
4. render real de lista y ficha;
5. relaciones disponibles por fuentes separadas;
6. rol activo y alcance de datos;
7. navegación y responsive;
8. estados honestos cuando una fuente aún no fue cargada.

Un dry-run no equivale a escritura. Una escritura no equivale a proyección visual. Una ficha con pestañas no prueba que existan las fuentes relacionadas.

## 2. Alcance real de la carga ejecutada

La carga controlada de 2026-07-14 escribió en Firebase LAB:

- `clientes`: 414;
- `aseguradoras`: 26;
- `asesores`: catálogo canónico requerido.

La autorización excluyó expresamente:

- pólizas;
- vehículos;
- cobros;
- cartera/recibos;
- `finmovs`;
- producción.

Los 26 clientes retenidos permanecen fuera de escritura por duplicidad o validación. Los 414 clientes escritos conservan estado inicial `pendiente_polizas` hasta procesar la fuente Pólizas.

## 3. Hallazgo de Cliente 360

El importador normalizó campos como:

- `tipoPersona`;
- `numeroDocumento`;
- `correo`;
- `whatsapp`;
- `telefonoAlterno`;
- `ciudadMunicipio`;
- `departamentoProvincia`.

El frontend aprobado de Cliente 360 consume principalmente:

- `tipo`;
- `identificacion`;
- `email`;
- `telefono`;
- `ciudad`;
- `departamento`;
- `etiquetas`.

La carga existía, pero la ausencia de una proyección canónica podía producir cero visual, campos vacíos o error de render. No correspondía reimportar.

## 4. Fix aplicado

Se añadió `core/client-canonical-view-projection-v20260716.js`.

Contrato:

- adapta alias únicamente en memoria;
- conserva los campos de origen y trazabilidad;
- no escribe `Orbit.store`;
- no reimporta;
- no reemplaza `modules/cliente360.js`;
- reutiliza el renderer aprobado;
- vuelve a proyectar cuando llegan snapshots reales.

También se conectó explícitamente la proyección de Cliente 360, la visibilidad multirol y la proyección de conocimiento de Aseguradoras desde el runtime LAB aditivo.

## 5. Gate conjunto obligatorio

El workflow `orbit360-aseguradoras-runtime-gate-v20260716.yml` valida ahora ambos módulos en una misma versión LAB.

### Conteos bloqueantes

- Clientes: exactamente 414.
- Aseguradoras: exactamente 26.
- Asesores: catálogo disponible.

Pólizas, vehículos, cobros, comisiones, reclamos y gestiones se reportan como conteos de completitud, pero no se fabrican ni se exigen desde la fuente Clientes.

### Cliente 360

En Dirección escritorio, Operativo tableta y Asesor móvil:

- la lista no puede quedar vacía;
- KPI Clientes debe mostrar 414 dentro del alcance de Paula;
- una ficha real debe abrir sin error;
- debe existir proyección canónica;
- estado inicial debe ser `pendiente_polizas`;
- deben renderizar las diez pestañas: Resumen, Pólizas, Vehículos, Cobros, Recibos, Renovaciones, Siniestros, Comisiones, Correos e Historial;
- los vacíos relacionales deben ser honestos hasta cargar sus fuentes;
- no debe aparecer copy técnico de Firebase, Firestore, almacenamiento local, mock o smoke.

### Aseguradoras

En las tres vistas:

- deben aparecer exactamente 26 tarjetas;
- Guatemala debe aparecer primero según configuración tenant;
- la ficha abre en lectura;
- Asesor no puede editar;
- el gate selecciona una aseguradora realmente mapeada, no la primera tarjeta arbitraria;
- `Tarifas y conocimiento` debe mostrar fuentes vinculadas y estado real de sincronización/validación.

## 6. Seguridad de evidencia

Los artefactos automáticos contienen únicamente:

- conteos;
- booleanos;
- nombres de checks;
- errores técnicos sanitizados.

No se suben capturas de clientes, nombres, correos, documentos, teléfonos, secretos ni payloads reales.

## 7. Próxima fuente y orden operativo

Después de cerrar visualmente Clientes y Aseguradoras:

1. Pólizas, fuente separada;
2. Vehículos, como complemento vinculado, sin convertir filas complementarias en pólizas nuevas;
3. recibos/cartera según vigencia y forma de pago;
4. cobros realizados y conciliación;
5. planillas/comisiones;
6. Cotizador/Comparativo;
7. Ops/Leads.

Los archivos de pólizas, vehículos y cobranza ya están documentados por nombre y conteo. Si no están accesibles en el entorno activo, solicitar únicamente el archivo exacto requerido; no repetir el levantamiento completo.

## 8. Instrucción para Claude/prototipo

Claude debe incorporar de forma canónica y reusable:

- un contrato de vista canónica para datos importados con alias de campos;
- estados vacíos por fuente, no datos demo ni relaciones inventadas;
- ficha Cliente 360 completa aunque algunas fuentes sigan pendientes;
- indicador de completitud por expediente y fuente;
- visibilidad final `base por rol + extras - restricciones`;
- preservación del asesor al cambiar rol activo;
- un solo renderer propietario por ruta;
- pruebas responsive con datasets realistas sanitizados.

No se trasladan datos A&S, Firebase, secretos ni lógica exclusiva del backend.

## 9. Impacto en Academia

Actualizar rutas por rol con el caso:

> El cliente existe y su ficha abre, pero todavía no tiene pólizas, vehículos ni cobros.

Respuesta correcta:

- verificar qué fuente ya fue escrita;
- mostrar `pendiente_polizas` y calidad de datos;
- no inferir relaciones;
- no reimportar Clientes;
- procesar Pólizas como siguiente fuente;
- luego vincular Vehículos, Recibos y Cobros según sus contratos.

Evaluación aplicada: distinguir `dry-run`, `escrito`, `visible`, `relacionado`, `validado` y `operativo`.
