# Claude acumulado — frontera síncrona de view-model

Fecha: 2026-07-31  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

## Patrón reusable

Cuando un módulo consume datos de importadores variables, la normalización necesaria para renderizar no debe depender exclusivamente de listeners o timers posteriores.

El patrón reusable es:

`raw row → proyección canónica de lectura → view-model → renderer`

Propiedades:

- la proyección se ejecuta sincrónicamente en la frontera de lectura;
- devuelve copia visual y no persiste aliases;
- arrays opcionales ausentes se normalizan a `[]`;
- caches almacenan únicamente el view-model ya normalizado;
- listeners asíncronos pueden refrescar, pero no son requisito para evitar excepciones;
- la prueba incluye shapes incompletos válidos;
- el renderer no debe mostrar `undefined`, `NaN` ni copy técnico.

## Aplicación transversal

Reusable en módulos con listas/fichas y fuentes heterogéneas:

- Clientes;
- Pólizas;
- Vehículos;
- Recibos/cartera;
- Siniestros;
- Documentos/importadores.

## No enviar a Claude

- datos reales A&S;
- IDs reales;
- credenciales;
- Firebase/Rules;
- mecanismos de seguridad o backend protegido;
- rutas internas LAB.

El empalme debe ser selectivo sobre baseline aceptado; nunca reemplazo total del módulo.
