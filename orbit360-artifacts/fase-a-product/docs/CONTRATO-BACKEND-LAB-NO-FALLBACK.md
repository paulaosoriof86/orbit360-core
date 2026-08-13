# Contrato Backend LAB No-Fallback

- Fecha local: 2026-07-01 00:48:15
- Rama: feat/ays-auth-lab-correction-20260630
- Objetivo: evitar que irestore-lab muestre datos demo/locales como si fueran backend LAB.

## Regla

En index-dev-firestore.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones:

1. Si no hay irebase.auth().currentUser LAB, la app debe quedarse en login o advertencia LAB.
2. No debe abrir dashboard con sesión local/demo.
3. No debe leer seed.js como sustituto silencioso de Firestore LAB.
4. No debe usar localStorage como fuente de datos principal en modo backend LAB.
5. Orbit.store debe conservar API exacta: ll, get, where, insert, update, emove, _emit.
6. Los módulos no se tocan; solo data/store.js, Auth LAB y configuración de entorno.

## Hallazgo actual

- V5 mostró API completa, pero sin Firebase Auth LAB.
- La UI visible con Paula Osorio era sesión local/demo.
- Por metodología, no se debe seguir validando seed hasta que Auth LAB sea real o hasta que el store bloquee fallback demo en LAB.

## Próximo fix técnico

Revisar data/store.js para separar claramente:

- Modo demo: puede usar seed/localStorage.
- Modo irestore-lab: solo Firebase Auth + Firestore LAB + tenant lianzas-soluciones.
- Modo producción futura: Firebase Auth/Firestore real por tenant.
