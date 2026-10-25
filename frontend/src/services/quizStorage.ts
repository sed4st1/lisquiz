import { quizApi } from './quizApi';

export interface QuizOption {
  id: number;
  text: string;
  is_correct: boolean;
  symbol?: string;
  color?: string;
}

export interface QuizQuestion {
  id: number;
  text: string;
  options: QuizOption[];
  explanation?: string;
  time_limit_sec?: number;
  tier?: number;
  is_boss?: boolean;
  topic?: string;
}

export interface SavedQuiz {
  id: string;
  title: string;
  subject: string;
  grade: number;
  topic: string;
  group_label?: string; // e.g. "Пёрышкин 7 кл", "Виленкин 6 кл"
  questions: QuizQuestion[];
  is_active?: boolean;
  updated_at?: string;
  textbook_id?: string;
  paragraph_num?: number;
}

const STORAGE_KEY = 'lisquiz_saved_quizzes';

export const DEFAULT_PRESET_QUIZZES: SavedQuiz[] = [];

export const quizStorage = {
  getSavedQuizzes(): SavedQuiz[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Strictly exclude any unowned presets or mock templates
          const cleaned = parsed.filter(
            (q) =>
              q &&
              q.id &&
              !q.id.startsWith('quiz_tb_') &&
              !q.id.startsWith('quiz_preset_') &&
              !q.id.startsWith('peryshkin_') &&
              !q.id.startsWith('vilenkin_') &&
              !q.id.startsWith('merzlyak_') &&
              !q.id.startsWith('makarychev_') &&
              !q.id.startsWith('atanasyan_') &&
              !q.id.startsWith('ladyzhenskaya_') &&
              !q.id.startsWith('room_quiz_')
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          }
          return cleaned;
        }
      }
    } catch {
      // fallback
    }
    return [];
  },

  saveQuizzes(quizzes: SavedQuiz[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quizzes));
    } catch (e) {
      console.error('Failed to save quizzes to localStorage:', e);
    }
  },

  upsertQuiz(quiz: SavedQuiz): SavedQuiz[] {
    const list = this.getSavedQuizzes();
    const idx = list.findIndex((q) => q.id === quiz.id);
    let updated: SavedQuiz[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = { ...quiz, updated_at: new Date().toISOString() };
    } else {
      updated = [{ ...quiz, updated_at: new Date().toISOString() }, ...list];
    }
    this.saveQuizzes(updated);
    // Asynchronously sync directly to DB
    quizApi.saveQuiz(quiz).catch((err) => console.warn('Failed to sync quiz to DB:', err));
    return updated;
  },

  duplicateQuiz(quizId: string): SavedQuiz | null {
    const list = this.getSavedQuizzes();
    const original = list.find((q) => q.id === quizId);
    if (!original) return null;

    const newId = `quiz_copy_${Date.now()}`;
    const newGroupLabel = `${original.group_label || 'Вариант'} (Копия)`;

    const duplicated: SavedQuiz = {
      ...original,
      id: newId,
      title: `${original.title} (Копия)`,
      group_label: newGroupLabel,
      is_active: false,
      updated_at: new Date().toISOString(),
      questions: original.questions.map((q, idx) => ({
        ...q,
        id: idx + 1,
        options: q.options.map((opt) => ({ ...opt })),
      })),
    };

    const updated = [duplicated, ...list];
    this.saveQuizzes(updated);
    quizApi.saveQuiz(duplicated).catch((err) => console.warn('Failed to sync duplicated quiz to DB:', err));
    return duplicated;
  },

  setActiveQuiz(quizId: string): SavedQuiz[] {
    const list = this.getSavedQuizzes();
    const updated = list.map((q) => ({
      ...q,
      is_active: q.id === quizId,
    }));
    this.saveQuizzes(updated);
    return updated;
  },

  deleteQuiz(quizId: string): SavedQuiz[] {
    const list = this.getSavedQuizzes();
    const updated = list.filter((q) => q.id !== quizId);
    this.saveQuizzes(updated);
    // Asynchronously delete from DB
    quizApi.deleteQuiz(quizId).catch((err) => console.warn('Failed to delete quiz from DB:', err));
    return updated;
  },

  async syncFromDb(): Promise<SavedQuiz[]> {
    try {
      const dbQuizzes = await quizApi.listQuizzes();
      if (Array.isArray(dbQuizzes)) {
        const cleaned = dbQuizzes.filter(
          (q) =>
            q &&
            q.id &&
            !q.id.startsWith('quiz_tb_') &&
            !q.id.startsWith('quiz_preset_') &&
            !q.id.startsWith('peryshkin_') &&
            !q.id.startsWith('vilenkin_') &&
            !q.id.startsWith('merzlyak_') &&
            !q.id.startsWith('makarychev_') &&
            !q.id.startsWith('atanasyan_') &&
            !q.id.startsWith('ladyzhenskaya_') &&
            !q.id.startsWith('room_quiz_')
        );

        // Do not wipe newly created local quizzes before DB sync completes
        const currentLocal = this.getSavedQuizzes();
        const activeQuiz = currentLocal.find((q) => q.is_active);
        const dbIds = new Set(cleaned.map((q) => q.id));
        const pendingLocal = currentLocal.filter((q) => !dbIds.has(q.id));

        for (const pq of pendingLocal) {
          quizApi.saveQuiz(pq).catch(() => {});
        }

        const merged = [...pendingLocal, ...cleaned];
        if (activeQuiz) {
          for (const m of merged) {
            m.is_active = m.id === activeQuiz.id;
          }
        }

        this.saveQuizzes(merged);
        return merged;
      }
    } catch (e) {
      console.warn('Failed to sync quizzes from DB:', e);
    }
    return this.getSavedQuizzes();
  },

  mergePresetQuizzes(_serverPresets: SavedQuiz[]): SavedQuiz[] {
    return this.getSavedQuizzes();
  },
};
