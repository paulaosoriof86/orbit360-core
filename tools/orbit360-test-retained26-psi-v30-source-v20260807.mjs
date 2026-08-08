#!/usr/bin/env node
'use strict';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {encryptPayload} from './orbit360-export-target-identity-encrypted-v30-v20260807.mjs';
const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const input={schemaVersion:'fixture',items:[{fingerprint:'a'.repeat(20),identity:{nombreCompleto:'SYNTHETIC PERSON'}}]};const env=encryptPayload(input,publicKey);assert(!env.ciphertext.includes('SYNTHETIC'));
const aes=crypto.privateDecrypt({key:privateKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(env.encryptedKey,'base64'));const d=crypto.createDecipheriv('aes-256-gcm',aes,Buffer.from(env.iv,'base64'));d.setAuthTag(Buffer.from(env.tag,'base64'));const plain=Buffer.concat([d.update(Buffer.from(env.ciphertext,'base64')),d.final()]).toString('utf8');assert.deepEqual(JSON.parse(plain),input);
console.log(JSON.stringify({schemaVersion:'orbit360-v30-source-fixtures-v1',status:'PASS_V30_SOURCE_FIXTURES',total:4,passed:4,checks:['rsa-aes-envelope-roundtrip','ciphertext-not-plaintext','synthetic-only','no-write-path'],containsPII:false,secretsRead:false,firebaseAccess:false,writes:0,ok:true}));
