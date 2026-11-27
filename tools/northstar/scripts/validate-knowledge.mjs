#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CLASSIFICATIONS = new Set(['design-principle','ux-law','interface-pattern','component-spec','decision-rule','visual-technique','interaction-behavior','state-management','accessibility','implementation-technique','design-system','research-finding','heuristic','anti-pattern','process-framework','case-study','trade-off']);
const SOURCE_TYPES = new Set(['book','video','research-paper','article','standard','case-study','other']);
const DISPOSITIONS = new Set(['new','enrichment','refinement','duplicate','contextual-exception','conflict','obsolete','not-suitable']);
const EVIDENCE = new Set(['source-stated','source-supported','externally-verified','analytical-synthesis','implementation-inference','unverified']);
const REVIEW = new Set(['proposed','needs-review','approved','rejected','deferred']);
const ID = /^NK-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const PATTERN_ID = /^P(?:0?[1-9]|[1-6][0-9]|7[0-6])$/;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isDateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const isDateTime = (value) => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  isDateOnly(value.slice(0, 10)) && Number.isFinite(Date.parse(value));

export function validateKnowledgeRecord(record) {
  const errors = [];
  if (!isObject(record)) return ['record must be a JSON object'];
  for (const key of ['id','title','statement','createdAt']) {
    if (!isText(record[key])) errors.push(key + ' must be a non-empty string');
  }
  if (isText(record.id) && !ID.test(record.id)) errors.push('id must use the NK-... format');
  if (record.schemaVersion !== '1.0') errors.push('schemaVersion must be "1.0"');
  if (!CLASSIFICATIONS.has(record.classification)) errors.push('classification is not supported');
  if (!DISPOSITIONS.has(record.disposition)) errors.push('disposition is not supported');
  if (!EVIDENCE.has(record.evidenceStatus)) errors.push('evidenceStatus is not supported');
  if (!REVIEW.has(record.reviewStatus)) errors.push('reviewStatus is not supported');
  if (!isDateTime(record.createdAt)) errors.push('createdAt must be a valid ISO date-time');
  if (record.updatedAt !== undefined && !isDateTime(record.updatedAt)) errors.push('updatedAt must be a valid ISO date-time');

  const source = record.source;
  if (!isObject(source)) {
    errors.push('source must be an object');
  } else {
    if (!SOURCE_TYPES.has(source.sourceType)) errors.push('source.sourceType is not supported');
    if (!isText(source.title)) errors.push('source.title must be a non-empty string');
    if (!isObject(source.location)) {
      errors.push('source.location must identify a chapter, section, page, timestamp or URL fragment');
    } else {
      const location = source.location;
      const hasLocator = isText(location.chapter) || isText(location.section) ||
        Number.isInteger(location.pageStart) || Number.isFinite(location.timeStartSeconds) ||
        isText(location.urlFragment);
      if (!hasLocator) errors.push('source.location needs at least one precise locator');
      if (location.pageStart !== undefined && (!Number.isInteger(location.pageStart) || location.pageStart < 1)) errors.push('source.location.pageStart must be a positive integer');
      if (location.pageEnd !== undefined && (!Number.isInteger(location.pageEnd) || location.pageEnd < 1)) errors.push('source.location.pageEnd must be a positive integer');
      if (location.pageStart !== undefined && location.pageEnd !== undefined && location.pageEnd < location.pageStart) errors.push('source.location.pageEnd cannot precede pageStart');
      if (location.timeStartSeconds !== undefined && (!Number.isFinite(location.timeStartSeconds) || location.timeStartSeconds < 0)) errors.push('source.location.timeStartSeconds must be non-negative');
      if (location.timeEndSeconds !== undefined && (!Number.isFinite(location.timeEndSeconds) || location.timeEndSeconds < 0)) errors.push('source.location.timeEndSeconds must be non-negative');
      if (location.timeStartSeconds !== undefined && location.timeEndSeconds !== undefined && location.timeEndSeconds < location.timeStartSeconds) errors.push('source.location.timeEndSeconds cannot precede timeStartSeconds');
    }
    if (source.sourceType === 'video' && !Number.isFinite(source.location?.timeStartSeconds)) errors.push('video sources require source.location.timeStartSeconds');
    if (source.sourceType === 'book' && !(isText(source.location?.chapter) || Number.isInteger(source.location?.pageStart))) errors.push('book sources require a chapter or page locator');
    if (source.url !== undefined) {
      try {
        const url = new URL(source.url);
        if (!['http:','https:'].includes(url.protocol)) errors.push('source.url must use http or https');
      } catch { errors.push('source.url must be an absolute URL'); }
    }
    if (source.publishedAt !== undefined && !isDateOnly(source.publishedAt)) errors.push('source.publishedAt must be a real YYYY-MM-DD date');
    if (source.accessedAt !== undefined && !isDateTime(source.accessedAt)) errors.push('source.accessedAt must be a valid ISO date-time');
    if (source.excerpt !== undefined && (typeof source.excerpt !== 'string' || source.excerpt.length > 500)) errors.push('source.excerpt must be a string of at most 500 characters');
    if (source.creators !== undefined && (!Array.isArray(source.creators) || source.creators.some((name) => !isText(name)))) errors.push('source.creators must be an array of non-empty names');
  }

  for (const key of ['conditions','limitations','tradeoffs','implementation','accessibility','responsive','failureModes','evaluation']) {
    if (record[key] !== undefined && (!Array.isArray(record[key]) || record[key].some((item) => !isText(item)))) errors.push(key + ' must be an array of non-empty strings');
  }
  if (record.relatedPatternIds !== undefined && (!Array.isArray(record.relatedPatternIds) || record.relatedPatternIds.some((id) => typeof id !== 'string' || !PATTERN_ID.test(id)))) {
    errors.push('relatedPatternIds must contain canonical IDs P1–P76 (padded or unpadded)');
  } else if (Array.isArray(record.relatedPatternIds) && new Set(record.relatedPatternIds).size !== record.relatedPatternIds.length) {
    errors.push('relatedPatternIds must not contain duplicates');
  }
  if (record.relatedKnowledgeIds !== undefined && (!Array.isArray(record.relatedKnowledgeIds) || record.relatedKnowledgeIds.some((id) => typeof id !== 'string' || !ID.test(id)))) {
    errors.push('relatedKnowledgeIds must contain valid NK-... IDs');
  } else if (Array.isArray(record.relatedKnowledgeIds) && new Set(record.relatedKnowledgeIds).size !== record.relatedKnowledgeIds.length) {
    errors.push('relatedKnowledgeIds must not contain duplicates');
  }
  if (record.reviewStatus === 'approved') {
    if (!isText(record.reviewer)) errors.push('approved records require reviewer');
    if (!isDateTime(record.reviewedAt)) errors.push('approved records require a valid ISO reviewedAt timestamp');
  } else if (record.reviewedAt !== undefined && !isDateTime(record.reviewedAt)) {
    errors.push('reviewedAt must be a valid ISO date-time');
  }
  return errors;
}

