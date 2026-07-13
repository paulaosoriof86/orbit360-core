#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';import{spawnSync}from'node:child_process';
const repo=path.resolve(process.argv[2]||process.cwd()),file=path.join(repo,'tools','orbit360-smoke-op2-plataformas-focused-v1218.mjs'),pass=[],fail=[];
const check=(id,ok,message)=>(ok?pass:fail).push({id,message,file:'tools/orbit360-smoke-op2-plataformas-focused-v1218.mjs'});
check('FILE',fs.existsSync(file),'Smoke focalizado presente');const src=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
check('THREE_SCENARIOS',(src.match(/\['(?:dir|op|ase)-plataformas-/g)||[]).length===3,'Solo conserva las tres vistas pendientes');
check('WAIT_OPERATIONAL_RENDER',src.includes("wait(()=>d.querySelector('[data-op2-platform]'),8000)"),'Espera el render operativo real');
check('WAIT_ENABLED_REVEAL',src.includes("[data-op2-view-credential]:not([disabled])"),'Espera el botón habilitado');
check('WAIT_REVEAL_RESULT',src.includes('p.trim()===secret},5000)'),'Espera el resultado visible de la credencial');
check('DIRECT_PROVIDER_CHECK',src.includes("R.revealCredential('cred_smoke_op2'"),'Comprueba también el contrato directo del proveedor');
check('ADVISOR_RESTRICTED_SELECTOR',src.includes("d.querySelector('.asg218-restricted')"),'Asesor se valida mediante marcador estructural');
check('NO_REAL_SECRET_LITERAL',!src.includes('ClaveDemoSegura!'),'No contiene credencial real o literal reutilizable');
check('NO_OTHER_MODULES',src.includes('No se repitieron CRM ni los otros 12 escenarios'),'Declara alcance focalizado');
const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});check('SYNTAX',syntax.status===0,syntax.status===0?'Sintaxis válida':String(syntax.stderr||syntax.stdout).trim());
const result={validator:'orbit360-validar-smoke-op2-plataformas-focused-v1218',generatedAt:new Date().toISOString(),summary:{pass:pass.length,fail:fail.length},pass,fail};console.log(JSON.stringify(result,null,2));process.exit(fail.length?1:0);
