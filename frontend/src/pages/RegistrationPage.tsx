import { FormEvent, useEffect, useState } from 'react';
import { api, API_URL } from '../api/client';
import { FieldGroup } from '../components/FieldGroup';
import { documentFields } from '../constants/formFields';

const personalFields = [
  ['title', 'TITLE'],
  ['firstName', 'FIRST NAME'],
  ['middleName', 'MIDDLE NAME'],
  ['surname', 'SURNAME'],
  ['sex', 'SEX'],
  ['dateOfBirth', 'DATE OF BIRTH'],
  ['maritalStatus', 'MARITAL STATUS'],
  ['ninNumber', 'NIN NUMBER']
] as const;

const contactFields = [
  ['nationality', 'NATIONALITY'],
  ['stateOfOrigin', 'STATE OF ORIGIN'],
  ['lga', 'LGA'],
  ['residentialAddress', 'RESIDENTIAL ADDRESS'],
  ['townCity', 'TOWN/CITY'],
  ['emailAddress', 'EMAIL ADDRESS'],
  ['phoneNumber', 'PHONE NUMBER']
] as const;

const academicFields = [
  ['institutionName', 'INSTITUTION NAME'],
  ['faculty', 'FACULTY'],
  ['department', 'DEPARTMENT'],
  ['programmeType', 'PROGRAMME TYPE'],
  ['matriculationNumber', 'MATRICULATION NUMBER'],
  ['courseOfStudy', 'COURSE OF STUDY'],
  ['projectTopic', 'PROJECT TOPIC']
] as const;

const personFields = [
  ['title', 'TITLE'],
  ['firstName', 'FIRST NAME'],
  ['middleName', 'MIDDLE NAME'],
  ['surname', 'SURNAME'],
  ['phoneNumber', 'PHONE NUMBER'],
  ['email', 'EMAIL']
] as const;
import type { Registration } from '../types';

type PublicLink = {
  id: string;
  workerFullName: string;
  isRevoked: boolean;
  slug: string;
};

type PaymentResponse = {
  reference: string;
  authorization_url: string;
  amount: number;
};

