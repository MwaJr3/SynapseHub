/**
 * Pattern relationship map — how patterns compose into systems.
 *
 * Transcribed from the blueprint's relationship table. The retrieval and
 * design commands use these groups to explain why a recommendation comes as a
 * set, not an isolated tip.
 */
import type { PatternRelationship } from './types';

export const PATTERN_RELATIONSHIPS: PatternRelationship[] = [
  {
    members: ['P1', 'P4', 'P5', 'P6'],
    interpretation:
      'Native state/capability detection over duplicated state and device assumptions.',
  },
  {
    members: ['P9', 'P13', 'P18', 'P21'],
    interpretation: 'Shared performance and motion system.',
  },
  {
    members: ['P5', 'P18', 'P23'],
    interpretation: 'Fast, truthful, recoverable feedback.',
  },
  {
    members: ['P11', 'P16', 'P23', 'P48'],
    interpretation:
      'Destructive/error UX proportional to severity and reversibility.',
  },
  {
    members: ['P15', 'P17', 'P18', 'P52'],
    interpretation:
      'Frontend responsiveness + server truth + optimistic updates + persistence.',
  },
  {
    members: ['P24', 'P23', 'P50'],
    interpretation: 'Unified form state/validation/recovery.',
  },
  {
    members: ['P28', 'P30', 'P40', 'P54'],
    interpretation: 'Feedback orchestration and loading metaphor selection.',
  },
  {
    members: ['P29', 'P20', 'P10', 'P42', 'P65'],
    interpretation: 'Responsive spatial interaction model.',
  },
  {
    members: ['P37', 'P14', 'P19', 'P33', 'P41'],
    interpretation: 'Preview state distinct from committed state.',
  },
  {
    members: ['P13', 'P25', 'P26', 'P69'],
    interpretation: 'Tokens + proportions + grid become layout intelligence.',
  },
  {
    members: ['P36', 'P3', 'P75', 'P76'],
    interpretation: 'Contextual depth; elevation is semantic, not decoration.',
  },
  {
    members: ['P43', 'P74', 'P35', 'P31'],
    interpretation:
      'Attention, isolation, serial position and peak/end effects.',
  },
];

/** Patterns that belong to the same composition group as the given pattern. */
export function relationshipsFor(patternId: string): PatternRelationship[] {
  return PATTERN_RELATIONSHIPS.filter((group) =>
    group.members.includes(patternId),
  );
}
