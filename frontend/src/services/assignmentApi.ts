/**
 * Assignments, Quests & Mistake Remediation API Client (Lisquiz 2.0)
 */

import { authService } from './authService';

export interface DailyQuestData {
  status: string;
  date: string;
  streak_days: number;
  acorns: number;
  quests: {
    warmup_solved: boolean;
    warmup_claimed: boolean;
    grove_watered: boolean;
    grove_claimed: boolean;
    quiz_played: boolean;
    quiz_claimed: boolean;
    chest_claimed: boolean;
  };
  daily_question?: {
    id: string;
    subject: string;
    text: string;
    options: string[];
    correct_index: number;
    explanation: string;
    reward_acorns: number;
    reward_xp: number;
  };
}

export interface StudentMistake {
  id: number;
  topic: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  reward_acorns: number;
  reward_xp: number;
  created_at: string;
}

export interface TeacherAssignment {
  id: string;
  title: string;
  subject: string;
  grade: number;
  deadline_days: number;
  reward_acorns: number;
  reward_xp: number;
  quiz_id?: string;
  is_completed?: boolean;
  score?: number;
  accuracy_percent?: number;
  created_at: string;
}

function getAuthHeaders(): HeadersInit {
  const token = authService.getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const assignmentApi = {
  // 1. Daily Quests
  async getDailyQuests(): Promise<DailyQuestData> {
    const res = await fetch('/api/assignments/daily', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Не удалось получить ежедневные квесты');
    return await res.json();
  },

  async claimDaily(questId: 'warmup' | 'grove' | 'quiz' | 'chest'): Promise<{
    status: string;
    acorns_awarded: number;
    xp_awarded: number;
    total_acorns: number;
  }> {
    const res = await fetch('/api/assignments/daily/claim', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ quest_id: questId }),
    });
    if (!res.ok) throw new Error('Не удалось забрать награду');
    return await res.json();
  },

  // 2. Mistakes / Spaced Repetition
  async getMistakes(): Promise<StudentMistake[]> {
    try {
      const res = await fetch('/api/assignments/mistakes', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.mistakes || [];
    } catch {
      return [];
    }
  },

  async resolveMistake(mistakeId: number): Promise<{
    status: string;
    message: string;
    reward_acorns: number;
    total_acorns: number;
  }> {
    const res = await fetch(`/api/assignments/mistakes/${mistakeId}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Не удалось подтвердить исправление ошибки');
    return await res.json();
  },

  // 3. Teacher Assignments
  async getMyAssignments(): Promise<{ class_name: string | null; assignments: TeacherAssignment[] }> {
    try {
      const res = await fetch('/api/assignments/my', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return { class_name: null, assignments: [] };
      return await res.json();
    } catch {
      return { class_name: null, assignments: [] };
    }
  },

  async createClassAssignment(classId: string, payload: {
    quiz_id?: string;
    title: string;
    subject: string;
    grade: number;
    deadline_days?: number;
    reward_acorns?: number;
    reward_xp?: number;
  }): Promise<{ status: string; assignment_id: string; title: string; class_name: string }> {
    const res = await fetch(`/api/assignments/classes/${classId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Не удалось выдать задание классу');
    return await res.json();
  },

  async getClassAssignments(classId: string): Promise<TeacherAssignment[]> {
    const res = await fetch(`/api/assignments/classes/${classId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  async submitAssignment(assignmentId: string, score: number, accuracyPercent: number): Promise<{
    status: string;
    message: string;
    reward_acorns: number;
    total_acorns: number;
  }> {
    const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ score, accuracy_percent: accuracyPercent }),
    });
    if (!res.ok) throw new Error('Не удалось сдать задание');
    return await res.json();
  },
};
