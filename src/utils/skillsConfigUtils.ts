import type { SkillsConfig, EpicMapping } from '../types';

export interface EpicRow {
  epic: string;
  skills: string;
  agents: string;
}

export function configToRows(config: SkillsConfig | null): EpicRow[] {
  if (!config) return [];
  return Object.entries(config.epics).map(([epic, m]) => ({
    epic,
    skills: m.skills.join(', '),
    agents: m.agents.join(', '),
  }));
}

export function rowsToConfig(rows: EpicRow[]): SkillsConfig {
  const epics: Record<string, EpicMapping> = {};
  for (const row of rows) {
    if (!row.epic) continue;
    epics[row.epic] = {
      skills: row.skills.split(',').map(s => s.trim()).filter(Boolean),
      agents: row.agents.split(',').map(s => s.trim()).filter(Boolean),
    };
  }
  return { epics };
}
