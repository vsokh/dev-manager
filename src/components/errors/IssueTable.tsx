import React, { useState, useMemo } from 'react';
import type { ErrorIssue } from '../../types';
import { severityDot, relativeTime } from './shared';
import { TrendBadge } from './TrendBadge';

interface IssueTableProps {
  issues: ErrorIssue[];
}

type SortKey = 'count' | 'severity' | 'lastSeen' | 'trend';

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
const TREND_ORDER = { rising: 0, stable: 1, declining: 2 };

export function IssueTable({ issues }: IssueTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('count');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedFp, setExpandedFp] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const arr = [...issues];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'count': cmp = a.count - b.count; break;
        case 'severity': cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]; break;
        case 'lastSeen': cmp = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime(); break;
        case 'trend': cmp = TREND_ORDER[a.trend] - TREND_ORDER[b.trend]; break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [issues, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const arrow = (key: SortKey) => sortKey === key ? (sortAsc ? ' \u2191' : ' \u2193') : '';

  if (issues.length === 0) {
    return <div style={{ color: 'var(--dm-text-muted)', fontSize: 13, padding: 16 }}>No issues found</div>;
  }

  const thStyle: React.CSSProperties = {
    padding: '8px 12px', fontWeight: 600, color: 'var(--dm-text-muted)',
    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px',
  };
  const thClickable: React.CSSProperties = { ...thStyle, cursor: 'pointer', textAlign: 'center', userSelect: 'none' };
  const tdStyle: React.CSSProperties = { padding: '8px 12px', verticalAlign: 'middle' };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--dm-border)' }}>
            <th style={thStyle}></th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Message</th>
            <th style={thClickable} onClick={() => handleSort('count')}>Count{arrow('count')}</th>
            <th style={thClickable} onClick={() => handleSort('trend')}>Trend{arrow('trend')}</th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Location</th>
            <th style={thClickable} onClick={() => handleSort('lastSeen')}>Last seen{arrow('lastSeen')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(issue => (
            <React.Fragment key={issue.fingerprint}>
              <tr
                onClick={() => setExpandedFp(expandedFp === issue.fingerprint ? null : issue.fingerprint)}
                style={{ borderBottom: '1px solid var(--dm-border)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--dm-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ ...tdStyle, width: 24 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: severityDot(issue.severity),
                    display: 'inline-block',
                  }} />
                </td>
                <td style={{ ...tdStyle, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  {issue.message}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{issue.count}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}><TrendBadge trend={issue.trend} /></td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--dm-accent)', fontSize: 11 }}>
                  {issue.topFrame ? `${issue.topFrame.file}:${issue.topFrame.line}` : '-'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--dm-text-muted)', whiteSpace: 'nowrap' }}>
                  {relativeTime(issue.lastSeen)}
                </td>
              </tr>
              {expandedFp === issue.fingerprint && (
                <tr>
                  <td colSpan={6} style={{ padding: '12px 16px', background: 'var(--dm-bg)', borderBottom: '1px solid var(--dm-border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 12 }}>
                      {issue.breadcrumbSummary && (
                        <div>
                          <span style={{ color: 'var(--dm-text-muted)' }}>Breadcrumbs: </span>
                          <span style={{ fontFamily: 'monospace' }}>{issue.breadcrumbSummary}</span>
                        </div>
                      )}
                      {issue.affectedRoutes.length > 0 && (
                        <div>
                          <span style={{ color: 'var(--dm-text-muted)' }}>Routes: </span>
                          <span style={{ fontFamily: 'monospace' }}>{issue.affectedRoutes.join(', ')}</span>
                        </div>
                      )}
                      {issue.affectedBrowsers.length > 0 && (
                        <div>
                          <span style={{ color: 'var(--dm-text-muted)' }}>Browsers: </span>
                          <span>{issue.affectedBrowsers.join(', ')}</span>
                        </div>
                      )}
                      {issue.diagnosis && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ color: 'var(--dm-text-muted)' }}>Diagnosis: </span>
                          <span>{issue.diagnosis}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
