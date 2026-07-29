#!/usr/bin/env node
'use strict';
export const VISIBLE_TECHNICAL_COPY_PREDICATE_VERSION='20260729.1';
export const TECHNICAL_COPY_PATTERN=String.raw`\b(?:Firebase|Firestore|localStorage|mock|smoke|dry-run|backend|LAB)\b`;
export function technicalCopyMatches(text){return String(text||'').match(new RegExp(TECHNICAL_COPY_PATTERN,'gi'))||[];}
export function hasTechnicalCopy(text){return technicalCopyMatches(text).length>0;}
