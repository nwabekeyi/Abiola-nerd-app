import { useEffect, useState } from 'react';
import { api, API_URL } from '../api/client';
import { Overview, Registration, WorkerLink } from '../types';

type Tab = 'overview' | 'links' | 'registrations' | 'settings';

export function AdminDashboard() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Overview>();
  const [links, setLinks] = useState<WorkerLink[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [fee, setFee] = useState(0);

  async function loadDashboard() {
    const [overviewData, linkData, registrationData, feeData] = await Promise.all([
      api<Overview>('/admin/overview'),
      api<WorkerLink[]>('/admin/links'),
      api<Registration[]>('/admin/registrations'),
      api<{ amount: number }>('/admin/settings/fee')
    ]);

    setOverview(overviewData);
    setLinks(linkData);
    setRegistrations(registrationData);
    setFee(feeData.amount);
  }

  useEffect(() => {
    if (token) void loadDashboard();
  }, [token]);

  if (!token) return <AdminLogin onLogin={setToken} />;

  return (
    <main>
      <h1>NERD Admin Dashboard</h1>
      <nav>
        {(['overview', 'links', 'registrations', 'settings'] as Tab[]).map((item) => (
          <button key={item} onClick={() => setTab(item)}>{item}</button>
        ))}
      </nav>

      {tab === 'overview' && overview && <OverviewPanel overview={overview} />}
      {tab === 'links' && <WorkerLinks links={links} reload={loadDashboard} />}
      {tab === 'registrations' && (
        <RegistrationTable registrations={registrations} links={links} reload={loadDashboard} />
      )}
      {tab === 'settings' && <FeeSettings fee={fee} setFee={setFee} />}
    </main>
  );
}

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('admin@nerd.local');
  const [password, setPassword] = useState('');

  async function login() {
    const response = await api<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('token', response.token);
    onLogin(response.token);
  }

  return (
    <main className="card auth-card">
      <h1>NERD Admin</h1>
      <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
      <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
      <button onClick={login}>Login</button>
    </main>
  );
}

function OverviewPanel({ overview }: { overview: Overview }) {
  return (
    <section className="grid">
      {Object.entries(overview).map(([label, value]) => (
        <div className="metric" key={label}>
          <b>{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </section>
  );
}

function WorkerLinks({ links, reload }: { links: WorkerLink[]; reload: () => Promise<void> }) {
  const [workerFullName, setWorkerFullName] = useState('');
  const [passcode, setPasscode] = useState('');

  async function createLink() {
    const created = await api<WorkerLink & { passcode: string }>('/admin/links', {
      method: 'POST',
      body: JSON.stringify({ workerFullName, passcode })
    });
    alert(`Worker link created. Passcode: ${created.passcode}`);
    setWorkerFullName('');
    setPasscode('');
    await reload();
  }

  async function downloadPdf(linkId: string) {
    const response = await fetch(`${API_URL}/admin/links/${linkId}/pdf`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const blob = await response.blob();
    window.open(URL.createObjectURL(blob));
  }

  return (
    <section className="card">
      <h2>Worker Links</h2>
      <div className="toolbar">
        <input value={workerFullName} onChange={(e) => setWorkerFullName(e.target.value)} placeholder="Worker full name" />
        <input value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Optional passcode" />
        <button onClick={createLink}>Generate Link</button>
      </div>
      <table>
        <thead><tr><th>Worker</th><th>Link</th><th>Status</th><th>Records</th><th>Actions</th></tr></thead>
        <tbody>
          {links.map((link) => (
            <tr key={link._id}>
              <td>{link.workerFullName}</td>
              <td><a href={link.url}>{link.url}</a></td>
              <td>{link.isRevoked ? 'Revoked' : 'Active'}</td>
              <td>{link.registrationCount}</td>
              <td>
                <button onClick={() => api(`/admin/links/${link._id}/revoke`, { method: 'PATCH', body: JSON.stringify({ isRevoked: !link.isRevoked }) }).then(reload)}>
                  {link.isRevoked ? 'Restore' : 'Revoke'}
                </button>
                <button onClick={() => downloadPdf(link._id)}>PDF</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RegistrationTable({ registrations, links, reload }: { registrations: Registration[]; links: WorkerLink[]; reload: () => Promise<void> }) {
  const [linkFilter, setLinkFilter] = useState('');
  const visibleRegistrations = linkFilter ? registrations.filter((item) => item.link?._id === linkFilter) : registrations;

  return (
    <section className="card">
      <h2>Registrations</h2>
      <select onChange={(event) => setLinkFilter(event.target.value)}>
        <option value="">All worker links</option>
        {links.map((link) => <option value={link._id} key={link._id}>{link.workerFullName}</option>)}
      </select>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Matric No.</th><th>Status</th><th>Documents</th><th>Actions</th></tr></thead>
        <tbody>
          {visibleRegistrations.map((registration) => (
            <tr key={registration._id}>
              <td>{registration.personal?.firstName} {registration.personal?.surname}</td>
              <td>{registration.contact?.emailAddress}</td>
              <td>{registration.academic?.matriculationNumber}</td>
              <td>{registration.status}</td>
              <td>{registration.documents?.map((doc) => <a href={doc.url} key={doc.url}> {doc.kind} </a>)}</td>
              <td>
                <button onClick={() => api(`/admin/registrations/${registration._id}/status`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: registration.status === 'completed' ? 'uncompleted' : 'completed' })
                }).then(reload)}>
                  Toggle completed
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function FeeSettings({ fee, setFee }: { fee: number; setFee: (fee: number) => void }) {
  async function saveFee() {
    await api('/admin/settings/fee', { method: 'PUT', body: JSON.stringify({ amount: fee }) });
    alert('Registration fee saved');
  }

  return (
    <section className="card">
      <h2>Payment Settings</h2>
      <label>Registration Fee (NGN)<input type="number" value={fee} onChange={(event) => setFee(Number(event.target.value))} /></label>
      <button onClick={saveFee}>Save fee</button>
    </section>
  );
}
