import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, formatDate } from '../api';

interface ReportRow {
  id: string;
  targetType: 'LISTING' | 'COMPANY' | 'MESSAGE';
  reason: string;
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  resolutionNote: string | null;
  createdAt: string;
  reporter: { email: string; firstName: string; lastName: string };
  listing: { id: string; title: string; status: string } | null;
  company: { id: string; name: string; status: string } | null;
  message: { id: string; body: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Offen',
  RESOLVED: 'Erledigt',
  DISMISSED: 'Verworfen',
};

export default function Reports() {
  const [status, setStatus] = useState('OPEN');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['reports', status],
    queryFn: () =>
      api<{ items: ReportRow[]; total: number }>(
        `/api/admin/reports?limit=50${status ? `&status=${status}` : ''}`,
      ),
  });

  const resolve = useMutation({
    mutationFn: ({ id, newStatus, note }: { id: string; newStatus: 'RESOLVED' | 'DISMISSED'; note?: string }) =>
      api(`/api/admin/reports/${id}/resolve`, { method: 'POST', body: { status: newStatus, note } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  function targetCell(r: ReportRow) {
    if (r.listing) return <span>Inserat: {r.listing.title}</span>;
    if (r.company) return <Link to={`/companies/${r.company.id}`}>Firma: {r.company.name}</Link>;
    if (r.message) return <span>Nachricht: „{r.message.body?.slice(0, 80) ?? '—'}"</span>;
    return <span className="muted">(gelöscht)</span>;
  }

  return (
    <>
      <h1>Meldungen</h1>
      <div className="toolbar">
        <div className="tabs">
          {['OPEN', 'RESOLVED', 'DISMISSED', ''].map((t) => (
            <button key={t || 'all'} className={status === t ? 'active' : ''} onClick={() => setStatus(t)}>
              {t ? STATUS_LABELS[t] : 'Alle'}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <p>Lade…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Ziel</th>
              <th>Grund</th>
              <th>Gemeldet von</th>
              <th>Datum</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((r) => (
              <tr key={r.id}>
                <td>{targetCell(r)}</td>
                <td>
                  {r.reason}
                  {r.details && <div className="muted">{r.details}</div>}
                  {r.resolutionNote && <div className="muted">Notiz: {r.resolutionNote}</div>}
                </td>
                <td>
                  {r.reporter.firstName} {r.reporter.lastName}
                  <div className="muted">{r.reporter.email}</div>
                </td>
                <td>{formatDate(r.createdAt)}</td>
                <td>
                  <span className={`badge ${r.status}`}>{STATUS_LABELS[r.status]}</span>
                </td>
                <td>
                  {r.status === 'OPEN' && (
                    <div className="actions" style={{ margin: 0 }}>
                      <button
                        className="primary"
                        onClick={() => resolve.mutate({ id: r.id, newStatus: 'RESOLVED' })}
                      >
                        Erledigt
                      </button>
                      <button
                        className="secondary"
                        onClick={() => resolve.mutate({ id: r.id, newStatus: 'DISMISSED' })}
                      >
                        Verwerfen
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Keine Meldungen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}
