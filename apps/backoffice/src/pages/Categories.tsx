import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { listings: number };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function Categories() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api<{ categories: CategoryRow[] }>('/api/admin/categories'),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });

  const create = useMutation({
    mutationFn: (body: { name: string; slug: string; parentId: string | null }) =>
      api('/api/admin/categories', { method: 'POST', body }),
    onSuccess: () => {
      setName('');
      invalidate();
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/api/admin/categories/${id}`, { method: 'PATCH', body: { isActive } }),
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api(`/api/admin/categories/${id}`, { method: 'PATCH', body: { name } }),
    onSuccess: invalidate,
  });

  function onRename(c: CategoryRow) {
    const name = window.prompt('Neuer Name für die Kategorie:', c.name);
    if (name && name.trim().length >= 2 && name.trim() !== c.name) {
      rename.mutate({ id: c.id, name: name.trim() });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), slug: slugify(name), parentId: parentId || null });
  }

  const categories = data?.categories ?? [];
  const roots = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  function row(c: CategoryRow, depth: number) {
    return (
      <tr key={c.id}>
        <td style={{ paddingLeft: 12 + depth * 24 }}>
          {c.name} <span className="muted">/{c.slug}</span>
        </td>
        <td>{c._count.listings}</td>
        <td>
          <span className={`badge ${c.isActive ? 'ACTIVE' : 'REMOVED'}`}>{c.isActive ? 'Aktiv' : 'Inaktiv'}</span>
        </td>
        <td>
          <div className="actions" style={{ margin: 0 }}>
            <button className="secondary" onClick={() => onRename(c)}>
              Umbenennen
            </button>
            <button
              className="secondary"
              onClick={() => toggle.mutate({ id: c.id, isActive: !c.isActive })}
            >
              {c.isActive ? 'Deaktivieren' : 'Aktivieren'}
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <h1>Kategorien</h1>
      <form className="toolbar" onSubmit={onSubmit}>
        <input placeholder="Neue Kategorie" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">(Hauptkategorie)</option>
          {roots.map((c) => (
            <option key={c.id} value={c.id}>
              unter „{c.name}"
            </option>
          ))}
        </select>
        <button className="primary" disabled={create.isPending || !name.trim()}>
          Anlegen
        </button>
        {create.error && <span className="error">{(create.error as Error).message}</span>}
      </form>
      {isLoading ? (
        <p>Lade…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Inserate</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roots.flatMap((c) => [row(c, 0), ...childrenOf(c.id).map((child) => row(child, 1))])}
          </tbody>
        </table>
      )}
    </>
  );
}
