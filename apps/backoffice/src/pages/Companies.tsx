import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api, COMPANY_STATUS_LABELS, formatDate } from '../api';

interface CompanyRow {
  id: string;
  name: string;
  legalForm: string | null;
  vatId: string | null;
  city: string | null;
  status: string;
  createdAt: string;
  _count: { users: number; listings: number };
}

const TABS = ['', 'PENDING_REVIEW', 'VERIFIED', 'UNVERIFIED', 'REJECTED', 'SUSPENDED'] as const;

export default function Companies() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['companies', status, q],
    queryFn: () =>
      api<{ items: CompanyRow[]; total: number }>(
        `/api/admin/companies?limit=50${status ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      ),
  });

  return (
    <>
      <h1>Firmen &amp; KYB</h1>
      <div className="toolbar">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t || 'all'}
              className={status === t ? 'active' : ''}
              onClick={() => setParams(t ? { status: t } : {})}
            >
              {t ? COMPANY_STATUS_LABELS[t] : 'Alle'}
            </button>
          ))}
        </div>
        <input placeholder="Suche (Name, USt-Id, Ort)" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {isLoading ? (
        <p>Lade…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Firma</th>
              <th>USt-IdNr.</th>
              <th>Ort</th>
              <th>Status</th>
              <th>Nutzer</th>
              <th>Inserate</th>
              <th>Registriert</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/companies/${c.id}`}>
                    {c.name}
                    {c.legalForm ? ` (${c.legalForm})` : ''}
                  </Link>
                </td>
                <td>{c.vatId ?? '—'}</td>
                <td>{c.city ?? '—'}</td>
                <td>
                  <span className={`badge ${c.status}`}>{COMPANY_STATUS_LABELS[c.status] ?? c.status}</span>
                </td>
                <td>{c._count.users}</td>
                <td>{c._count.listings}</td>
                <td>{formatDate(c.createdAt)}</td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  Keine Firmen gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}
