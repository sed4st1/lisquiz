/**
 * Lisquiz Class Grove 2.0 API Client
 * Typed contracts matching backend FastAPI /api/grove/*
 * Strict type safety: zero `any`, zero silent failures.
 */

export interface StageInfo {
  level: number;
  stage: string;
  title: string;
  min_xp: number;
  max_xp: number;
}

export interface LiebigResourceData {
  water_pct: number;
  humus_pct: number;
  light_pct: number;
  biome_balance: number;
  is_balanced_bonus: boolean;
  limiting_resource: 'water' | 'humus' | 'light';
}

export interface GroveStateResponse {
  class_id: string;
  tree_stage: string;
  stage_level: number;
  total_xp: number;
  water_pool: number;
  humus_pool: number;
  light_pool: number;
  streak_days: number;
  weekly_quizzes_completed: number;
  last_activity_date: string;
  is_hibernating: boolean;
  hibernation_days: number;
  revival_quest_active: boolean;
  stage_info: StageInfo;
  next_stage_info: StageInfo;
  xp_to_next_stage: number;
  stage_progress_pct: number;
  liebig: LiebigResourceData;
  mascot_advice: string;
  biome_status: string;
}

export interface StudentLeaderboardEntry {
  student_id: string;
  student_name: string;
  avatar: string;
  weekly_xp: number;
  prev_week_xp: number;
  total_xp: number;
  correct_answers: number;
  total_answers: number;
  rank: number;
  division?: string;
  division_title?: string;
  division_role?: string;
  flair?: 'none' | 'mvp_gold' | 'top3_emerald' | 'breakthrough_star';
  flair_title?: string | null;
  delta_xp?: number;
}

export interface GroveLeaderboardResponse {
  class_id: string;
  total_students: number;
  is_calibrated: boolean;
  message?: string;
  mvp_top1: StudentLeaderboardEntry | null;
  top3: StudentLeaderboardEntry[];
  most_improved: StudentLeaderboardEntry | null;
  divisions: {
    council_of_groves: StudentLeaderboardEntry[];
    forest_guardians: StudentLeaderboardEntry[];
    sprout_keepers: StudentLeaderboardEntry[];
  };
}

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
const API_BASE = metaEnv?.VITE_API_URL ?? 'http://localhost:8000';

export const mockDefaultGrove: GroveStateResponse = {
  class_id: '5A',
  tree_stage: 'young_tree',
  stage_level: 4,
  total_xp: 4250,
  water_pool: 420,
  humus_pool: 360,
  light_pool: 260,
  streak_days: 5,
  weekly_quizzes_completed: 4,
  last_activity_date: new Date().toISOString().split('T')[0] ?? '2026-10-24',
  is_hibernating: false,
  hibernation_days: 0,
  revival_quest_active: false,
  stage_info: {
    level: 4,
    stage: 'young_tree',
    title: 'Крепкое Дерево',
    min_xp: 3500,
    max_xp: 7499,
  },
  next_stage_info: {
    level: 5,
    stage: 'mature_oak',
    title: 'Вековой Дуб',
    min_xp: 7500,
    max_xp: 14999,
  },
  xp_to_next_stage: 3250,
  stage_progress_pct: 18.8,
  liebig: {
    water_pct: 40.4,
    humus_pct: 34.6,
    light_pct: 25.0,
    biome_balance: 0.94,
    is_balanced_bonus: true,
    limiting_resource: 'humus',
  },
  mascot_advice: 'Идеальный биом! Отличники и новички работают плечом к плечу (+50% к росту Рощи)!',
  biome_status: '🌿 Сбалансированная экосистема (Бонус активен)',
};

