import { authService } from './authService';
import { SavedQuiz } from './quizStorage';

export interface CurriculumTopicItem {
  id: string;
  subject: string;
  grade: number;
  section: string;
  topic: string;
  description: string;
  keywords: string[];
  has_cas?: boolean;
}

export const quizApi = {
  async getCurriculumTopics(params?: { subject?: string; grade?: number; query?: string }): Promise<CurriculumTopicItem[]> {
    try {
      const queryParts: string[] = [];
      if (params?.subject) queryParts.push(`subject=${encodeURIComponent(params.subject)}`);
      if (params?.grade) queryParts.push(`grade=${params.grade}`);
      if (params?.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
      const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const res = await fetch(`/api/quiz/curriculum/topics${qs}`);
      if (res.ok) {
        const data = await res.json();
        return data.topics || [];
      }
    } catch (e) {
      console.warn('Failed to fetch curriculum topics:', e);
    }
    return [];
  },
  async generateQuiz(payload: {
    subject: string;
    grade: number;
    topic: string;
    question_count: number;
    textbook_id?: string;
    paragraph_num?: number;
    source_notes?: string;
  }): Promise<SavedQuiz> {
    const res = await fetch('/api/quiz/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка генерации викторины');
    }
    const data = await res.json();
    return {
      id: data.id || `quiz_${Date.now()}`,
      title: data.title || `${payload.subject}: ${payload.topic}`,
      subject: data.subject || payload.subject,
      grade: data.grade || payload.grade,
      topic: data.topic || payload.topic,
      group_label: `${payload.grade} класс`,
      is_active: true,
      updated_at: new Date().toISOString(),
      questions: data.questions || [],
    };
  },
  async listQuizzes(): Promise<SavedQuiz[]> {
    try {
      const res = await fetch('/api/quizzes', {
        headers: {
          ...authService.getAuthHeaders(),
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch quizzes from backend DB:', e);
    }
    return [];
  },

  async getQuiz(id: string): Promise<SavedQuiz | null> {
    try {
      const res = await fetch(`/api/quizzes/${id}`, {
        headers: {
          ...authService.getAuthHeaders(),
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to get quiz from DB:', e);
    }
    return null;
  },

  async saveQuiz(quiz: SavedQuiz): Promise<SavedQuiz> {
    const res = await fetch('/api/quizzes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify(quiz),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка сохранения викторины в БД');
    }
    return await res.json();
  },

  async updateQuiz(id: string, quiz: SavedQuiz): Promise<SavedQuiz> {
    const res = await fetch(`/api/quizzes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify(quiz),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка обновления викторины в БД');
    }
    return await res.json();
  },

  async deleteQuiz(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/quizzes/${id}`, {
        method: 'DELETE',
        headers: {
          ...authService.getAuthHeaders(),
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
