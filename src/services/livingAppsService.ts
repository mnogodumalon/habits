// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS } from '@/types/app';
import type { Habits, HabitLogs } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://my.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: string | null | undefined): string | null {
  if (!url) return null;
  // Extrahiere die letzten 24 Hex-Zeichen mit Regex
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://my.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

async function callApi(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Nutze Session Cookies für Auth
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

export class LivingAppsService {
  // --- HABITS ---
  static async getHabits(): Promise<Habits[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.HABITS}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getHabit(id: string): Promise<Habits | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.HABITS}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createHabit(fields: Habits['fields']) {
    return callApi('POST', `/apps/${APP_IDS.HABITS}/records`, { fields });
  }
  static async updateHabit(id: string, fields: Partial<Habits['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.HABITS}/records/${id}`, { fields });
  }
  static async deleteHabit(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.HABITS}/records/${id}`);
  }

  // --- HABIT_LOGS ---
  static async getHabitLogs(): Promise<HabitLogs[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.HABIT_LOGS}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getHabitLog(id: string): Promise<HabitLogs | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.HABIT_LOGS}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createHabitLog(fields: HabitLogs['fields']) {
    return callApi('POST', `/apps/${APP_IDS.HABIT_LOGS}/records`, { fields });
  }
  static async updateHabitLog(id: string, fields: Partial<HabitLogs['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.HABIT_LOGS}/records/${id}`, { fields });
  }
  static async deleteHabitLog(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.HABIT_LOGS}/records/${id}`);
  }

}