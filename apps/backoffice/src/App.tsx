import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Listings from './pages/Listings';
import Reports from './pages/Reports';
import Categories from './pages/Categories';

export default function App() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div style={{ padding: 40 }}>Lade…</div>;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">B2BMarkt Backoffice</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/companies">Firmen &amp; KYB</NavLink>
          <NavLink to="/listings">Inserate</NavLink>
          <NavLink to="/reports">Meldungen</NavLink>
          <NavLink to="/categories">Kategorien</NavLink>
        </nav>
        <button className="logout" onClick={logout}>
          Abmelden ({user.firstName})
        </button>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
