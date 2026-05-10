const CLASS_LABELS = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative'];

export type ProgressionResult =
  | { status: 'new' }
  | { status: 'stable'; label: string }
  | { status: 'worsened'; from: string; to: string; deltaSteps: number }
  | { status: 'improved'; from: string; to: string; deltaSteps: number };

function getRawClass(rawClassId: number | undefined, severity: string): number {
  if (typeof rawClassId === 'number') return rawClassId;
  const map: Record<string, number> = { normal: 0, mild: 1, moderate: 2, severe: 3 };
  return map[severity] ?? 0;
}

export function getProgressionStatus(
  currentClassId: number | undefined,
  currentSeverity: string,
  prevClassId: number | undefined,
  prevSeverity: string,
): ProgressionResult {
  const curr = getRawClass(currentClassId, currentSeverity);
  const prev = getRawClass(prevClassId, prevSeverity);
  const fromLabel = CLASS_LABELS[prev] ?? prevSeverity;
  const toLabel = CLASS_LABELS[curr] ?? currentSeverity;
  const delta = curr - prev;
  if (delta === 0) return { status: 'stable', label: toLabel };
  if (delta > 0) return { status: 'worsened', from: fromLabel, to: toLabel, deltaSteps: delta };
  return { status: 'improved', from: fromLabel, to: toLabel, deltaSteps: -delta };
}