export function RegistrationPage() {
  const slug = location.pathname.split('/')[2];
  const [link, setLink] = useState<PublicLink>();
  const [paymentFee, setPaymentFee] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'verified'>('idle');
  const [pollingReference, setPollingReference] = useState<string | null>(null);
  const [showWorkerPanel, setShowWorkerPanel] = useState(false);
  const [workerRegistrations, setWorkerRegistrations] = useState<Registration[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initializingPayment, setInitializingPayment] = useState(false);
  const [loadingWorkerRegistrations, setLoadingWorkerRegistrations] = useState(false);
  const [isFormComplete, setIsFormComplete] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('reference');
    if (ref) setPollingReference(ref);

    void api<PublicLink>(`/links/${slug}`).then(setLink);
    void api<{ value?: { amount: number; currency: string }; amount?: number; currency?: string }>(`/settings/fee`).then((res) => setPaymentFee(Number((res as { value?: { amount: number } }).value?.amount || (res as { amount?: number }).amount || 0)));
  }, [slug]);

  useEffect(() => {
    if (!pollingReference) return;
    setPaymentReference(pollingReference);
    setPaymentStatus('pending');

    let attempts = 0;
    const maxAttempts = 20;
    const baseDelay = 2000;
    const maxDelay = 30000;
    let timeoutId: number;

    async function pollPayment() {
      try {
        const result = await api<{ status: string }>(`/payments/verify?reference=${pollingReference}`);
        if (result.status === 'success') {
          setPaymentStatus('verified');
          return;
        }
      } catch {}

      attempts += 1;
      if (attempts >= maxAttempts) {
        setPaymentStatus('idle');
        setPollingReference(null);
        return;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempts - 1), maxDelay);
      timeoutId = window.setTimeout(pollPayment, delay);
    }

    timeoutId = window.setTimeout(pollPayment, baseDelay);

    return () => window.clearTimeout(timeoutId);
  }, [pollingReference, slug]);

  const emailFieldId = 'emailAddress';

  useEffect(() => {
    computeProgress();
    const form = document.querySelector('.registration-form') as HTMLFormElement | null;
    if (form) {
      const handler = () => {
        setIsFormComplete(form.checkValidity());
        computeProgress();
      };
      form.addEventListener('input', handler);
      form.addEventListener('change', handler);
      return () => {
        form.removeEventListener('input', handler);
        form.removeEventListener('change', handler);
      };
    }
  }, [slug, link, submitted]);

  async function initializePayment() {
    if (initializingPayment) return;
    if (!isFormComplete) {
      alert('Please fill all required fields and upload all required documents before proceeding with payment.');
      return;
    }
    setInitializingPayment(true);
    try {
      const email = ((document.getElementById(emailFieldId) as HTMLInputElement | null)?.value ?? '').trim();
      const payment = await api<PaymentResponse>(`/links/${slug}/payments`, {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      if (!payment.authorization_url) throw new Error('Payment authorization URL was not returned');

      setPollingReference(payment.reference);
      setPaymentReference(payment.reference);
      setPaymentStatus('pending');

      const popup = window.open(
        payment.authorization_url,
        'PaystackCheckout',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Please allow popups for this site to complete payment');
      }
    } catch (error) {
      alert(formatApiError(error));
    } finally {
      setInitializingPayment(false);
    }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  }

  async function loadWorkerRegistrations() {
    if (loadingWorkerRegistrations) return;
    setLoadingWorkerRegistrations(true);
    try {
      const passcodeField = document.querySelector('input[name="worker-passcode"]') as HTMLInputElement | null;
      const records = await api<Registration[]>(`/links/${slug}/worker-registrations`, {
        method: 'POST',
        body: JSON.stringify({ passcode: passcodeField?.value ?? '' })
      });

      setWorkerRegistrations(records);
    } catch (error) {
      alert(formatApiError(error));
    } finally {
      setLoadingWorkerRegistrations(false);
    }
  }

  const requiredDocuments = documentFields;
  const [progressPercent, setProgressPercent] = useState(0);

  function computeProgress() {
    const form = document.querySelector('.registration-form') as HTMLFormElement | null;
    const formValid = form ? form.checkValidity() : false;

    let uploadedCount = 0;
    if (requiredDocuments.length) {
      uploadedCount = requiredDocuments.filter(([name]) => {
        const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;
        return Boolean(input?.files?.length);
      }).length;
    }
    setProgressPercent(formValid ? 100 : requiredDocuments.length ? Math.round((uploadedCount / requiredDocuments.length) * 100) : 0);
  }

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
            <button type="button" onClick={loadWorkerRegistrations} className="primary" disabled={loadingWorkerRegistrations}>{loadingWorkerRegistrations ? 'Loading…' : 'View Registrations'}</button>
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
          <FieldGroup title="Personal Information" fields={[
            ['title', 'TITLE'],
            ['firstName', 'FIRST NAME'],
            ['middleName', 'MIDDLE NAME'],
            ['surname', 'SURNAME'],
            ['sex', 'SEX'],
            ['dateOfBirth', 'DATE OF BIRTH'],
            ['maritalStatus', 'MARITAL STATUS'],
            ['ninNumber', 'NIN NUMBER']
          ]} />
        </div>
        <div className="form-section">
          <h3>Contact Information</h3>
          <FieldGroup fields={[
            ['nationality', 'NATIONALITY'],
            ['stateOfOrigin', 'STATE OF ORIGIN'],
            ['lga', 'LGA'],
            ['residentialAddress', 'RESIDENTIAL ADDRESS'],
            ['townCity', 'TOWN/CITY'],
            ['emailAddress', 'EMAIL ADDRESS'],
            ['phoneNumber', 'PHONE NUMBER']
          ]} />
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
          <h3>Academic Data</h3>
          <FieldGroup fields={[
            ['institutionName', 'INSTITUTION NAME'],
            ['faculty', 'FACULTY'],
            ['department', 'DEPARTMENT'],
            ['programmeType', 'PROGRAMME TYPE'],
            ['matriculationNumber', 'MATRICULATION NUMBER'],
            ['courseOfStudy', 'COURSE OF STUDY'],
            ['projectTopic', 'PROJECT TOPIC']
          ]} />
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <label>
              Programme Category
              <input name="programmeCategory" value="UNDERGRADUATE" readOnly />
            </label>
          </div>
        </div>
        <div className="form-section">
          <h3>Supervisor</h3>
          <FieldGroup fields={[
            ['title', 'TITLE'],
            ['firstName', 'FIRST NAME'],
            ['middleName', 'MIDDLE NAME'],
            ['surname', 'SURNAME'],
            ['phoneNumber', 'PHONE NUMBER'],
            ['email', 'EMAIL']
          ]} prefix="supervisor" />
        </div>
        <div className="form-section">
          <h3>Head of Department</h3>
          <FieldGroup fields={[
            ['title', 'TITLE'],
            ['firstName', 'FIRST NAME'],
            ['middleName', 'MIDDLE NAME'],
            ['surname', 'SURNAME'],
            ['phoneNumber', 'PHONE NUMBER'],
            ['email', 'EMAIL']
          ]} prefix="hod" />
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
          <h3 style={{ marginBottom: '0.75rem' }}>Payment</h3>
          <p style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.5rem' }}>
            Amount to pay:&nbsp;
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {paymentFee ? `${paymentFee.toLocaleString()} NGN` : 'Loading…'}
            </span>
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            Complete all registration sections above, then proceed with payment.
          </p>
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
            <button type="button" onClick={initializePayment} className="primary" disabled={!isFormComplete || initializingPayment}>
              {initializingPayment ? 'Initializing payment…' : 'Initialize Payment'}
            </button>
          )}
          {!pollingReference && !isFormComplete && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
              Fill all required fields and upload all documents to enable payment.
            </p>
          )}
        </div>
        <div className="submit-bar">
          <button type="submit" className="primary" disabled={paymentStatus !== 'verified' || link.isRevoked || submitting}>
            {submitting ? <span style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} /> : null}
            {submitting ? 'Submitting…' : paymentStatus !== 'verified' ? 'Complete Payment First' : link.isRevoked ? 'Link Revoked' : 'Submit Registration'}
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