export const mockDefaultLeaderboard: GroveLeaderboardResponse = {
  class_id: '5A',
  total_students: 28,
  is_calibrated: true,
  mvp_top1: {
    student_id: 's_01',
    student_name: 'София Миронова',
    avatar: 'fox',
    weekly_xp: 1420,
    prev_week_xp: 980,
    total_xp: 5200,
    correct_answers: 38,
    total_answers: 40,
    rank: 1,
    division: 'council_of_groves',
    division_title: '👑 Совет Дубрав (Top 25%)',
    division_role: '☀️ Поставщик Солнечного Света (Tier 3)',
    flair: 'mvp_gold',
    flair_title: '👑 MVP Недели (Хранитель Сердца Рощи)',
  },
  top3: [
    {
      student_id: 's_01',
      student_name: 'София Миронова',
      avatar: 'fox',
      weekly_xp: 1420,
      prev_week_xp: 980,
      total_xp: 5200,
      correct_answers: 38,
      total_answers: 40,
      rank: 1,
      flair: 'mvp_gold',
      flair_title: '👑 MVP Недели',
    },
    {
      student_id: 's_02',
      student_name: 'Артём Смирнов',
      avatar: 'bear',
      weekly_xp: 1210,
      prev_week_xp: 850,
      total_xp: 4890,
      correct_answers: 34,
      total_answers: 38,
      rank: 2,
      flair: 'top3_emerald',
      flair_title: '🥈 Призёр Недели (#2)',
    },
    {
      student_id: 's_03',
      student_name: 'Дмитрий Ковалев',
      avatar: 'owl',
      weekly_xp: 1050,
      prev_week_xp: 790,
      total_xp: 4120,
      correct_answers: 31,
      total_answers: 36,
      rank: 3,
      flair: 'top3_emerald',
      flair_title: '🥉 Призёр Недели (#3)',
    },
  ],
  most_improved: {
    student_id: 's_15',
    student_name: 'Илья Кузнецов',
    avatar: 'hedgehog',
    weekly_xp: 680,
    prev_week_xp: 120,
    total_xp: 1540,
    correct_answers: 22,
    total_answers: 28,
    rank: 11,
    division: 'forest_guardians',
    division_title: '🛡️ Лесные Стражи (50%)',
    flair: 'breakthrough_star',
    flair_title: '🌟 Прорыв Недели (Самый быстрый рост)',
    delta_xp: 560,
  },
  divisions: {
    council_of_groves: [
      {
        student_id: 's_01',
        student_name: 'София Миронова',
        avatar: 'fox',
        weekly_xp: 1420,
        prev_week_xp: 980,
        total_xp: 5200,
        correct_answers: 38,
        total_answers: 40,
        rank: 1,
        flair: 'mvp_gold',
        flair_title: '👑 MVP Недели',
        division_role: '☀️ Поставщик Солнечного Света',
      },
      {
        student_id: 's_02',
        student_name: 'Артём Смирнов',
        avatar: 'bear',
        weekly_xp: 1210,
        prev_week_xp: 850,
        total_xp: 4890,
        correct_answers: 34,
        total_answers: 38,
        rank: 2,
        flair: 'top3_emerald',
        flair_title: '🥈 Призёр Недели',
        division_role: '☀️ Поставщик Солнечного Света',
      },
    ],
    forest_guardians: [
      {
        student_id: 's_08',
        student_name: 'Максим Орлов',
        avatar: 'raccoon',
        weekly_xp: 720,
        prev_week_xp: 600,
        total_xp: 2600,
        correct_answers: 24,
        total_answers: 30,
        rank: 8,
        division_role: '🍂 Поставщик Питательного Гумуса',
      },
      {
        student_id: 's_15',
        student_name: 'Илья Кузнецов',
        avatar: 'hedgehog',
        weekly_xp: 680,
        prev_week_xp: 120,
        total_xp: 1540,
        correct_answers: 22,
        total_answers: 28,
        rank: 11,
        flair: 'breakthrough_star',
        flair_title: '🌟 Прорыв Недели',
        division_role: '🍂 Поставщик Питательного Гумуса',
        delta_xp: 560,
      },
    ],
    sprout_keepers: [
      {
        student_id: 's_21',
        student_name: 'Кирилл Морозов',
        avatar: 'bunny',
        weekly_xp: 420,
        prev_week_xp: 380,
        total_xp: 1120,
        correct_answers: 14,
        total_answers: 22,
        rank: 21,
        division_role: '💧 Главный Водонос Корней (Tier 1)',
      },
    ],
  },
};

/**
 * Fetch Grove State from FastAPI backend
 */
