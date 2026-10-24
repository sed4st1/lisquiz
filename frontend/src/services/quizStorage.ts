import textbookPresets from './textbook_presets.json';

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

export const DEFAULT_PRESET_QUIZZES: SavedQuiz[] = textbookPresets as SavedQuiz[];

export const quizStorage = {
  getSavedQuizzes(): SavedQuiz[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out legacy mock tests
          const cleaned = parsed.filter(
            (q) => !['quiz_preset_group_a', 'quiz_preset_group_b', 'quiz_preset_group_v'].includes(q.id)
          );
          if (cleaned.length > 0) {
            return cleaned;
          }
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_PRESET_QUIZZES;
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
    this.saveQuizzes(updated.length > 0 ? updated : DEFAULT_PRESET_QUIZZES);
    return updated;
  },

  mergePresetQuizzes(serverPresets: SavedQuiz[]): SavedQuiz[] {
    if (!serverPresets || serverPresets.length === 0) return this.getSavedQuizzes();
    const existing = this.getSavedQuizzes();
    const existingIds = new Set(existing.map((q) => q.id));
    const toAdd = serverPresets.filter((p) => !existingIds.has(p.id));
    if (toAdd.length > 0) {
      const merged = [...existing, ...toAdd];
      this.saveQuizzes(merged);
      return merged;
    }
    return existing;
  },
};
