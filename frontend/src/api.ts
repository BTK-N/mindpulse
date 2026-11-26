import type {
  UserAuthResponse,
  DiagnosisInput,
  DiagnosisResult,
  GoalItem,
  HistoryItem,
  ModelInsightsData,
  RescoreResult
} from './types';

const BASE_URL = ''; // Handled by Vite proxy to http://127.0.0.1:8000

export async function loginUser(username: string, password: string): Promise<UserAuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Authentication failed' }));
    throw new Error(errorData.detail || 'Login failed');
  }
  return res.json();
}

export async function registerUser(username: string, password: string): Promise<UserAuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(errorData.detail || 'Registration failed');
  }
  return res.json();
}

export async function submitDiagnosis(payload: DiagnosisInput): Promise<DiagnosisResult> {
  const res = await fetch(`${BASE_URL}/predict_and_consult`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Inference failed' }));
    throw new Error(errorData.detail || 'Failed to compute diagnosis');
  }
  return res.json();
}

export async function sendChatMessage(message: string, language = 'English', username?: string): Promise<{ response: string }> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, language, username }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Chat request failed' }));
    throw new Error(errorData.detail || 'Chat request failed');
  }
  return res.json();
}

export async function fetchUserHistory(username: string): Promise<HistoryItem[]> {
  const res = await fetch(`${BASE_URL}/api/history?username=${encodeURIComponent(username)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch history');
  }
  const json = await res.json();
  return json.data || [];
}

export async function fetchUserGoals(username: string): Promise<GoalItem[]> {
  const res = await fetch(`${BASE_URL}/api/goals?username=${encodeURIComponent(username)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch goals');
  }
  const json = await res.json();
  return json.data || [];
}

export async function addUserGoal(username: string, goal_text: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, goal_text }),
  });
  if (!res.ok) {
    throw new Error('Failed to add goal');
  }
}

export async function toggleUserGoal(goalId: number, completed: boolean): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/goals/${goalId}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: completed ? 1 : 0 }),
  });
  if (!res.ok) {
    throw new Error('Failed to toggle goal');
  }
}

export async function deleteUserGoal(goalId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/goals/${goalId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete goal');
  }
}

export async function fetchModelInsights(): Promise<ModelInsightsData> {
  const res = await fetch(`${BASE_URL}/api/model_insights`);
  if (!res.ok) {
    throw new Error('Failed to fetch model insights');
  }
  return res.json();
}

export function getPdfDownloadUrl(username: string, risk: string, score: number, consultation: string): string {
  const params = new URLSearchParams({
    username,
    risk,
    score: score.toString(),
    consultation,
  });
  return `${BASE_URL}/api/report/pdf?${params.toString()}`;
}

export interface ScreentimeTokenResponse {
  token: string;
  created_at: string;
  note: string;
}

export interface ScreentimeSummaryResponse {
  user_id: number;
  days: number;
  total_seconds: number;
  by_day: Record<string, number>;
  by_domain: Array<{ domain: string; seconds: number; days_active: number }>;
  last_ingest_at: string | null;
  token_active?: boolean;
  token_created_at?: string | null;
}

export async function createPairingToken(username: string): Promise<ScreentimeTokenResponse> {
  const res = await fetch(`${BASE_URL}/api/screentime/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${username}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create pairing token' }));
    throw new Error(err.detail || 'Failed to create pairing token');
  }
  return res.json();
}

export async function fetchUserScreentime(username: string, days = 7): Promise<ScreentimeSummaryResponse> {
  const res = await fetch(`${BASE_URL}/api/screentime/me?days=${days}`, {
    headers: {
      'Authorization': `Bearer ${username}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch screen time' }));
    throw new Error(err.detail || 'Failed to fetch screen time');
  }
  return res.json();
}

export async function revokePairingToken(username: string): Promise<{ revoked: boolean }> {
  const res = await fetch(`${BASE_URL}/api/screentime/token`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${username}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to revoke token' }));
    throw new Error(err.detail || 'Failed to revoke token');
  }
  return res.json();
}

export async function rescoreAssessment(
  history_id: number,
  measured_hours: number,
  username: string
): Promise<RescoreResult> {
  const res = await fetch(`${BASE_URL}/api/screentime/rescore`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${username}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ history_id, measured_hours }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to re-score assessment' }));
    throw new Error(err.detail || 'Failed to re-score assessment');
  }
  return res.json();
}
