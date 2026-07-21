#!/usr/bin/env node
'use strict';

/* Compatibilidad post-migración: este entrypoint ya no escribe datos. */
process.env.ORBIT360_POST_MIGRATION_COMPAT = '1';
await import('./orbit360-inventariar-cuentas-protegidas-aseguradoras-lab-v20260721.mjs');
