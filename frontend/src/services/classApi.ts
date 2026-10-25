/**
 * LISQUIZ Classes & Long-Term Analytics API
 * Zero-PII Persistent Class Management (152-FZ)
 */

import { authService } from './authService';

export interface ClassItem {
  id: string;
  name: string;
  subject: string;
  grade: number;
  invite_code: string;
  invite_url: string;
  students_count: number;
  rooms_count: number;
  created_at?: string;
}

export interface StudentRanking {
  rank: number;
  pseudonym_id: string;
  display_name: string;
  avatar: string;
  total_score: number;
  games_played: number;
  max_streak: number;
  joined_at?: string;
}

export interface ClassLeaderboardResponse {
  class_id: string;
  class_name: string;
  subject: string;
  grade: number;
  total_students: number;
  leaderboard: StudentRanking[];
}

export interface TopicHeatmapItem {
  topic: string;
  total_answers: number;
  correct_answers: number;
  accuracy_percent: number;
  status: 'critical_gap' | 'moderate_gap' | 'mastered';
  status_text: string;
}

export interface SpacedRepetitionBooster {
  topic: string;
  suggested_action: string;
  rationale: string;
  is_boss_candidate: boolean;
}

export interface ClassAnalyticsResponse {
  class_id: string;
  class_name: string;
  subject: string;
  total_quizzes_played: number;
  total_answers_analyzed: number;
  overall_accuracy_percent: number;
  topics_heatmap: TopicHeatmapItem[];
  systemic_gaps: Array<{
    topic: string;
    accuracy_percent: number;
    incorrect_count: number;
    total_attempts: number;
  }>;
  spaced_repetition_boosters: SpacedRepetitionBooster[];
}

export const classApi = {
  /**
   * Создание нового класса учителем.
   */
  async createClass(name: string, subject: string = 'Математика', grade: number = 7): Promise<ClassItem> {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify({ name, subject, grade }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Не удалось создать класс');
    }

    const data = await res.json();
    return data.class;
  },

  /**
   * Получение списка классов учителя.
   */
  async listClasses(): Promise<ClassItem[]> {
    const res = await fetch('/api/classes', {
      headers: {
        ...authService.getAuthHeaders(),
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.classes || [];
  },

  /**
   * Получение детальной информации о классе.
   */
  async getClass(classId: string): Promise<ClassItem> {
    const res = await fetch(`/api/classes/${classId}`, {
      headers: {
        ...authService.getAuthHeaders(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Класс не найден');
    }

    return res.json();
  },

  /**
   * Вступление ученика в класс по коду приглашения.
   */
  async joinClass(inviteCode: string, pseudonymId?: string): Promise<{ class_id: string; name: string; students_count: number }> {
    const res = await fetch('/api/classes/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify({
        invite_code: inviteCode,
        pseudonym_id: pseudonymId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Не удалось вступить в класс');
    }

    return res.json();
  },

  /**
   * Накопительный глобальный лидерборд класса за четверть/год.
   */
  async getClassLeaderboard(classId: string): Promise<ClassLeaderboardResponse> {
    const res = await fetch(`/api/classes/${classId}/leaderboard`, {
      headers: {
        ...authService.getAuthHeaders(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Не удалось загрузить рейтинг класса');
    }

    return res.json();
  },

  /**
   * Накопительная матрица дефицитов (Class Gap Heatmap) и Spaced Repetition boosters.
   */
  async getClassAnalytics(classId: string): Promise<ClassAnalyticsResponse> {
    const res = await fetch(`/api/classes/${classId}/analytics`, {
      headers: {
        ...authService.getAuthHeaders(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Не удалось загрузить аналитику класса');
    }

    return res.json();
  },
};
