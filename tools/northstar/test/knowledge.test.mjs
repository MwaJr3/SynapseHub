import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateKnowledgeRecord, validateKnowledgeRecords } from '../scripts/validate-knowledge.mjs';

const validRecord = () => ({
  id: 'NK-BOOK-CH03-001',
  schemaVersion: '1.0',
  title: 'Visible system status',
  classification: 'design-principle',
  statement: 'The interface should make meaningful system activity visible.',
  disposition: 'enrichment',
  evidenceStatus: 'source-stated',
  reviewStatus: 'proposed',
  source: {
    sourceType: 'book',
    title: 'Example Interface Design Handbook',
    creators: ['A. Author'],
    location: { chapter: 'Chapter 3', pageStart: 42, pageEnd: 43 },
    excerpt: 'A short source excerpt.',
  },
  createdAt: '2026-11-25T12:00:00.000Z',
  relatedPatternIds: ['P18', 'P28'],
});

describe('provenance-aware knowledge records', () => {
  it('accepts a record with a precise source locator and explicit evidence status', () => {
    assert.deepEqual(validateKnowledgeRecord(validRecord()), []);
  });

  it('rejects missing source locators', () => {
    const record = validRecord();
    record.source.location = {};
    assert.match(validateKnowledgeRecord(record).join(' '), /precise locator/);
  });

  it('rejects unsupported pattern IDs and overlong excerpts', () => {
    const record = validRecord();
    record.relatedPatternIds = ['P77'];
    record.source.excerpt = 'x'.repeat(501);
    const errors = validateKnowledgeRecord(record).join(' ');
    assert.match(errors, /relatedPatternIds/);
    assert.match(errors, /source.excerpt/);
  });

  it('requires reviewer identity and timestamp before approval', () => {
    const record = validRecord();
    record.reviewStatus = 'approved';
    const errors = validateKnowledgeRecord(record).join(' ');
    assert.match(errors, /approved records require reviewer/);
    assert.match(errors, /approved records require a valid reviewedAt/);
  });

  it('detects duplicate IDs and warns about unresolved related records', () => {
    const first = validRecord();
    first.relatedKnowledgeIds = ['NK-BOOK-CH04-002'];
    const second = validRecord();
    const result = validateKnowledgeRecords([first, second]);
    assert.match(result.errors.join(' '), /duplicate knowledge ID/);
    assert.match(result.warnings.join(' '), /not in this validation set/);
  });
});
