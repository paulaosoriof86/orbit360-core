(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  window.Orbit.Academia=window.Orbit.Academia||[];
  window.Orbit.Academia.push(Object.freeze({
    version: '1.236',
    id: 'm2-existing-project-reconciliation-20260724',
    title: 'Diferenciar proyecto inexistente de pipeline mal reconciliado',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    existingProjectReused: true,
    newProjectRequired: false,
    existingSecretAliasesReused: true,
    authMembershipReadOnly: true,
    operationalWrites: 0,
    rulesChanged: false,
    runtimeExecuted: false,
    lesson: 'Antes de crear infraestructura o secretos nuevos, se auditan el proyecto ya operativo, sus aliases de identidad y el impacto de Rules globales. Un secret con nombre nuevo ausente no demuestra que Firebase no exista.',
    roles: ['Dirección','Operativo','Asesor'],
    claudeClassification: 'BACKEND_PROTEGIDO_NO_CLAUDE',
    academyImpact: 'ACADEMIA_ACTUALIZAR'
  }));
})();
