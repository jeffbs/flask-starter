import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface Stats {
  companiesByStatus: Record<string, number>;
  listingsByStatus: Record<string, number>;
  openReports: number;
  totalUsers: number;
  pendingKyb: number;
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api<Stats>('/api/admin/stats'),
  });

  if (isLoading) return <p>Lade…</p>;
  if (error || !data) return <p className="error">Statistiken konnten nicht geladen werden.</p>;

  const totalCompanies = Object.values(data.companiesByStatus).reduce((a, b) => a + b, 0);

  return (
    <>
      <h1>Dashboard</h1>
      <div className="cards">
        <Link to="/companies?status=PENDING_REVIEW" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className={`card${data.pendingKyb > 0 ? ' warn' : ''}`}>
            <div className="value">{data.pendingKyb}</div>
            <div className="label">Offene KYB-Prüfungen</div>
          </div>
        </Link>
        <Link to="/reports" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className={`card${data.openReports > 0 ? ' warn' : ''}`}>
            <div className="value">{data.openReports}</div>
            <div className="label">Offene Meldungen</div>
          </div>
        </Link>
        <div className="card">
          <div className="value">{totalCompanies}</div>
          <div className="label">Firmen gesamt</div>
        </div>
        <div className="card">
          <div className="value">{data.companiesByStatus.VERIFIED ?? 0}</div>
          <div className="label">Verifizierte Firmen</div>
        </div>
        <div className="card">
          <div className="value">{data.listingsByStatus.ACTIVE ?? 0}</div>
          <div className="label">Aktive Inserate</div>
        </div>
        <div className="card">
          <div className="value">{data.totalUsers}</div>
          <div className="label">Nutzer</div>
        </div>
      </div>
    </>
  );
}
