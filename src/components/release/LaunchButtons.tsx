import React from 'react';
import { DualLaunchButton } from '../quality/LaunchButtons.tsx';
import type { TaskOutput } from '../../hooks/useProcessOutput.ts';
import {
  LAUNCH_RELEASE_STATUS, LAUNCH_RELEASE_STATUS_ACTIVE, LAUNCH_RELEASE_STATUS_CMD,
  LAUNCH_RELEASE_CUT, LAUNCH_RELEASE_CUT_ACTIVE, LAUNCH_RELEASE_CUT_CMD,
  LAUNCH_RELEASE_RETRO, LAUNCH_RELEASE_RETRO_ACTIVE, LAUNCH_RELEASE_RETRO_CMD,
} from '../../constants/strings.ts';

export const TASK_ID_RELEASE_STATUS = -3;
export const TASK_ID_RELEASE_CUT = -4;
export const TASK_ID_RELEASE_RETRO = -5;

interface LaunchButtonProps {
  processOutput?: TaskOutput;
  onClearOutput?: (taskId: number) => void;
}

export function ReleaseStatusButton({ processOutput, onClearOutput }: LaunchButtonProps) {
  return (
    <DualLaunchButton
      label={LAUNCH_RELEASE_STATUS} activeLabel={LAUNCH_RELEASE_STATUS_ACTIVE}
      taskId={TASK_ID_RELEASE_STATUS} command={LAUNCH_RELEASE_STATUS_CMD} terminalTitle="Release Status"
      processOutput={processOutput} onClearOutput={onClearOutput}
      btnClass="release-btn" idleClass="release-btn--idle" runClass="release-btn--launched"
    />
  );
}

export function ReleaseCutButton({ processOutput, onClearOutput }: LaunchButtonProps) {
  return (
    <DualLaunchButton
      label={LAUNCH_RELEASE_CUT} activeLabel={LAUNCH_RELEASE_CUT_ACTIVE}
      taskId={TASK_ID_RELEASE_CUT} command={LAUNCH_RELEASE_CUT_CMD} terminalTitle="Release Cut"
      processOutput={processOutput} onClearOutput={onClearOutput}
      btnClass="release-btn" idleClass="release-btn--idle" runClass="release-btn--launched"
    />
  );
}

export function RetroactiveButton({ processOutput, onClearOutput }: LaunchButtonProps) {
  return (
    <DualLaunchButton
      label={LAUNCH_RELEASE_RETRO} activeLabel={LAUNCH_RELEASE_RETRO_ACTIVE}
      taskId={TASK_ID_RELEASE_RETRO} command={LAUNCH_RELEASE_RETRO_CMD} terminalTitle="Retroactive Release"
      processOutput={processOutput} onClearOutput={onClearOutput}
      btnClass="release-btn" idleClass="release-btn--idle" runClass="release-btn--launched"
    />
  );
}
