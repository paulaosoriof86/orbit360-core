import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const file = path.join(root, 'orbit360-platform/core/backend-lab-canonical-view-sync.js');
const source = fs.readFileSync(file, 'utf8');
const failures = [];

function requirePattern(pattern, label) {
  if (!pattern.test(source)) failures.push(`Falta: ${label}`);
}

function forbidPattern(pattern, label) {
  if (pattern.test(source)) failures.push(`Prohibido: ${label}`);
}

requirePattern(/mod\.render\(host\)/, 'reutilización del renderer canónico del módulo');
requirePattern(/orbit:store:emit/, 'escucha de hidratación del store');
requirePattern(/orbit:backend:write-ok/, 'escucha de escritura confirmada');
requirePattern(/cliente360/, 'ruta Cliente360');
requirePattern(/aseguradoras/, 'ruta Aseguradoras');
requirePattern(/prototype-canonical/, 'marcador de frontend canónico');
forbidPattern(/host\.innerHTML\s*=/, 'renderer HTML alterno');
forbidPattern(/document\.write\s*\(/, 'inyección de documento');
forbidPattern(/Orbit\.modules\.(?:cliente360|aseguradoras)\s*=/, 'sustitución de módulos aprobados');
forbidPattern(/Orbit\.store\s*=/, 'sustitución de Orbit.store');

if (failures.length) {
  console.error('FAIL canonical view sync');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('PASS canonical view sync: reutiliza frontend aprobado y no crea renderer alterno.');
