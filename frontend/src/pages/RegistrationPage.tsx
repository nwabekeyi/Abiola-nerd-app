import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { FieldGroup } from '../components/FieldGroup';
import { academicFields, contactFields, documentFields, personFields, personalFields } from '../constants/formFields';
import { Registration } from '../types';

type PublicLink = {
  id: string;
  workerFullName: string;
  isRevoked: boolean;
};

export function RegistrationPage() {
  const slug = location.pathname.split('/')[2];
  const [link, setLink] = useState<PublicLink>();
  const [paymentReference, setPaymentReference] = useState('');
  const [showWorkerPanel, setShowWorkerPanel] = useState(false);
  const [workerRegistrations, setWorkerRegistrations] = useState<Registration[]>([]);

  useEffect(() => {
    void api<PublicLink>(`/links/${slug}`).then(setLink);
  }, [slug]);

  async function initializePayment() {
    const email = (document.getElementById('emailAddress') as HTMLInputElement).value;
    const payment = await api<{ reference: string }>(`/links/${slug}/payments`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    setPaymentReference(payment.reference);
    alert('Payment initialized. Redirect to Paystack in production, then submit with the returned reference.');
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

    await api(`/links/${slug}/registrations`, { method: 'POST', body });
    alert('Registration submitted successfully');
  }

  async function loadWorkerRegistrations() {
    const passcode = (document.getElementById('worker-passcode') as HTMLInputElement).value;
    const records = await api<Registration[]>(`/links/${slug}/worker-registrations`, {
      method: 'POST',
      body: JSON.stringify({ passcode })
    });

    setWorkerRegistrations(records);
  }

  if (!link) return <main><p>Loading registration link...</p></main>;

  return (
    <main>
      <h1>NERD Registration</h1>
      <p className="muted">Kindly fill to the best of your knowledge. No Error.</p>
      <p>Worker: <strong>{link.workerFullName}</strong> {link.isRevoked && <span className="badge">Revoked</span>}</p>
      <button onClick={() => setShowWorkerPanel((current) => !current)}>Worker: see my registrations</button>

      {showWorkerPanel && (
        <section className="card">
          <h2>Worker Registrations</h2>
          <input id="worker-passcode" placeholder="Enter worker passcode" type="password" />
          <button onClick={loadWorkerRegistrations}>View registrations</button>
          {workerRegistrations.map((registration) => (
            <p key={registration._id}>{registration.personal?.firstName} {registration.personal?.surname} — {registration.status}</p>
          ))}
        </section>
      )}

      <form className="card registration-form" onSubmit={submitRegistration}>
        <FieldGroup title="Personal Information" fields={personalFields} />
        <FieldGroup title="Contact Information" fields={contactFields} />
        <FieldGroup title="Next of Kin" fields={[
          ['name', 'NAME'],
          ['phoneNumber', 'PHONE NUMBER'],
          ['emailAddress', 'EMAIL ADDRESS']
        ]} prefix="nok" />
        <FieldGroup title="Academic Data" fields={academicFields} />
        <label>PROGRAMME CATEGORY<input name="programmeCategory" value="UNDERGRADUATE" readOnly /></label>
        <FieldGroup title="Supervisor" fields={personFields} prefix="supervisor" />
        <FieldGroup title="HOD" fields={personFields} prefix="hod" />
        <h2>Documents to Share</h2>
        {documentFields.map(([name, label]) => (
          <label key={name}>{label}<input name={name} type="file" /></label>
        ))}
        <button type="button" onClick={initializePayment}>Initialize Paystack Payment</button>
        <label>Payment Reference<input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} /></label>
        <button disabled={!paymentReference || link.isRevoked}>Submit Registration</button>
      </form>
    </main>
  );
}

function buildRegistrationPayload(formData: FormData) {
  const section = (fields: readonly (readonly [string, string])[], prefix?: string) => Object.fromEntries(
    fields.map(([name]) => [name, formData.get(prefix ? `${prefix}_${name}` : name)])
  );

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
