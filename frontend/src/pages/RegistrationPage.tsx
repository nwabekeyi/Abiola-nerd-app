import { FormEvent, useEffect, useState } from 'react';
import { api, API_URL } from '../api/client';
import { FieldGroup } from '../components/FieldGroup';
import {
  academicFields,
  contactFields,
  documentFields,
  personFields,
  personalFields
} from '../constants/formFields';
import type { Registration } from '../types';

type PublicLink = {
  id: string;
  workerFullName: string;
  isRevoked: boolean;
  slug: string;
};

type PaymentResponse = {
  reference: string;
  authorization_url?: string;
  access_code?: string;
};

const STORAGE_KEY = 'nerd_registration_draft';

export function RegistrationPage() {
  const slug = location.pathname.split('/')[2];
  const [link, setLink] = useState<PublicLink>();
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'verified'>('idle');
  const [pollingReference, setPollingReference] = useState<string | null>(null);
  const [showWorkerPanel, setShowWorkerPanel] = useState(false);
  const [workerRegistrations, setWorkerRegistrations] = useState<Registration[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('reference');
    if (ref) setPollingReference(ref);

    void api<PublicLink>(`/links/${slug}`).then(setLink);
  }, [slug]);

  useEffect(() => {
    if (!pollingReference) return;
    setPaymentReference(pollingReference);
    setPaymentStatus('pending');

    const timer = setInterval(async () => {
      try {
        const result = await api<{ status: string }>(`/payments/verify?reference=${pollingReference}`);
        if (result.status === 'success') {
          setPaymentStatus('verified');
          clearInterval(timer);
        }
      } catch {}
    }, 2000);

    return () => clearInterval(timer);
  }, [pollingReference, slug]);

  const emailFieldId = 'emailAddress';

  async function initializePayment() {
    try {
      const email = ((document.getElementById(emailFieldId) as HTMLInputElement | null)?.value ?? '').trim();
      const payment = await api<PaymentResponse>(`/links/${slug}/payments`, {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      setPollingReference(payment.reference);

      if (payment.authorization_url) {
        window.location.href = payment.authorization_url;
      } else {
        setPaymentReference(payment.reference);
      }
    } catch (error) {
      alert(formatApiError(error));
    }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = buildRegistrationPayload(formData);
    const body = new FormData();

    body.append('reference', paymentReference);
    body.append('payload', JSON.stringify(payload));

    for (const [fieldName] of documentFields) {
      const file = formData.get(fieldName) as File;
      if (file?.size) body.append(fieldName, file);
    }

    try {
      await api(`/links/${slug}/registrations`, { method: 'POST', body });
      localStorage.removeItem(`nerd_registration_draft_${slug}`);
      setSubmitted(true);
    } catch (error) {
      alert(formatApiError(error));
    }
  }

  async function loadWorkerRegistrations() {
    try {
      const passcodeField = document.querySelector('input[name="worker-passcode"]') as HTMLInputElement | null;
      const records = await api<Registration[]>(`/links/${slug}/worker-registrations`, {
        method: 'POST',
        body: JSON.stringify({ passcode: passcodeField?.value ?? '' })
      });

      setWorkerRegistrations(records);
    } catch (error) {
      alert(formatApiError(error));
    }
  }

  const requiredDocuments = documentFields;
  const uploadedCount = requiredDocuments.filter(([name]) => {
    const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;
    return Boolean(input?.files?.length);
  }).length;
  const progressPercent = requiredDocuments.length ? Math.round((uploadedCount / requiredDocuments.length) * 100) : 0;

  if (!link) return (
    <div className="registration">
      <div className="welcome-banner" style={{ textAlign: 'center' }}>
        <h1>AB HUB — NERD Registration</h1>
        <p>Loading your registration link...</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="registration">
      <div className="welcome-banner" style={{ textAlign: 'center' }}>
        <h1>Registration Submitted</h1>
        <p>Your registration has been successfully submitted. Please keep your reference for future inquiries.</p>
      </div>
    </div>
  );

  return (
    <div className="registration">
      <div className="welcome-banner">
        <h1>AB HUB — NERD Registration</h1>
        <p>Worker: <strong style={{ color: '#fff' }}>{link.workerFullName}</strong>
          {link.isRevoked && <span className="badge danger" style={{ marginLeft: '0.5rem' }}>Revoked</span>}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Powered by AB HUB
        </p>
      </div>

      <div className="progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span>{progressPercent}%</span>
      </div>

      <button
        type="button"
        className="ghost"
        style={{ marginBottom: '1rem' }}
        onClick={() => setShowWorkerPanel((current) => !current)}
      >
        {showWorkerPanel ? 'Hide' : 'View'} my past registrations
      </button>

      {showWorkerPanel && (
        <div className="card" style={{ marginBottom: '1.25rem', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1rem' }}>Worker Registrations</h3>
          <div className="toolbar">
            <input name="worker-passcode" placeholder="Enter worker passcode" type="password" />
            <button type="button" onClick={loadWorkerRegistrations} className="primary">View Registrations</button>
          </div>
          {workerRegistrations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No registrations yet</p>
          ) : (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Total registrations: <strong>{workerRegistrations.length}</strong>
                &nbsp;·&nbsp;
                Completed: <strong>{workerRegistrations.filter(r => r.status === 'completed').length}</strong>
              </p>
              <table>
                <thead>
                  <tr><th>Name</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {workerRegistrations.map((registration) => (
                    <tr key={registration._id}>
                      <td><strong>{registration.personal?.firstName} {registration.personal?.surname}</strong></td>
                      <td><span className={`badge ${registration.status === 'completed' ? 'success' : 'warning'}`}>{registration.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      <form className="registration-form" onSubmit={submitRegistration}>
        <div className="form-section">
          <FieldGroup title="Personal Information" fields={personalFields} />
        </div>
        <div className="form-section">
          <FieldGroup title="Contact Information" fields={contactFields} />
        </div>
        <div className="form-section">
          <h3>Next of Kin</h3>
          <FieldGroup fields={[
            ['name', 'NAME'],
            ['phoneNumber', 'PHONE NUMBER'],
            ['emailAddress', 'EMAIL ADDRESS']
          ]} prefix="nok" />
        </div>
        <div className="form-section">
          <FieldGroup title="Academic Data" fields={academicFields} />
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <label>
              Programme Category
              <input name="programmeCategory" value="UNDERGRADUATE" readOnly />
            </label>
          </div>
        </div>
        <div className="form-section">
          <h3>Supervisor</h3>
          <FieldGroup fields={personFields} prefix="supervisor" />
        </div>
        <div className="form-section">
          <h3>Head of Department</h3>
          <FieldGroup fields={personFields} prefix="hod" />
        </div>
        <div className="form-section">
          <h3>Documents</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Upload all required documents. Progress updates automatically.
          </p>
          {documentFields.map(([name, label]) => (
            <label key={name} htmlFor={name} style={{ marginBottom: '0.75rem' }}>
              {label}
              <input id={name} name={name} type="file" required />
            </label>
          ))}
        </div>
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Payment</h3>
          {paymentStatus === 'pending' && (
            <p style={{ color: 'var(--warning)', marginBottom: '0.75rem' }}>
              Waiting for payment confirmation… Please complete payment on the redirected page.
            </p>
          )}
          {paymentStatus === 'verified' && (
            <p style={{ color: 'var(--success)', marginBottom: '0.75rem' }}>
              Payment confirmed ✓
            </p>
          )}
          {!pollingReference && (
            <button type="button" onClick={initializePayment} className="primary">
              Initialize Payment
            </button>
          )}
        </div>
        <div className="submit-bar">
          <button type="submit" className="primary" disabled={paymentStatus !== 'verified' || link.isRevoked}>
            {paymentStatus !== 'verified' ? 'Complete Payment First' : link.isRevoked ? 'Link Revoked' : 'Submit Registration'}
          </button>
        </div>
      </form>
    </div>
  );
}

function buildRegistrationPayload(formData: FormData) {
  const section = (fields: readonly (readonly [string, string])[], prefix?: string) =>
    Object.fromEntries(fields.map(([name]) => [name, formData.get(prefix ? `${prefix}_${name}` : name)]));

  return {
    personal: section(personalFields),
    contact: section(contactFields),
    nextOfKin: section([
      ['name', 'NAME'],
      ['phoneNumber', 'PHONE NUMBER'],
      ['emailAddress', 'EMAIL ADDRESS']
    ], 'nok'),
    academic: {
      ...section(academicFields),
      programmeCategory: formData.get('programmeCategory') || 'UNDERGRADUATE'
    },
    supervisor: section(personFields, 'supervisor'),
    hod: section(personFields, 'hod')
  };
}

function formatApiError(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as { message?: unknown; errors?: unknown };
    const details = Array.isArray(apiError.errors) ? `: ${apiError.errors.join(', ')}` : '';
    if (typeof apiError.message === 'string') return `${apiError.message}${details}`;
  }

  return 'Request failed. Please try again.';
}
