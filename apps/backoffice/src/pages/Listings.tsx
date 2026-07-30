import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatDate, formatEuro, LISTING_STATUS_LABELS } from '../api';

interface ListingRow {
  id: string;
  title: string;
  priceCents: number | null;
  priceType: string;
  status: string;
  createdAt: string;
  moderationNote: string | null;
  company: { id: string; name: string; status: string };
  category: { name: string };
  images: Array<{ url: string }>;
  _count: { reports: number };
}

const TABS = ['', 'ACTIVE', 'PAUSED', 'SOLD', 'REMOVED'] as const;

export default function Listings() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-listings', status, q],
    queryFn: () =>
      api<{ items: ListingRow[]; total: number }>(
        `/api/admin/listings?limit=50${status ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      ),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const remove = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api(`/api/admin/listings/${id}/remove`, { method: 'POST', body: { reason } }),
    onSuccess: invalidate,
  });

  const restore = useMutation({
    mutationFn: (id: string) => api(`/api/admin/listings/${id}/restore`, { method: 'POST', body: {} }),
    onSuccess: invalidate,
  });

  function onRemove(id: string) {
    const reason = window.prompt('Grund für die Entfernung (wird der Firma mitgeteilt):');
    if (reason && reason.trim().length >= 3) remove.mutate({ id, reason: reason.trim() });
  }

  return (
    <>
      <h1>Inserate</h1>
      <div className="toolbar">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t || 'all'} className={status === t ? 'active' : ''} onClick={() => setStatus(t)}>
              {t ? LISTING_STATUS_LABELS[t] : 'Alle'}
            </button>
          ))}
        </div>
        <input placeholder="Titel durchsuchen" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {isLoading ? (
        <p>Lade…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Titel</th>
              <th>Firma</th>
              <th>Kategorie</th>
              <th>Preis</th>
              <th>Status</th>
              <th>Meldungen</th>
              <th>Erstellt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((l) => (
              <tr key={l.id}>
                <td>{l.images[0] ? <img className="thumb" src={l.images[0].url} alt="" /> : <div className="thumb" />}</td>
                <td>
                  {l.title}
                  {l.moderationNote && <div className="muted">Moderation: {l.moderationNote}</div>}
                </td>
                <td>{l.company.name}</td>
                <td>{l.category.name}</td>
                <td>{l.priceType === 'ON_REQUEST' ? 'a. Anfrage' : formatEuro(l.priceCents)}</td>
                <td>
                  <span className={`badge ${l.status}`}>{LISTING_STATUS_LABELS[l.status] ?? l.status}</span>
                </td>
                <td>{l._count.reports > 0 ? <span className="badge OPEN">{l._count.reports}</span> : '—'}</td>
                <td>{formatDate(l.createdAt)}</td>
                <td>
                  {l.status === 'REMOVED' ? (
                    <button className="secondary" onClick={() => restore.mutate(l.id)}>
                      Wiederherstellen
                    </button>
                  ) : (
                    <button className="danger" onClick={() => onRemove(l.id)}>
                      Entfernen
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={9} className="muted">
                  Keine Inserate gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}
