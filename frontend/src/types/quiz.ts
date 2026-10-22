// ===== Subject & Curriculum =====
export interface Subject {
  id: string;
  name: string; // e.g. 'Математика'
  icon?: string;
}

export interface FrpTopic {
  id: string;
  subject_id: string;
  grade: number; // 1-11
  section: string; // Раздел ФРП
  topic: string; // Тема
  kes_codes: string[]; // Коды КЭС
}

// ===== Quiz & Questions =====
export type QuestionType = 'multiple_choice' | 'true_false' | 'open_ended' | 'math_expression';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: string;
  text: string;
  latex?: string; // KaTeX LaTeX string for math
  image_url?: string;
  type: QuestionType;
  options: QuizOption[];
  correct_option_ids: string[];
  difficulty: DifficultyLevel;
  time_limit_sec: number; // Default 10-30
  points: number;
  kes_code?: string;
  explanation?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  latex?: string;
  color: 'red' | 'blue' | 'yellow' | 'green';
  shape: 'triangle' | 'diamond' | 'circle' | 'square';
}

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  grade: number;
  topic: string;
  kes_codes: string[];
  questions: QuizQuestion[];
  created_at: string;
  created_by: string;
  is_ai_generated: boolean;
  source_image_url?: string; // If generated from photo
}

// ===== Game Room =====
export type RoomStatus = 'waiting' | 'countdown' | 'question' | 'answer_reveal' | 'leaderboard' | 'finished';

export interface GameRoom {
  id: string;
  pin: string; // 6-digit PIN
  quiz_id: string;
  host_id: string;
  status: RoomStatus;
  current_question_index: number;
  players: Player[];
  created_at: string;
  settings: RoomSettings;
}

export interface RoomSettings {
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_leaderboard_after_each: boolean;
  allow_late_join: boolean;
  anti_cheat_enabled: boolean;
}

export interface Player {
  id: string;
  user_id: string;
  display_name: string;
  avatar: string; // avatar filename, e.g. 'hedgehog'
  score: number;
  streak: number;
  answers: PlayerAnswer[];
  is_online: boolean;
}

export interface PlayerAnswer {
  question_id: string;
  selected_option_ids: string[];
  is_correct: boolean;
  time_ms: number; // Response time in milliseconds
  points_earned: number;
}

// ===== Leaderboard =====
export interface LeaderboardEntry {
  rank: number;
  player: Player;
  delta: number; // Position change
}

// ===== Teacher Analytics =====
export interface QuestionAnalytics {
  question_id: string;
  question_text: string;
  correct_count: number;
  total_count: number;
  correct_percentage: number;
  avg_time_ms: number;
  kes_code?: string;
  topic?: string;
  is_weak: boolean; // < 50% correct
}

export interface ClassGapReport {
  room_id: string;
  quiz_title: string;
  total_students: number;
  avg_score_percentage: number;
  questions_analytics: QuestionAnalytics[];
  weak_topics: string[];
  recommended_review: string[];
  created_at: string;
}

// ===== Class Grove (Gamification) =====
export type TreeStage = 'seed' | 'sprout' | 'sapling' | 'young_tree' | 'mature_tree' | 'flowering';

export interface ClassGroveData {
  class_id: string;
  class_name: string;
  total_points: number;
  tree_stage: TreeStage;
  next_stage_points: number;
  weekly_quizzes_completed: number;
  streak_days: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at?: string;
  is_unlocked: boolean;
}

// ===== WebSocket Events =====
export type WSEventType =
  | 'player_joined'
  | 'player_left'
  | 'game_started'
  | 'question_show'
  | 'answer_submitted'
  | 'answer_reveal'
  | 'leaderboard_update'
  | 'game_finished'
  | 'timer_tick';

export interface WSMessage<T = unknown> {
  event: WSEventType;
  data: T;
  timestamp: string;
}

// ===== API Request/Response =====
export interface CreateQuizRequest {
  subject: string;
  grade: number;
  topic: string;
  question_count: number;
  source_image?: File;
  difficulty?: DifficultyLevel;
}

export interface CreateRoomResponse {
  room_id: string;
  pin: string;
  ws_url: string;
}

export interface JoinRoomRequest {
  pin: string;
  display_name: string;
  avatar: string;
}

export interface JoinRoomResponse {
  player_id: string;
  room: GameRoom;
  ws_url: string;
}
