import React from 'react';
import {
  PROJECT_PICKER_TITLE, PROJECT_PICKER_SUBTITLE, PROJECT_PICKER_CONNECT,
  PROJECT_PICKER_ERROR,
} from '../constants/strings.ts';
import { TemplatePicker } from './TemplatePicker.tsx';
import type { ProjectTemplate } from '../templates.ts';

interface ProjectPickerProps {
  onConnect: () => void;
  status: string;
  showTemplatePicker?: boolean;
  onSelectTemplate?: (template: ProjectTemplate | null) => void;
  onCancelTemplate?: () => void;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex-col">
      {/* Skeleton header */}
      <div className="skeleton-header">
        <div className="skeleton-bar" style={{ width: '140px', height: '16px' }} />
        <div className="flex gap-8">
          <div className="skeleton-bar skeleton-circle" style={{ width: '24px', height: '24px' }} />
          <div className="skeleton-bar skeleton-circle" style={{ width: '24px', height: '24px' }} />
        </div>
      </div>

      {/* Skeleton body */}
      <div className="flex-1 w-full" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 32px' }}>
        {/* Tab bar skeleton */}
        <div className="skeleton-panel mb-16" style={{ padding: '12px 16px' }}>
          <div className="flex gap-16">
            <div className="skeleton-bar" style={{ width: '50px', height: '14px' }} />
            <div className="skeleton-bar" style={{ width: '50px', height: '14px' }} />
          </div>
        </div>

        {/* Top grid skeleton */}
        <div className="mb-16" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px' }}>
          <div className="skeleton-panel p-16">
            <div className="skeleton-bar mb-16" style={{ width: '80px', height: '12px' }} />
            <div className="flex-col gap-8">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          </div>
          <div className="skeleton-panel p-16">
            <div className="skeleton-bar mb-16" style={{ width: '50px', height: '12px' }} />
            <div className="skeleton-bar w-full mb-8" style={{ height: '12px' }} />
            <div className="skeleton-bar mb-8" style={{ width: '80%', height: '12px' }} />
            <div className="skeleton-bar" style={{ width: '60%', height: '12px' }} />
          </div>
        </div>

        {/* Bottom grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="skeleton-panel p-16">
            <div className="skeleton-bar mb-16" style={{ width: '50px', height: '12px' }} />
            <div className="skeleton-bar w-full mb-8" style={{ height: '14px' }} />
            <div className="skeleton-bar" style={{ width: '90%', height: '14px' }} />
          </div>
          <div className="skeleton-panel p-16">
            <div className="skeleton-bar mb-16" style={{ width: '60px', height: '12px' }} />
            <div className="skeleton-bar mb-8" style={{ width: '85%', height: '12px' }} />
            <div className="skeleton-bar" style={{ width: '70%', height: '12px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectPicker({ onConnect, status, showTemplatePicker, onSelectTemplate, onCancelTemplate }: ProjectPickerProps) {
  if (status === 'connecting') {
    return <LoadingSkeleton />;
  }

  // Show template picker for new projects
  if (showTemplatePicker && onSelectTemplate && onCancelTemplate) {
    return (
      <TemplatePicker
        onSelect={onSelectTemplate}
        onBack={onCancelTemplate}
      />
    );
  }

  const showRetry = status === 'error' || status === 'disconnected';

  return (
    <div className="min-h-screen flex-col items-center justify-center gap-32">
      <div className="text-center">
        <h1 className="font-700 mb-8 text-28" style={{ color: 'var(--dm-text)' }}>{PROJECT_PICKER_TITLE}</h1>
        <p className="text-light text-14">
          {status === 'error' ? PROJECT_PICKER_ERROR : PROJECT_PICKER_SUBTITLE}
        </p>
      </div>

      {showRetry && (
        <button onClick={onConnect} className="btn-connect text-16" style={{ padding: '14px 36px' }}>
          {PROJECT_PICKER_CONNECT}
        </button>
      )}
    </div>
  );
}
