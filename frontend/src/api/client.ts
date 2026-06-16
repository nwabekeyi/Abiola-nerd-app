export const API_URL = 'http://localhost:4000/api';

const INVALID_ADMIN_TOKEN_MESSAGE = 'Invalid admin token';

function redirectToLogin() {
  localStorage.removeItem('token');
  window.location.href = '/';
}

function isInvalidAdminToken(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    (error as { message?: unknown }).message === INVALID_ADMIN_TOKEN_MESSAGE
  );
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const text = await response.text();
    let error;
    try {
      error = JSON.parse(text);
    } catch {
      error = { message: text || 'Request failed' };
    }

    if (isInvalidAdminToken(error)) {
      redirectToLogin();
    }

    throw error;
  }

  return response.json();
}

export async function getDailyAnalytics<T = unknown>() {
  return api<T>('/admin/analytics/daily');
}