export function validateKnowledgeRecords(records) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  for (const [index, record] of records.entries()) {
    const label = isText(record?.id) ? record.id : 'record[' + index + ']';
    for (const error of validateKnowledgeRecord(record)) errors.push(label + ': ' + error);
    if (isText(record?.id)) {
      if (ids.has(record.id)) errors.push(label + ': duplicate knowledge ID');
      ids.add(record.id);
    }
  }
  for (const record of records) {
    const relatedIds = Array.isArray(record?.relatedKnowledgeIds) ? record.relatedKnowledgeIds : [];
    for (const related of relatedIds) {
      if (!records.some((candidate) => candidate?.id === related)) {
        warnings.push(record.id + ': related knowledge record ' + related + ' is not in this validation set');
      }
    }
  }
  return { errors, warnings, count: records.length };
}

function readRecords(target) {
  const stat = fs.statSync(target);
  const files = [];
  const visit = (file) => {
    const item = fs.statSync(file);
    if (item.isDirectory()) {
      for (const name of fs.readdirSync(file).sort()) visit(path.join(file, name));
    } else if (/\.(json|jsonl)$/i.test(file) && path.basename(file) !== 'schema.json') {
      files.push(file);
    }
  };
  if (stat.isDirectory()) visit(target); else files.push(target);
  const records = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.jsonl')) {
      for (const [lineIndex, line] of source.split(/\r?\n/).entries()) {
        if (line.trim()) {
          try { records.push(JSON.parse(line)); }
          catch (error) { throw new Error(file + ':' + (lineIndex + 1) + ': ' + error.message); }
        }
      }
    } else {
      const parsed = JSON.parse(source);
      records.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    }
  }
  return { files, records };
}

function main(argv) {
  const command = argv[0] || 'validate';
  const targetArg = argv[1] || 'tools/northstar/knowledge/records';
  if (command === '--help' || command === '-h' || command === 'help') {
    process.stdout.write('Usage: node validate-knowledge.mjs validate <file-or-directory>\n');
    return 0;
  }
  if (command !== 'validate') {
    process.stderr.write('Unknown command: ' + command + '\n');
    return 2;
  }
  const target = path.resolve(process.cwd(), targetArg);
  if (!fs.existsSync(target)) {
    process.stderr.write('Knowledge path does not exist: ' + target + '\n');
    return 2;
  }
  const loaded = readRecords(target);
  if (!loaded.records.length) {
    process.stdout.write('No staged knowledge records found. Schema and workflow are ready; nothing to validate yet.\n');
    return 0;
  }
  const result = validateKnowledgeRecords(loaded.records);
  process.stdout.write('Validated ' + result.count + ' records from ' + loaded.files.length + ' file(s).\n');
  for (const warning of result.warnings) process.stdout.write('WARN  ' + warning + '\n');
  for (const error of result.errors) process.stderr.write('ERROR ' + error + '\n');
  process.stdout.write(result.errors.length + ' error(s), ' + result.warnings.length + ' warning(s).\n');
  return result.errors.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
