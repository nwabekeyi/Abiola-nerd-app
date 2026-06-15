import { useEffect, useState } from 'react';
import { api, API_URL, getDailyAnalytics } from '../api/client';
import { jsPDF } from 'jspdf';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { Overview, Registration, WorkerLink } from '../types';

type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

type Tab = 'overview' | 'links' | 'registrations' | 'settings';

type DailyAnalytics = {
  month: string;
  enrollmentsSeries: Array<{ date: string; enrollments: number; workers: number; paymentAmount: number }>;
  paymentStatusData: Array<{ name: string; value: number }>;
  totals: { enrollments: number; workers: number; revenue: number };
};

const EMPTY_DAILY_ANALYTICS: DailyAnalytics = {
  month: '',
  enrollmentsSeries: [],
  paymentStatusData: [],
  totals: { enrollments: 0, workers: 0, revenue: 0 },
};

export function AdminLayout() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [tab, setTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [links, setLinks] = useState<Page<WorkerLink>>({ items: [], total: 0, page: 1, limit: 20, pages: 0 });
  const [registrations, setRegistrations] = useState<Page<Registration>>({ items: [], total: 0, page: 1, limit: 20, pages: 0 });
  const [fee, setFee] = useState(0);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalytics>(EMPTY_DAILY_ANALYTICS);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [overviewData, linkData, registrationData, feeData, analyticsData] = await Promise.all([
        api<Overview>('/admin/overview'),
        api<Page<WorkerLink>>('/admin/links?page=1&limit=20'),
        api<Page<Registration>>('/admin/registrations?page=1&limit=20'),
        api<{ amount: number }>('/admin/settings/fee'),
        getDailyAnalytics<DailyAnalytics>(),
      ]);
      setOverview(overviewData);
      setLinks(linkData);
      setRegistrations(registrationData);
      setFee(feeData.amount);
      setDailyAnalytics(analyticsData);
    } catch {
      if (!localStorage.getItem('token')) setToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function changeLinksPage(page: number, limit = links.limit, search = '') {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) qs.set('search', search.trim());
    const data = await api<Page<WorkerLink>>(`/admin/links?${qs.toString()}`);
    setLinks(data);
  }

  async function changeRegistrationsPage(page: number, limit = registrations.limit) {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
    const data = await api<Page<Registration>>(`/admin/registrations?${qs}`);
    setRegistrations(data);
  }

  useEffect(() => {
    if (token) loadDashboard();
    else setLoading(false);
  }, [token]);

  if (!token) return <Login onLogin={setToken} />;

  const NAV_ITEMS: { key: Tab; label: string }[] = [
    { key: 'overview',      label: 'Dashboard'     },
    { key: 'links',         label: 'Worker links'  },
    { key: 'registrations', label: 'Registrations' },
    { key: 'settings',      label: 'Settings'      },
  ];

  return (
    <>
      <button
        className="menu-toggle"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>
      {sidebarOpen && <div className="sidebar-backdrop open" onClick={() => setSidebarOpen(false)} />}
      <div style={{ display: 'flex' }}>
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-logo">AB HUB Admin</div>
          <nav>
            {NAV_ITEMS.map(({ key, label }) => (
              <button
                key={key}
                className={tab === key ? 'active' : ''}
                onClick={() => { setTab(key); setSidebarOpen(false); }}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span>v1.0</span>
            <button
              className="ghost"
              onClick={() => { localStorage.removeItem('token'); setToken(null); }}
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="dashboard">
          {loading ? (
            <Skeleton />
          ) : (
            <>
              {tab === 'overview'      && overview && <OverviewPanel overview={overview} analytics={dailyAnalytics} />}
              {tab === 'links'         && <WorkerLinksPanel links={links} reload={loadDashboard} onChangePage={changeLinksPage} />}
              {tab === 'registrations' && <RegistrationsPanel registrations={registrations} links={links.items ?? []} reload={loadDashboard} onChangePage={changeRegistrationsPage} />}
              {tab === 'settings'      && <SettingsPanel fee={fee} setFee={setFee} />}
            </>
          )}
        </main>
      </div>
    </>
  );
}
function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('admin@nerd.local');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      localStorage.setItem('token', response.token);
      onLogin(response.token);
    } catch (error) {
      const raw = error as { message?: string; errors?: string[] };
      const message = raw?.message ?? 'Login failed';
      alert(raw?.errors?.length ? `${message}: ${raw.errors.join(', ')}` : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="auth-card">
        <div className="login-header">
          <h1>AB HUB Admin</h1>
          <p>Sign in to manage registrations</p>
        </div>
        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Overview ───────────────────────────────────────────────────────────── */
function OverviewPanel({ overview, analytics }: { overview: Overview; analytics: DailyAnalytics }) {
  const chartHeight = 320;

  return (
    <>
      <div className="welcome-banner">
        <h1>Dashboard</h1>
        <p>Overview of your registration activity</p>
      </div>
      <div className="grid grid-4">
        <Metric label="Total links"    value={overview.links}         />
        <Metric label="Active links"   value={overview.activeLinks}   />
        <Metric label="Registrations"  value={overview.registrations} />
        <Metric label="Completed"      value={overview.completed}     />
      </div>

      <div className="section-header" style={{ marginTop: '1.5rem' }}>
        <h2>Analytics</h2>
        <p>{analytics.month ? `${analytics.month} activity` : 'This month activity'}</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.25rem' }}>
        <Metric label="Enrollments" value={analytics.totals.enrollments} />
        <Metric label="Workers" value={analytics.totals.workers} />
        <Metric label="Revenue" value={analytics.totals.revenue} />
        <Metric label="Payment statuses" value={analytics.paymentStatusData.length} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: '1.25rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Daily enrollments</h3>
          <div style={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer>
              <BarChart data={analytics.enrollmentsSeries}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="enrollments" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Workers registered per day</h3>
          <div style={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer>
              <BarChart data={analytics.enrollmentsSeries}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="workers" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Payment growth this month</h3>
          <div style={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer>
              <BarChart data={analytics.enrollmentsSeries}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="paymentAmount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Payment status breakdown</h3>
          <div style={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={analytics.paymentStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {analytics.paymentStatusData.map((_entry, index) => (
                    <Cell key={index} fill={['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][index % 6]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Worker links ───────────────────────────────────────────────────────── */
function WorkerLinksPanel({
  links,
  reload,
  onChangePage,
}: {
  links: Page<WorkerLink>;
  reload: () => Promise<void>;
  onChangePage: (page: number, limit?: number, search?: string) => Promise<void>;
}) {
  const [workerFullName, setWorkerFullName] = useState('');
  const [workerSearch, setWorkerSearch] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);

  const filtered = workerSearch.trim()
    ? links.items.filter((l) => l.workerFullName.toLowerCase().includes(workerSearch.trim().toLowerCase()))
    : links.items;

  const applySearch = async () => {
    await onChangePage(1, links.limit, workerSearch);
  };

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    const created = await api<WorkerLink & { passcode: string }>('/admin/links', {
      method: 'POST',
      body: JSON.stringify({ workerFullName }),
    });
    alert(`Link created — passcode: ${created.passcode}`);
    setWorkerFullName('');
    reload();
  }

  async function resetPasscode(link: WorkerLink) {
    setResettingId(link._id);
    try {
      const { passcode } = await api<{ passcode: string }>(`/admin/links/${link._id}/passcode/reset`, {
        method: 'POST',
      });
      alert(`Passcode reset — new passcode: ${passcode}`);
    } catch {
      alert('Failed to reset passcode');
    } finally {
      setResettingId(null);
    }
  }

  async function downloadPdf(linkId: string) {
    const link = links.items.find((l) => l._id === linkId);
    if (!link) return;

    let passcode = '';
    try {
      const { passcode: pc } = await api<{ passcode: string }>(`/admin/links/${linkId}/passcode`);
      passcode = pc;
    } catch {
      passcode = 'N/A';
    }

    const doc = new jsPDF();
    let y = 16;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Worker Link', 14, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const rows: [string, string][] = [
      ['Passcode', String(passcode ?? '')],
      ['Worker', String(link.workerFullName ?? '')],
      ['Status', link.isRevoked ? 'Revoked' : 'Active'],
      ['Registrations', String(link.registrationCount ?? 0)],
      ['Created', String(new Date(link.createdAt).toLocaleString() ?? '')],
    ];

    for (const [label, value] of rows) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), 70, y);
      y += 7;
    }

    doc.save(`worker-link-${link.workerFullName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  async function toggleRevoke(link: WorkerLink) {
    await api(`/admin/links/${link._id}/revoke`, {
      method: 'PATCH',
      body: JSON.stringify({ isRevoked: !link.isRevoked }),
    });
    reload();
  }

  return (
    <>
      <div className="section-header">
        <h2>Worker links</h2>
        <p>Create and manage links for workers to share with candidates</p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <form onSubmit={createLink} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '180px' }}>
            <label>Worker name</label>
            <input
              value={workerFullName}
              onChange={(e) => setWorkerFullName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button type="submit" className="primary">Create link</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1rem', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={workerSearch}
            onChange={(e) => setWorkerSearch(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') await applySearch();
            }}
            placeholder="Search workers by name"
            style={{ maxWidth: '280px' }}
          />
          <button className="secondary" type="button" onClick={applySearch}>Search</button>
          <select
            value={links.limit}
            onChange={async (e) => {
              const limit = Number(e.target.value);
              await onChangePage(1, limit, workerSearch);
            }}
            style={{ maxWidth: '120px' }}
          >
            {[20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Page {links.page} of {links.pages || 1}
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Status</th>
              <th>Records</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-state">No worker links found</td>
              </tr>
            ) : (
              filtered.map((link) => (
                <tr key={link._id}>
                  <td><strong>{link.workerFullName}</strong></td>
                  <td>
                    <span className={`badge ${link.isRevoked ? 'danger' : 'success'}`}>
                      {link.isRevoked ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{link.registrationCount}</td>
                  <td>
                     <div style={{ display: 'flex', gap: '0.5rem' }}>
                       <button className="ghost" onClick={() => toggleRevoke(link)}>
                         {link.isRevoked ? 'Restore' : 'Revoke'}
                       </button>
                       <button className="ghost" onClick={() => resetPasscode(link)} disabled={resettingId === link._id}>
                         {resettingId === link._id ? 'Resetting…' : 'Reset passcode'}
                       </button>
                       <button className="ghost" onClick={() => downloadPdf(link._id)}>PDF</button>
                     </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{ padding: '0.75rem 1rem', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="secondary"
            disabled={links.page <= 1}
            onClick={async () => {
              await onChangePage(links.page - 1);
            }}
          >Previous</button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            {links.total} total
          </span>
          <button
            className="secondary"
            disabled={links.page >= links.pages}
            onClick={async () => {
              await onChangePage(links.page + 1);
            }}
          >Next</button>
        </div>
      </div>
    </>
  );
}

/* ─── Registrations ──────────────────────────────────────────────────────── */
function RegistrationsPanel({
  registrations,
  links,
  reload,
  onChangePage,
}: {
  registrations: Page<Registration>;
  links: WorkerLink[];
  reload: () => Promise<void>;
  onChangePage: (page: number) => Promise<void>;
}) {
  const [linkFilter, setLinkFilter] = useState('');
  const [search, setSearch] = useState('');

  const visible = (() => {
    let list = registrations.items;
    if (linkFilter) list = list.filter((r) => r.link?._id === linkFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => {
        const name = `${r.personal?.firstName ?? ''} ${r.personal?.surname ?? ''}`.toLowerCase();
        return name.includes(q) || (r.contact?.emailAddress ?? '').toLowerCase().includes(q) || (r.academic?.matriculationNumber ?? '').toLowerCase().includes(q);
      });
    }
    return list;
  })();

  async function toggleStatus(registration: Registration) {
    await api(`/admin/registrations/${registration._id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: registration.status === 'completed' ? 'uncompleted' : 'completed',
      }),
    });
    reload();
  }

  return (
    <>
      <div className="section-header">
        <h2>Registrations</h2>
        <p>Browse and manage all submitted registrations</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1rem', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={linkFilter}
            onChange={(e) => setLinkFilter(e.target.value)}
            style={{ maxWidth: '240px' }}
          >
            <option value="">All workers</option>
            {links.map((link) => (
              <option key={link._id} value={link._id}>{link.workerFullName}</option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or matric no."
            style={{ maxWidth: '280px' }}
          />
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Page {registrations.page} of {registrations.pages || 1}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Matric no.</th>
                <th>Status</th>
                <th>Documents</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">No registrations found</td>
                </tr>
              ) : (
                visible.map((registration) => (
                  <tr key={registration._id}>
                    <td>
                      <strong>
                        {registration.personal?.firstName} {registration.personal?.surname}
                      </strong>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {registration.contact?.emailAddress}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {registration.academic?.matriculationNumber}
                    </td>
                    <td>
                      <span className={`badge ${registration.status === 'completed' ? 'success' : 'warning'}`}>
                        {registration.status}
                      </span>
                    </td>
                    <td>
                      {registration.documents?.map((doc) => (
                        <a
                          key={doc.url}
                          href={doc.url}
                          style={{ fontSize: '0.8125rem', marginRight: '0.5rem' }}
                        >
                          {doc.kind}
                        </a>
                      ))}
                    </td>
                    <td>
                      <button className="ghost" onClick={() => toggleStatus(registration)}>
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '0.75rem 1rem', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="secondary"
            disabled={registrations.page <= 1}
            onClick={async () => await onChangePage(registrations.page - 1)}
          >Previous</button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            {registrations.total} total
          </span>
          <button
            className="secondary"
            disabled={registrations.page >= registrations.pages}
            onClick={async () => await onChangePage(registrations.page + 1)}
          >Next</button>
        </div>
      </div>
    </>
  );
}

/* ─── Settings ───────────────────────────────────────────────────────────── */
function SettingsPanel({
  fee,
  setFee,
}: {
  fee: number;
  setFee: (fee: number) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(fee));

  useEffect(() => {
    setDraft(String(fee));
  }, [fee]);

  async function saveFee() {
    setSaving(true);
    await api('/admin/settings/fee', {
      method: 'PUT',
      body: JSON.stringify({ amount: Number(draft), currency: 'NGN' }),
    });
    setFee(Number(draft));
    setEditing(false);
    setSaving(false);
  }

  return (
    <>
      <div className="section-header">
        <h2>Payment settings</h2>
        <p>Configure the registration fee for all candidates</p>
      </div>
      <div className="card" style={{ maxWidth: '400px' }}>
        <label>Registration fee (NGN)</label>
        {!editing ? (
          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.3rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem', fontWeight: 500 }}>Current fee: {Number(fee).toLocaleString()}</span>
            <button onClick={() => setEditing(true)} className="secondary" style={{ marginLeft: 'auto' }}>Update payment setting</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.3rem' }}>
            <input
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              min={0}
              autoFocus
            />
            <button onClick={saveFee} disabled={saving} className="primary" style={{ flexShrink: 0 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="ghost" disabled={saving}>Cancel</button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Shared components ──────────────────────────────────────────────────── */
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b>{value.toLocaleString()}</b>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton" style={{ height: '96px' }} />
      ))}
    </div>
  );
}

/* ─── Analytics ───────────────────────────────────────────────────────────── */
function AnalyticsPanel() {
  const [data, setData] = useState<{
    month: string;
    enrollmentsSeries: Array<{ date: string; enrollments: number; workers: number; paymentAmount: number }>;
    paymentStatusData: Array<{ name: string; value: number }>;
    totals: { enrollments: number; workers: number; revenue: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getDailyAnalytics<typeof data>();
        setData(result);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Skeleton />;
  if (!data) return <div className="card">Failed to load analytics</div>;

  const chartHeight = 320;
  const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <>
      <div className="welcome-banner">
        <h1>Analytics</h1>
        <p>Registration, worker and payment activity for {data.month}</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.25rem' }}>
        <Metric label="Enrollments" value={data.totals.enrollments} />
        <Metric label="Workers" value={data.totals.workers} />
        <Metric label="Revenue" value={data.totals.revenue} />
        <Metric label="Month" value={0} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: '1.25rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Daily enrollments</h3>
          <div style={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer>
              <BarChart data={data.enrollmentsSeries}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="enrollments" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Workers registered per day</h3>
          <div style={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer>
              <BarChart data={data.enrollmentsSeries}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="workers" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Payment growth this month</h3>
          <div style={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer>
              <BarChart data={data.enrollmentsSeries}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="paymentAmount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Payment status breakdown</h3>
          <div style={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.paymentStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {data.paymentStatusData.map((_entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
