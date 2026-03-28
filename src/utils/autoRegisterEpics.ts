import { EPIC_PALETTE } from '../constants/colors.ts';
import { hashString } from './hash.ts';
import type { Epic } from '../types';

/**
 * Returns new Epic entries for any groups not yet registered in the epics array.
 * Picks a color index that avoids collisions with already-used indices.
 * Returns an empty array if all groups are already registered.
 */
export function autoRegisterEpics(allGroups: string[], epics: Epic[]): Epic[] {
  const registeredNames = new Set(epics.map(e => e.name));
  const usedIndices = new Set(epics.map(e => (e.color != null ? e.color : hashString(e.name)) % EPIC_PALETTE.length));
  const newEpics: Epic[] = [];
  allGroups.forEach(g => {
    if (!g || registeredNames.has(g)) return;
    let idx = hashString(g) % EPIC_PALETTE.length;
    let attempts = 0;
    while (usedIndices.has(idx) && attempts < EPIC_PALETTE.length) { idx = (idx + 1) % EPIC_PALETTE.length; attempts++; }
    usedIndices.add(idx);
    newEpics.push({ name: g, color: idx });
  });
  return newEpics;
}
