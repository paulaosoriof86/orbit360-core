#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const ROOT=process.cwd();
const GATE_ID=process.argv[2]||'block1-client360-insurers-lab-v20260717';
const EVIDENCE_REL='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH=path.join(ROOT,EVIDENCE_REL);
const CANONICAL_LIFECYCLE_COMPOSITION='phase-capability-contract-v1';
const ZERO={secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
const GATE_CONFIG=Object.freeze({
  "block1-client360-insurers-lab-v20260717":{contractVersion:"1.0.40",lifecycle:"tools/orbit360-validator-lifecycle-contract-v20260722.json",engine:"tools/orbit360-validar-gate-contracts-engine-capabilities-v20260722.mjs"},
  "block2-product-readonly-bootstrap-v20260723":{contractVersion:"2.0.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-m2-v20260723.json",engine:"tools/orbit360-validar-gate-contracts-engine-m2-v20260723.mjs"},
  "block2-product-readonly-runtime-v20260723":{contractVersion:"2.2.1",lifecycle:"tools/orbit360-validator-lifecycle-contract-m2-runtime-v20260723.json",engine:"tools/orbit360-validar-gate-contracts-engine-m2-runtime-v20260723.mjs"},
  "block3-tenant-activation-static-v20260724":{contractVersion:"3.0.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-m3-v20260724.json",engine:"tools/orbit360-validar-gate-contracts-engine-m3-v20260724.mjs"},
  "block3-tenant-activation-runtime-v20260724":{contractVersion:"3.1.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-m3-runtime-v20260724.json",engine:"tools/orbit360-validar-gate-contracts-engine-m3-runtime-v20260724.mjs"},
  "block4-durable-writer-static-v20260724":{contractVersion:"4.0.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-v20260724.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-v20260724.mjs"},
  "block4-durable-writer-dryrun-v20260724":{contractVersion:"4.1.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-dryrun-v20260724.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-dryrun-v20260724.mjs"},
  "block4-data-reconciliation-readonly-v20260725":{contractVersion:"4.2.1",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-reconciliation-v20260725.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-reconciliation-v20260725.mjs"},
  "block4-client-country-schema-readonly-v20260725":{contractVersion:"4.2.2",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-client-country-schema-v20260725.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-client-country-schema-v20260725.mjs"},
  "block4-client-country-values-readonly-v20260725":{contractVersion:"4.2.3",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-client-country-values-v20260725.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-client-country-values-v20260725.mjs"},
  "block4-client-country-business-validation-dryrun-v20260725":{contractVersion:"4.2.4",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-client-country-business-validation-v20260725.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-client-country-business-validation-v20260725.mjs"},
  "block4-client-country-business-validation-semantic-repair-static-v20260725":{contractVersion:"4.2.5",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-client-country-business-validation-semantic-v20260725.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-client-country-business-validation-semantic-v20260725.mjs"},
  "block4-client-country-business-validation-correction-dryrun-v20260725":{contractVersion:"4.2.6",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-client-country-business-validation-correction-v20260725.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-client-country-business-validation-correction-v20260725.mjs"},
  "block4-target-only-reconciliation-readonly-v20260725":{contractVersion:"4.2.7",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-target-only-reconciliation-v20260725.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-target-only-reconciliation-v20260725.mjs"},
  "block4-target-only-retirement-dryrun-v20260725":{contractVersion:"4.2.8",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-target-only-retirement-dryrun-v20260725.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-target-only-retirement-dryrun-v20260725.mjs"},
  "block4-target-only-retirement-write-v20260726":{contractVersion:"4.2.9",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-target-only-retirement-write-v20260726.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-target-only-retirement-write-v20260726.mjs"},
  "block4-post-retirement-revalidation-readonly-v20260728":{contractVersion:"4.2.10",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-post-retirement-revalidation-v20260728.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-post-retirement-revalidation-v20260728.mjs"},
  "block4-client-country-correction-write-v20260728":{contractVersion:"4.2.11",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-client-country-correction-v20260728.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-client-country-correction-write-v20260728.mjs"},
  "block4-final-canonical-migration-dryrun-v20260728":{contractVersion:"4.3.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-final-canonical-migration-v20260728.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-final-canonical-migration-v20260728.mjs"},
  "block4-final-canonical-migration-write-v20260728":{contractVersion:"4.3.1",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-final-canonical-write-v20260728.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-final-canonical-write-v20260728.mjs"},
  "block4-final-canonical-revalidation-readonly-v20260728":{contractVersion:"4.3.2",lifecycle:"tools/orbit360-validator-lifecycle-contract-m4-final-canonical-revalidation-v20260728.json",engine:"tools/orbit360-validar-gate-contracts-engine-m4-final-canonical-revalidation-v20260728.mjs"},
  "block5-release-candidate-visualization-v20260728":{contractVersion:"5.0.44",lifecycle:"tools/orbit360-validator-lifecycle-contract-m5-corrective-delivery-runtime-544-v20260730.json",engine:"tools/orbit360-validar-gate-contracts-engine-m5-corrective-delivery-runtime-544-v20260730.mjs"},
  "block6-go-live-product-v20260730":{contractVersion:"6.3.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-m6-final-closure-630-v20260730.json",engine:"tools/orbit360-validar-gate-contracts-engine-m6-final-closure-630-resume-v20260730.mjs"},
  "block7-policies-static-v20260730":{contractVersion:"7.0.1",lifecycle:"tools/orbit360-validator-lifecycle-contract-policies-static-v20260730.json",engine:"tools/orbit360-validar-gate-contracts-engine-policies-static-v20260730.mjs"},
  "block7-policies-dual-path-reconciliation-readonly-v20260801":{contractVersion:"7.2.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-policies-dual-path-reconciliation-readonly-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-policies-dual-path-reconciliation-readonly-v20260801.mjs"},
  "block7-policies-dual-path-provenance-recommendation-readonly-v20260801":{contractVersion:"7.3.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-policies-dual-path-provenance-recommendation-readonly-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-policies-dual-path-provenance-recommendation-readonly-v20260801.mjs"},
  "block7-policies-authority-canonical-dryrun-readonly-v20260801":{contractVersion:"7.4.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-policies-authority-canonical-dryrun-readonly-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-policies-authority-canonical-dryrun-readonly-v20260801.mjs"},
  "block7-policies-canonical-controlled-write-lab-v20260801":{contractVersion:"7.5.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-policies-canonical-controlled-write-lab-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-policies-canonical-controlled-write-lab-v20260801.mjs"},
  "block7-policies-canonical-postwrite-revalidation-readonly-v20260801":{contractVersion:"7.6.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-policies-canonical-postwrite-revalidation-readonly-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-policies-canonical-postwrite-revalidation-readonly-v20260801.mjs"},
  "block7-policies-hold-parent-dependency-diagnostic-readonly-v20260801":{contractVersion:"7.7.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-policies-hold-parent-dependency-diagnostic-readonly-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-policies-hold-parent-dependency-diagnostic-readonly-v20260801.mjs"},
  "block7-policies-held-parents-controlled-write-lab-v20260801":{contractVersion:"7.8.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-policies-held-parents-controlled-write-lab-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-policies-held-parents-controlled-write-lab-v20260801.mjs"},
  "block7-policies-full-canonical-revalidation-readonly-v20260801":{contractVersion:"7.9.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-policies-full-canonical-revalidation-readonly-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-policies-full-canonical-revalidation-readonly-v20260801.mjs"},
  "block7-canonical-store-cumulative-adapter-static-v20260801":{contractVersion:"7.10.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-canonical-store-cumulative-adapter-static-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-canonical-store-cumulative-adapter-static-v20260801.mjs"},
  "block7-canonical-runtime-cumulative-visual-lab-v20260801":{contractVersion:"7.11.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-canonical-runtime-cumulative-visual-lab-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-canonical-runtime-cumulative-visual-lab-v20260801.mjs"},
  "block7-gravicentra-insurance-rc1-predeploy-readonly-v20260803":{contractVersion:"7.12.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-gravicentra-rc1-predeploy-readonly-v20260803.json",engine:"tools/orbit360-validar-gate-contracts-engine-gravicentra-rc1-predeploy-readonly-v20260803.mjs"},
  "block7.13-rc12-membership-rootcause-cumulative-closure-v20260803":{contractVersion:"7.13.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-rc12-rootcause-cumulative-closure-v20260803.json",engine:"tools/orbit360-validar-gate-contracts-engine-rc12-rootcause-cumulative-closure-v20260803.mjs"},
  "block7.14-rc12-normal-onboarding-close-v20260804":{contractVersion:"7.14.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-rc12-normal-onboarding-close-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-rc12-normal-onboarding-close-v20260804.mjs"},
  "block7.15-rc12-approved-roster-final-go-live-v20260804":{contractVersion:"7.15.1",lifecycle:"tools/orbit360-validator-lifecycle-contract-rc12-approved-roster-final-go-live-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-rc12-approved-roster-final-go-live-v20260804.mjs"},
  "block7.15.2-rc12-approved-roster-rollback-recovery-v20260804":{contractVersion:"7.15.2",lifecycle:"tools/orbit360-validator-lifecycle-contract-rc12-approved-roster-rollback-recovery-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-rc12-approved-roster-rollback-recovery-v20260804.mjs"},
  "block8-vehicles-static-v20260730":{contractVersion:"8.0.1",lifecycle:"tools/orbit360-validator-lifecycle-contract-vehicles-static-v20260730.json",engine:"tools/orbit360-validar-gate-contracts-engine-vehicles-static-v20260730.mjs"},
  "block9-receipts-portfolio-static-v20260730":{contractVersion:"9.1.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-receipts-portfolio-static-v910-20260730.json",engine:"tools/orbit360-validar-gate-contracts-engine-receipts-portfolio-static-v910-20260730.mjs"},
  "block10.9-cobros-controlled-write-lab-v20260801":{contractVersion:"10.9.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-cobros-controlled-write-lab-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-cobros-controlled-write-preflight-v20260801.mjs"},
  "block11-planillas-comisiones-linkage-readonly-v20260801":{contractVersion:"11.0.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-planillas-comisiones-linkage-readonly-v20260801.json",engine:"tools/orbit360-validar-gate-contracts-engine-planillas-comisiones-linkage-readonly-v20260801.mjs"},
  "block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.11",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-layoutfree-lab-v20260804.mjs"},
  "block12-runtime-hang-rescue-lab-v20260804":{contractVersion:"12.0.4",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-runtime-hang-rescue-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-runtime-hang-rescue-lab-v20260804.mjs"},
  "block-auth-access-recovery-lab-v20260805":{contractVersion:"13.0.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-lab-v20260805.mjs"},
  "block-auth-access-recovery-lab-v2-20260805":{contractVersion:"13.1.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v2-20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-lab-v2-20260805.mjs"},
  "block-auth-access-recovery-lab-v3-20260805":{contractVersion:"13.2.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v3-20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-lab-v3-20260805.mjs"},
  "block-auth-access-recovery-source-only-v4-20260805":{contractVersion:"13.3.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-source-only-v4-20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-source-only-v4-20260805.mjs"},
  "block-auth-access-recovery-lab-v5-20260805":{contractVersion:"13.4.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v5-20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-lab-v5-20260805.mjs"},
  "block-auth-access-recovery-source-only-v6-20260805":{contractVersion:"13.5.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-source-only-v6-20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-source-only-v6-20260805.mjs"},
  "block-auth-foundation-all-team-source-only-v20260805":{contractVersion:"13.6.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-foundation-all-team-source-only-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-foundation-all-team-source-only-v20260805.mjs"},
  "block-auth-foundation-all-team-runtime-v20260805":{contractVersion:"13.7.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-foundation-all-team-runtime-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-foundation-all-team-runtime-v20260805.mjs"},
  "block-auth-foundation-roster-resolution-and-runtime-v20260805":{contractVersion:"13.8.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-foundation-roster-resolution-and-runtime-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-foundation-roster-resolution-and-runtime-v20260805.mjs"},
  "block-auth-selfmanaged-credentials-runtime-v20260805":{contractVersion:"13.9.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-selfmanaged-credentials-runtime-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-selfmanaged-credentials-runtime-v20260805.mjs"}
});
const PHASE_PROFILES=Object.freeze({
  "STATIC_PREFLIGHT":ZERO,
  "EXISTING_IDENTITY_RUNTIME_PREPARATION":ZERO,
  "EXISTING_IDENTITY_ROOT_CAUSE_STATIC":ZERO,
  "EXISTING_IDENTITY_RUNTIME_AUTHORIZED_ONCE_PREFLIGHT":ZERO,
  "EXISTING_IDENTITY_MEMBERSHIP_ROOT_CAUSE_STATIC":ZERO,
  "M3_TENANT_ACTIVATION_STATIC_PREPARATION":ZERO,
  "M3_TENANT_ACTIVATION_STATIC_READY":ZERO,
  "M3_TENANT_ACTIVATION_CLOSED":ZERO,
  "M4_DURABLE_WRITER_STATIC_READY":ZERO,
  "M4_DURABLE_WRITER_DRYRUN_CLOSED":ZERO,
  "M4_DATA_RECONCILIATION_STATIC_REPAIR_READY":ZERO,
  "M4_CLIENT_COUNTRY_BUSINESS_VALIDATION_SEMANTIC_REPAIR_STATIC":ZERO,
  "M5_RC_READINESS_STATIC":ZERO,
  "M5_ACCESS_ROLE_BOUNDARY_STATIC":ZERO,
  "M5_POST_ACCESS_RC_READINESS_STATIC":ZERO,
  "M5_RUNTIME_SMOKE_ROOT_CAUSE_REMEDIATION_STATIC":ZERO,
  "M5_VALIDATOR_REDESIGN_STATIC":ZERO,
  "M6_PRODUCT_SHELL_STATIC_PREPARATION":ZERO,
  "M6_PRODUCT_GO_LIVE_PIPELINE_REMEDIATION_STATIC":ZERO,
  "M6_PRODUCT_SMOKE_VALIDATOR_REMEDIATION_STATIC":ZERO,
  "M6_PRODUCT_BOOTSTRAP_DATA_CONTRACT_REMEDIATION_STATIC":ZERO,
  "M6_PRODUCT_QUERY_ALIAS_REMEDIATION_STATIC":ZERO,
  "M6_PRODUCT_ACCESS_MEMBERSHIP_REMEDIATION_STATIC":ZERO,
  "M6_FINAL_PACKAGE_STATIC":ZERO,
  "POLICIES_STATIC_QUALIFICATION":ZERO,
  "VEHICLES_STATIC_QUALIFICATION":ZERO,
  "RECEIPTS_PORTFOLIO_STATIC_QUALIFICATION":ZERO,
  "GRAVICENTRA_RC12_ROOTCAUSE_CUMULATIVE_AUDIT_CLOSURE":{"secrets":true,"firestoreRead":true,"writes":true,"runtime":true,"browser":true,"deploy":true,"functionsDeploy":false,"rulesDeploy":false,"production":true},
  "GRAVICENTRA_RC12_NORMAL_ONBOARDING_CLOSURE":{"secrets":true,"firestoreRead":true,"writes":true,"runtime":true,"browser":true,"deploy":true,"functionsDeploy":false,"rulesDeploy":false,"production":true},
  "GRAVICENTRA_RC12_APPROVED_ROSTER_FINAL_GO_LIVE":{"secrets":true,"firestoreRead":true,"writes":true,"runtime":true,"browser":true,"deploy":true,"functionsDeploy":false,"rulesDeploy":false,"production":true},
  "GRAVICENTRA_RC12_APPROVED_ROSTER_ROLLBACK_RECOVERY":{"secrets":true,"firestoreRead":true,"writes":true,"runtime":false,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M5_LAB_HOSTING_DELIVERY":{"secrets":true,"firestoreRead":false,"writes":false,"runtime":false,"browser":false,"deploy":true,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M5_LAB_CORRECTIVE_DELIVERY_RUNTIME":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":true,"deploy":true,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M6_PRODUCT_GO_LIVE_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":true,"deploy":true,"functionsDeploy":false,"rulesDeploy":true,"production":true},
  "M6_PRODUCT_GO_LIVE_ROOT_CAUSE_DIAGNOSTIC":{"secrets":true,"firestoreRead":false,"writes":false,"runtime":false,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M6_PRODUCT_GO_LIVE_CORRECTIVE_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":true,"deploy":true,"functionsDeploy":false,"rulesDeploy":true,"production":true},
  "M6_PRODUCT_GO_LIVE_RECOVERY_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":true,"deploy":true,"functionsDeploy":false,"rulesDeploy":true,"production":true},
  "GRAVICENTRA_RC1_PREDEPLOY_READONLY":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "LAB_DATA_CONTRACT_REPAIR_DRYRUN":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":false,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "LAB_DATA_CONTRACT_REPAIR_APPLY":{"secrets":true,"firestoreRead":true,"writes":true,"runtime":false,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "LAB_HOSTING_DELIVERY":{"secrets":true,"firestoreRead":false,"writes":false,"runtime":false,"browser":false,"deploy":true,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "LAB_RUNTIME_GATE":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":true,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "EXISTING_PROJECT_RECONCILIATION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":false,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "EXISTING_IDENTITY_RUNTIME_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M3_TENANT_ACTIVATION_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_DURABLE_WRITER_DRYRUN_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_DATA_RECONCILIATION_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":false,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_CLIENT_COUNTRY_SCHEMA_AUDIT_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_CLIENT_COUNTRY_VALUES_AUDIT_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_CLIENT_COUNTRY_BUSINESS_VALIDATION_DRYRUN_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_CLIENT_COUNTRY_BUSINESS_VALIDATION_CORRECTION_DRYRUN_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_TARGET_ONLY_RECONCILIATION_READONLY_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_TARGET_ONLY_RETIREMENT_DRYRUN_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_TARGET_ONLY_RETIREMENT_WRITE_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":true,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_POST_RETIREMENT_REVALIDATION_READONLY_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_CLIENT_COUNTRY_CORRECTION_WRITE_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":true,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_FINAL_CANONICAL_MIGRATION_DRYRUN_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_FINAL_CANONICAL_MIGRATION_WRITE_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":true,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "M4_FINAL_CANONICAL_REVALIDATION_READONLY_EXECUTION":{"secrets":true,"firestoreRead":true,"writes":false,"runtime":true,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},
  "OPERATIONAL_RUNTIME_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:true,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},
  "OPERATIONAL_RUNTIME_LAB_VISUAL_REACTIVATION":{secrets:true,firestoreRead:true,writes:false,runtime:false,browser:true,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},
  "RUNTIME_HANG_RESCUE_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:true,runtime:false,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},
  "AUTH_ACCESS_RECOVERY_LAB":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},
  "AUTH_ACCESS_RECOVERY_LAB_V2":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},
  "AUTH_ACCESS_RECOVERY_LAB_V3":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},
  "AUTH_ACCESS_RECOVERY_SOURCE_ONLY_V4":ZERO,
  "AUTH_ACCESS_RECOVERY_LAB_V5":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},
  "AUTH_ACCESS_RECOVERY_SOURCE_ONLY_V6":ZERO,
  "AUTH_FOUNDATION_ALL_TEAM_SOURCE_ONLY":ZERO,
  "AUTH_FOUNDATION_ALL_TEAM_RUNTIME":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},
  "AUTH_FOUNDATION_DYNAMIC_TEAM_RUNTIME":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},
  "AUTH_SELFMANAGED_CREDENTIALS_RUNTIME":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}
});
function readJson(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function exactCapabilities(actual,expected){const a=Object.keys(actual||{}).sort(),e=Object.keys(expected||{}).sort();return JSON.stringify(a)===JSON.stringify(e)&&e.every(key=>actual[key]===expected[key]);}
function writeEvidence(payload){fs.mkdirSync(path.dirname(EVIDENCE_PATH),{recursive:true});fs.writeFileSync(EVIDENCE_PATH,JSON.stringify(payload,null,2)+'\n','utf8');}
let output;let exitCode=41;
try{
  const config=GATE_CONFIG[GATE_ID];if(!config)throw new Error('CANONICAL_GATE_NOT_REGISTERED_IN_ENTRYPOINT');
  if(!fs.existsSync(path.join(ROOT,config.lifecycle)))throw new Error('CANONICAL_LIFECYCLE_CONTRACT_MISSING');
  if(!fs.existsSync(path.join(ROOT,config.engine)))throw new Error('CANONICAL_ENGINE_MISSING');
  const lifecycle=readJson(config.lifecycle);
  if(lifecycle.gateId!==GATE_ID)throw new Error('CANONICAL_GATE_MISMATCH');
  if(lifecycle.gateContractVersion!==config.contractVersion)throw new Error('CANONICAL_GATE_VERSION_MISMATCH');
  if(lifecycle.validatorLifecycleRevision!==CANONICAL_LIFECYCLE_COMPOSITION)throw new Error('CANONICAL_LIFECYCLE_REVISION_MISMATCH');
  const profile=lifecycle.executionProfile||{},expected=PHASE_PROFILES[String(profile.phase||'')];
  if(!expected)throw new Error('CANONICAL_LIFECYCLE_PHASE_MISMATCH');
  if(!exactCapabilities(profile.capabilities||{},expected))throw new Error('CANONICAL_LIFECYCLE_CAPABILITY_MISMATCH');
  const run=spawnSync(process.execPath,[config.engine,GATE_ID],{cwd:ROOT,env:{...process.env,ORBIT360_BRANCH:'ays/backend-tenant-lab-v99-20260703'},encoding:'utf8',maxBuffer:32*1024*1024});
  exitCode=Number.isInteger(run.status)?run.status:41;if(run.error)throw run.error;
  if(!fs.existsSync(EVIDENCE_PATH))throw new Error('CANONICAL_ENGINE_EVIDENCE_MISSING');
  const parsed=readJson(EVIDENCE_REL);
  output={...parsed,canonicalEntrypoint:'tools/orbit360-validar-gate-contracts-v20260717.mjs',canonicalEngine:config.engine,canonicalLifecycleContract:config.lifecycle,canonicalLifecycleComposition:CANONICAL_LIFECYCLE_COMPOSITION,engineEvidenceSource:'sync-file-evidence-not-stdout-v1',engineStdoutParsed:false,sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  if(run.stderr)output.stderrSanitized=String(run.stderr).trim().slice(0,2000);
}catch(error){
  const config=GATE_CONFIG[GATE_ID]||{};
  output={schemaVersion:'orbit360-gate-contract-preflight-canonical-router-v1',gateId:GATE_ID,contractVersion:config.contractVersion||'',status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['CANONICAL_PREFLIGHT_ENTRYPOINT'],error:String(error&&error.message||error),canonicalLifecycleComposition:CANONICAL_LIFECYCLE_COMPOSITION,canonicalEngine:config.engine||'',sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  exitCode=41;
}
writeEvidence(output);console.log(JSON.stringify(output,null,2));process.exit(exitCode);
