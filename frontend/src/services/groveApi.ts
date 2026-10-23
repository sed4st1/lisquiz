export interface TreeStageInfo {
  level: number;
  stage: string;
  title: string;
  min_xp: number;
  max_xp: number;
}

export interface LiebigBalance {
  water_pct: number;
  humus_pct: number;
  light_pct: number;
  biome_balance: number;
  is_balanced_bonus: boolean;
  limiting_resource: 'water' | 'humus' | 'light';
}

export interface GroveState {
  class_id: string;
  total_xp: number;
  tree_stage: string;
  stage_level: number;
  stage_info: TreeStageInfo;
  next_stage_info: TreeStageInfo;
  stage_progress_pct: number;
  xp_to_next_stage: number;
  streak_days: number;
  liebig: LiebigBalance;
  mascot_advice: string;
  biome_status: string;
  is_hibernating: boolean | number;
  revival_quest_active: boolean | number;
  hibernation_days: number;
}

export interface StudentContribution {
  student_id: string;
  student_name: string;
  avatar: string;
  rank: number;
  weekly_xp: number;
  prev_week_xp: number;
  total_xp: number;
  delta_xp: number;
  flair: 'mvp_gold' | 'top3_emerald' | 'breakthrough_star' | 'none';
  flair_title: string | null;
  division: 'council_of_groves' | 'forest_guardians' | 'sprout_keepers';
  division_title: string;
  division_role: string;
}

export interface LeaderboardData {
  class_id: string;
  total_students: number;
  is_calibrated: boolean;
  divisions: {
    council_of_groves: StudentContribution[];
    forest_guardians: StudentContribution[];
    sprout_keepers: StudentContribution[];
  };
  mvp_top1: StudentContribution | null;
  top3: StudentContribution[];
  most_improved: StudentContribution | null;
}

export interface KnowledgeCard {
  card_id: string;
  card_name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  subject: string;
  lore_microfact: string;
  count?: number;
  first_obtained?: string;
}

export interface CardPullResult {
  success: boolean;
  card: KnowledgeCard;
  is_duplicate: boolean;
  refund_acorns: number;
  remaining_acorns: number;
  pity_info: {
    pulls_to_epic_guarantee: number;
    pulls_to_legendary_guarantee: number;
    total_pulls: number;
  };
}

export interface StudentInventory {
  student_id: string;
  acorns_balance: number;
  collection_progress: string;
  unique_cards_count: number;
  catalog_total: number;
  cards: KnowledgeCard[];
}

export interface RevivalResult {
  class_id: string;
  revived: boolean;
  bonus_xp: number;
  new_total_xp: number;
  animation: string;
  mascot_speech: string;
}

export const groveApi = {
  async getGroveState(classId: string = 'class_7a'): Promise<GroveState> {
    const res = await fetch(`/api/grove/${classId}`);
    if (!res.ok) throw new Error('Не удалось получить состояние Рощи');
    return res.json();
  },

  async getWeeklyLeaderboard(classId: string = 'class_7a'): Promise<LeaderboardData> {
    const res = await fetch(`/api/grove/${classId}/leaderboard`);
    if (!res.ok) throw new Error('Не удалось получить лидерборд');
    return res.json();
  },

  async getStudentInventory(studentId: string = 'std_ivan'): Promise<StudentInventory> {
    const res = await fetch(`/api/grove/cards/inventory/${studentId}`);
    if (!res.ok) throw new Error('Не удалось получить инвентарь карточек');
    return res.json();
  },

  async pullCard(studentId: string = 'std_ivan', cost: number = 50): Promise<CardPullResult> {
    const res = await fetch('/api/grove/cards/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, cost }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка крутки карточки');
    }
    return res.json();
  },

  async completeRevival(classId: string = 'class_7a'): Promise<RevivalResult> {
    const res = await fetch(`/api/grove/${classId}/revive`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Не удалось пробудить Рощу');
    return res.json();
  },
};
