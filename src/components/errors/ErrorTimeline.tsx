import React, { useRef, useEffect, useState } from 'react';
import type { ErrorsTimelineEntry } from '../../types';
import { TIMELINE_COLORS } from './shared';

interface ErrorTimelineProps {
  timeline: ErrorsTimelineEntry[];
}

export function ErrorTimeline({ timeline }: ErrorTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper || timeline.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    const w = rect.width;
    const h = 180;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const styles = getComputedStyle(document.documentElement);
    const borderColor = styles.getPropertyValue('--dm-border').trim() || '#333';
    const textMuted = styles.getPropertyValue('--dm-text-muted').trim() || '#888';

    const pad = { t: 16, r: 16, b: 40, l: 36 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    const maxTotal = Math.max(...timeline.map(d => d.errors + d.warnings + d.infos), 1);
    const barW = Math.min(Math.floor(plotW / timeline.length) - 4, 28);
    const gap = (plotW - barW * timeline.length) / (timeline.length + 1);

    ctx.clearRect(0, 0, w, h);

    // Y-axis grid
    const gridLines = 4;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    ctx.font = '10px monospace';
    ctx.fillStyle = textMuted;
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.t + (plotH / gridLines) * i;
      const val = Math.round(maxTotal - (maxTotal / gridLines) * i);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.fillText(String(val), pad.l - 4, y + 3);
    }

    // Bars
    timeline.forEach((entry, i) => {
      const x = pad.l + gap + i * (barW + gap);
      const total = entry.errors + entry.warnings + entry.infos;
      const barH = (total / maxTotal) * plotH;

      let y = pad.t + plotH - barH;
      const segments = [
        { value: entry.errors, color: TIMELINE_COLORS.errors },
        { value: entry.warnings, color: TIMELINE_COLORS.warnings },
        { value: entry.infos, color: TIMELINE_COLORS.infos },
      ];

      for (const seg of segments) {
        if (seg.value === 0) continue;
        const segH = (seg.value / maxTotal) * plotH;
        ctx.fillStyle = seg.color;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, segH, 2);
        ctx.fill();
        y += segH;
      }

      if (hover?.idx === i) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x - 2, pad.t, barW + 4, plotH);
      }

      const dateLabel = entry.date.slice(5);
      ctx.fillStyle = textMuted;
      ctx.textAlign = 'center';
      ctx.font = '10px monospace';
      ctx.fillText(dateLabel, x + barW / 2, h - pad.b + 16);
    });
  }, [timeline, hover]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || timeline.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pad = { l: 36, r: 16 };
    const plotW = rect.width - pad.l - pad.r;
    const barW = Math.min(Math.floor(plotW / timeline.length) - 4, 28);
    const gap = (plotW - barW * timeline.length) / (timeline.length + 1);

    for (let i = 0; i < timeline.length; i++) {
      const bx = pad.l + gap + i * (barW + gap);
      if (x >= bx && x <= bx + barW) {
        setHover({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
        return;
      }
    }
    setHover(null);
  };

  if (timeline.length === 0) return null;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        style={{ width: '100%', cursor: 'crosshair' }}
      />
      {hover && (
        <div style={{
          position: 'absolute', left: hover.x + 12, top: hover.y - 8,
          background: 'var(--dm-surface)', border: '1px solid var(--dm-border)',
          borderRadius: 'var(--dm-radius-sm)', padding: '6px 10px',
          fontSize: 11, color: 'var(--dm-text)', pointerEvents: 'none',
          boxShadow: 'var(--dm-shadow-sm)', zIndex: 10, whiteSpace: 'nowrap',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{timeline[hover.idx].date}</div>
          <div><span style={{ color: TIMELINE_COLORS.errors }}>Errors:</span> {timeline[hover.idx].errors}</div>
          <div><span style={{ color: TIMELINE_COLORS.warnings }}>Warnings:</span> {timeline[hover.idx].warnings}</div>
          <div><span style={{ color: TIMELINE_COLORS.infos }}>Info:</span> {timeline[hover.idx].infos}</div>
        </div>
      )}
    </div>
  );
}