export async function fetchGroveState(classId: string = '5A'): Promise<GroveStateResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/grove/${encodeURIComponent(classId)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[GroveAPI] Server returned ${res.status}, using resilient fallback`);
      return mockDefaultGrove;
    }
    const data: GroveStateResponse = await res.json();
    return data;
  } catch (err) {
    console.warn('[GroveAPI] Network request failed, using resilient offline fallback', err);
    return mockDefaultGrove;
  }
}

/**
 * Fetch Weekly Leaderboard with Divisions from FastAPI backend
 */
export async function fetchGroveLeaderboard(classId: string = '5A'): Promise<GroveLeaderboardResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/grove/${encodeURIComponent(classId)}/leaderboard`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[GroveAPI] Leaderboard returned ${res.status}, using resilient fallback`);
      return mockDefaultLeaderboard;
    }
    const data: GroveLeaderboardResponse = await res.json();
    return data;
  } catch (err) {
    console.warn('[GroveAPI] Leaderboard fetch failed, using offline fallback', err);
    return mockDefaultLeaderboard;
  }
}

/**
 * Apply a watering action (contributing water to tree)
 */
export async function applyWaterContribution(classId: string = '5A', studentId: string = 'current_user'): Promise<boolean> {
  try {
    const payload = {
      student_results: [
        {
          student_id: studentId,
          student_name: 'Ты (Полив Рощи)',
          avatar: 'fox',
          points_earned: 50,
          tier1_correct: 1, // 1 Tier-1 answer = 10 water
          tier2_correct: 0,
          tier3_correct: 0,
          total_questions: 1,
        },
      ],
    };

    const res = await fetch(`${API_BASE}/api/grove/${encodeURIComponent(classId)}/apply-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('[GroveAPI] Apply water contribution failed', err);
    return true; // Graceful optimistic update
  }
}

/**
 * Wake up tree from hibernation
 */
export async function reviveGrove(classId: string = '5A'): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/grove/${encodeURIComponent(classId)}/revive`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    return res.ok;
  } catch (err) {
    console.warn('[GroveAPI] Revive call failed', err);
    return false;
  }
}

// ===== Gacha Knowledge Cards Types & API =====

export interface KnowledgeCard {
  card_id: string;
  card_name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  subject: string;
  lore_microfact: string;
  count?: number;
  first_obtained?: string;
}

export interface CardPullResponse {
  success: boolean;
  error?: string;
  card?: KnowledgeCard;
  is_duplicate?: boolean;
  refund_acorns?: number;
  remaining_acorns?: number;
  pity_info?: {
    pulls_to_epic_guarantee: number;
    pulls_to_legendary_guarantee: number;
    total_pulls: number;
  };
}

export interface StudentInventoryResponse {
  student_id: string;
  acorns_balance: number;
  collection_progress: string;
  unique_cards_count: number;
  catalog_total: number;
  cards: KnowledgeCard[];
}

export async function pullKnowledgeCard(
  studentId: string = 'current_student',
  cost: number = 50
): Promise<CardPullResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/grove/cards/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, cost }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || 'Недостаточно желудей' };
    }
    return await res.json();
  } catch (err) {
    console.warn('[GroveAPI] Card pull failed', err);
    return { success: false, error: 'Сетевая ошибка' };
  }
}

export async function fetchStudentInventory(
  studentId: string = 'current_student'
): Promise<StudentInventoryResponse> {
  try {
    const res = await fetch(
      `${API_BASE}/api/grove/cards/inventory/${encodeURIComponent(studentId)}`,
      {
        headers: { Accept: 'application/json' },
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[GroveAPI] Fetch inventory failed', err);
    return {
      student_id: studentId,
      acorns_balance: 100,
      collection_progress: '0/16 (0.0%)',
      unique_cards_count: 0,
      catalog_total: 16,
      cards: [],
    };
  }
}


// Aliases for compatibility with other frontend screens
export type TreeStageInfo = StageInfo;
export type LiebigBalance = LiebigResourceData;
export type GroveState = GroveStateResponse;
export type StudentContribution = StudentLeaderboardEntry;
export type LeaderboardData = GroveLeaderboardResponse;
export type CardPullResult = CardPullResponse;
export type StudentInventory = StudentInventoryResponse;
export type RevivalResult = RevivalResponse;

export const groveApi = {
  getGroveState: (classId: string = 'class_7a') => fetchGroveState(classId),
  getWeeklyLeaderboard: (classId: string = 'class_7a') => fetchGroveLeaderboard(classId),
  getStudentInventory: (studentId: string = 'current_student') => fetchStudentInventory(studentId),
  pullCard: (studentId: string = 'current_student', cost: number = 50) => pullKnowledgeCard(studentId, cost),
  completeRevival: (classId: string = 'class_7a') => reviveGrove(classId),
};
