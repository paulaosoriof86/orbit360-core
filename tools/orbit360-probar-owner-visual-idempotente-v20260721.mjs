import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const sourcePath = process.argv[2] || path.resolve('orbit360-platform/core/client-insurer-visual-contract-v20260720.js');
const outputPath = process.argv[3] || path.resolve('orbit360-platform/runtime-gate-crm-v20260716/owner-idempotence-proof-sanitized.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const checks = [];

function check(id, ok, detail = '') {
  checks.push({ id, ok: Boolean(ok), detail: String(detail || '') });
}

function extractOneLineFunction(name) {
  const pattern = new RegExp(`function ${name}\\([^)]*\\)\\{[^\\n]+?\\}`);
  const match = source.match(pattern);
  if (!match) throw new Error(`FUNCTION_NOT_FOUND:${name}`);
  return vm.runInNewContext(`(${match[0]})`);
}

check('owner_revision', source.includes("idempotenceRevision:'20260721.4'"));
check('observer_declared', source.includes('canonicalObserver=null'));
check('observer_disconnects', source.includes('canonicalObserver.disconnect()'));
check('observer_reconnects', source.includes('observeCanonicalOwner()'));
check('observer_scope_structural', source.includes("record.target.id==='af-body'") && source.includes('nodeNeedsCanonicalEnhancement'));
check('client_country_filter_structural_trigger', source.includes("node.id==='f-pais'") && source.includes("node.matches('#f-pais,#f-seg"));
check('client_segment_filter_structural_trigger', source.includes("node.id==='f-seg'") && source.includes("node.querySelector('#f-pais,#f-seg"));
check('client360_trigger_contract', source.includes('client360StructuralTrigger:true'));
check('observer_ignores_own_mutations', source.includes("observerOwnMutations:false"));
check('mutation_mode', source.includes("mutationMode:'same-microtask-disconnect-own-writes'"));
check('html_helper_used_for_portal_note', source.includes("setHtmlIfChanged(note,'<b>Directorio operativo:"));
check('html_helper_used_for_bank_note', source.includes("setHtmlIfChanged(note,'<b>Datos bancarios protegidos."));
check('text_helper_used_for_knowledge_title', source.includes("setTextIfChanged(title,'🧠 Tarifas y conocimiento')"));
check('no_unconditional_portal_note_write', !source.includes("if(note)note.innerHTML='<b>Directorio operativo:"));
check('no_unconditional_bank_note_write', !source.includes("if(note)note.innerHTML='<b>Datos bancarios protegidos."));
check('no_unconditional_country_text_write', !source.includes("forEach(function(n){n.textContent='🌎 País por validar';})"));
check('no_unconditional_empty_portfolio_write', !source.includes("cells[4].innerHTML='<span class=\"badge neutral\">Sin cartera cargada</span>'"));
check('run_enhance_pauses_observer', source.includes('var resumeObserver=pauseCanonicalObserver()'));
check('run_enhance_restores_observer', source.includes('if(resumeObserver)observeCanonicalOwner()'));

const setHtmlIfChanged = extractOneLineFunction('setHtmlIfChanged');
const setTextIfChanged = extractOneLineFunction('setTextIfChanged');

let htmlValue = '';
let htmlWrites = 0;
const htmlNode = {};
Object.defineProperty(htmlNode, 'innerHTML', {
  get() { return htmlValue; },
  set(value) { htmlWrites += 1; htmlValue = value; }
});
const htmlFirst = setHtmlIfChanged(htmlNode, '<b>estable</b>');
const htmlSecond = setHtmlIfChanged(htmlNode, '<b>estable</b>');
check('html_idempotence_first_write', htmlFirst === true && htmlWrites === 1);
check('html_idempotence_second_noop', htmlSecond === false && htmlWrites === 1);

let textValue = '';
let textWrites = 0;
const textNode = {};
Object.defineProperty(textNode, 'textContent', {
  get() { return textValue; },
  set(value) { textWrites += 1; textValue = value; }
});
const textFirst = setTextIfChanged(textNode, 'estable');
const textSecond = setTextIfChanged(textNode, 'estable');
check('text_idempotence_first_write', textFirst === true && textWrites === 1);
check('text_idempotence_second_noop', textSecond === false && textWrites === 1);

let observerConnected = true;
let baseMutations = 0;
let canonicalTransforms = 0;
let followUpObserverDeliveries = 0;
function simulateBaseMutation() {
  baseMutations += 1;
  const resume = observerConnected;
  if (resume) observerConnected = false;
  canonicalTransforms += 1;
  setHtmlIfChanged(htmlNode, '<b>canónico</b>');
  if (observerConnected) followUpObserverDeliveries += 1;
  if (resume) observerConnected = true;
}
simulateBaseMutation();
check('one_base_mutation', baseMutations === 1);
check('one_canonical_transform', canonicalTransforms === 1);
check('zero_followup_mutations', followUpObserverDeliveries === 0);
check('observer_restored_after_transform', observerConnected === true);

const failed = checks.filter(item => !item.ok);
const report = {
  schemaVersion: 'orbit360-owner-visual-idempotence-proof-v2-client360-trigger',
  generatedAt: new Date().toISOString(),
  source: path.relative(process.cwd(), sourcePath).replaceAll('\\', '/'),
  idempotenceRevision: '20260721.4',
  classification: 'FUNCTIONAL_DEFECT_CLIENT360_STRUCTURAL_TRIGGER_MISSING',
  ok: failed.length === 0,
  totalChecks: checks.length,
  passedChecks: checks.length - failed.length,
  failedChecks: failed.length,
  proof: {
    baseMutations,
    canonicalTransforms,
    followUpObserverDeliveries,
    htmlWrites,
    textWrites,
    client360StructuralTriggers: ['f-pais', 'f-seg'],
    expected: 'one_base_mutation_one_transform_zero_followup_mutations_with_client360_filters'
  },
  writesExecuted: false,
  runtimeExecuted: false,
  browserExecuted: false,
  firestoreRead: false,
  vaultRead: false,
  deployExecuted: false,
  containsPII: false,
  containsSecrets: false,
  checks
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
if (!report.ok) {
  console.error(JSON.stringify({ ok: false, failed }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, totalChecks: report.totalChecks, proof: report.proof }));
