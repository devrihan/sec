/**
 * The seed data records plain error types. Loam shows students its own labels and
 * one fixed colour per kind of mistake, so each seeded type maps to a taxonomy name.
 */
import { studentErrorTypeLabel } from '@/lib/error-type-labels';
import { mistakeTypeColor } from '@/lib/mistake-type-legend';

const TAXONOMY: Record<string, string> = {
  Conceptual: 'Conceptual',
  Calculation: 'Procedural-Syllabus',
  'Sign error': 'Slip',
  'Unit error': 'Representational',
  'Incomplete answer': 'Comprehension',
  'Formula recall': 'Factual',
  'Misread question': 'Comprehension',
};

export function studentMistake(errorType: string) {
  const taxonomy = TAXONOMY[errorType] ?? null;
  return {
    label: taxonomy ? studentErrorTypeLabel(taxonomy) : 'Other',
    color: mistakeTypeColor(taxonomy),
  };
}
