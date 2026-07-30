import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api, COMPANY_STATUS_LABELS, formatDate } from '../api';

interface CompanyDetailData {
  company: {
    id: string;
    name: string;
    legalForm: string | null;
    vatId: string | null;
    registrationNumber: string | null;
    registrationCourt: string | null;
    street: string | null;
    zip: string | null;
    city: string | null;
    country: string;
    phone: string | null;
    website: string | null;
    status: string;
    rejectionReason: string | null;
    verifiedAt: string | null;
    createdAt: string;
    users: Array<{ id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean }>;
    kybDocuments: Array<{ id: string; type: string; fileUrl: string; fileName: string; createdAt: string }>;
    _count: { listings: number };
  };
}

const DOC_LABELS: Record<string, string> = {
  TRADE_REGISTER: 'Handelsregisterauszug',
  VAT_CERTIFICATE: 'USt-Bescheinigung',
  BUSINESS_LICENSE: 'Gewerbeanmeldung',
  ID_DOCUMENT: 'Ausweisdokument',
  OTHER: 'Sonstiges',
};

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => api<CompanyDetailData>(`/api/admin/companies/${id}`),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['company', id] });
    void queryClient.invalidateQueries({ queryKey: ['companies'] });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const verify = useMutation({
    mutationFn: (approve: boolean) =>
      api(`/api/admin/companies/${id}/verify`, {
        method: 'POST',
        body: { approve, reason: reason || undefined },
      }),
    onSuccess: invalidate,
  });

  const suspend = useMutation({
    mutationFn: (suspendIt: boolean) =>
      api(`/api/admin/companies/${id}/suspend`, {
        method: 'POST',
        body: { suspend: suspendIt, reason: reason || undefined },
      }),
    onSuccess: invalidate,
  });

  if (isLoading) return <p>Lade…</p>;
  if (!data) return <p className="error">Firma nicht gefunden.</p>;
  const c = data.company;

  return (
    <>
      <h1>
        {c.name} <span className={`badge ${c.status}`}>{COMPANY_STATUS_LABELS[c.status] ?? c.status}</span>
      </h1>

      <dl className="detail-grid">
        <dt>Rechtsform</dt>
        <dd>{c.legalForm ?? '—'}</dd>
        <dt>USt-IdNr.</dt>
        <dd>{c.vatId ?? '—'}</dd>
        <dt>Handelsregister</dt>
        <dd>{c.registrationNumber ? `${c.registrationNumber} (${c.registrationCourt ?? '—'})` : '—'}</dd>
        <dt>Anschrift</dt>
        <dd>{[c.street, [c.zip, c.city].filter(Boolean).join(' '), c.country].filter(Boolean).join(', ') || '—'}</dd>
        <dt>Kontakt</dt>
        <dd>{[c.phone, c.website].filter(Boolean).join(' · ') || '—'}</dd>
        <dt>Registriert</dt>
        <dd>{formatDate(c.createdAt)}</dd>
        <dt>Verifiziert am</dt>
        <dd>{formatDate(c.verifiedAt)}</dd>
        <dt>Inserate</dt>
        <dd>{c._count.listings}</dd>
        {c.rejectionReason && (
          <>
            <dt>Begründung</dt>
            <dd className="error">{c.rejectionReason}</dd>
          </>
        )}
      </dl>

      <h2>KYB-Dokumente</h2>
      {c.kybDocuments.length === 0 ? (
        <p className="muted">Keine Dokumente eingereicht.</p>
      ) : (
        <div className="doc-list">
          {c.kybDocuments.map((d) => (
            <div key={d.id}>
              <a href={d.fileUrl} target="_blank" rel="noreferrer">
                {DOC_LABELS[d.type] ?? d.type}: {d.fileName}
              </a>{' '}
              <span className="muted">({formatDate(d.createdAt)})</span>
            </div>
          ))}
        </div>
      )}

      <h2>Aktionen</h2>
      <textarea
        placeholder="Begründung (erforderlich bei Ablehnung/Sperrung)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="actions">
        {c.status === 'PENDING_REVIEW' && (
          <>
            <button className="primary" disabled={verify.isPending} onClick={() => verify.mutate(true)}>
              KYB freigeben
            </button>
            <button
              className="danger"
              disabled={verify.isPending || !reason}
              onClick={() => verify.mutate(false)}
            >
              KYB ablehnen
            </button>
          </>
        )}
        {c.status !== 'SUSPENDED' ? (
          <button className="danger" disabled={suspend.isPending} onClick={() => suspend.mutate(true)}>
            Firma sperren
          </button>
        ) : (
          <button className="secondary" disabled={suspend.isPending} onClick={() => suspend.mutate(false)}>
            Sperrung aufheben
          </button>
        )}
      </div>
      {(verify.error || suspend.error) && (
        <p className="error">{((verify.error ?? suspend.error) as Error).message}</p>
      )}

      <h2>Nutzer</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>E-Mail</th>
            <th>Rolle</th>
            <th>Aktiv</th>
          </tr>
        </thead>
        <tbody>
          {c.users.map((u) => (
            <tr key={u.id}>
              <td>
                {u.firstName} {u.lastName}
              </td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.isActive ? 'Ja' : 'Nein'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
