export interface CreateRoomOptions {
  quiz?: any;
  teacher_name?: string;
  subject?: string;
  grade?: number;
  topic?: string;
  question_count?: number;
  textbook_id?: string;
  paragraph_num?: number;
}

export interface CreateRoomResponse {
  room_code: string;
  status: string;
  quiz_title: string;
  subject?: string;
  grade?: number;
  total_questions?: number;
  teacher_token: string;
  ws_url: string;
}

export interface RoomInfoResponse {
  room_code: string;
  status: string;
  quiz_title: string;
  subject?: string;
  grade?: number;
  total_questions: number;
  players_count: number;
}

export interface JoinRoomResponse {
  player_id: string;
  name: string;
  avatar: string;
  session_token: string;
  ws_url: string;
}

export const roomApi = {
  async createRoom(options?: CreateRoomOptions | any, teacherName: string = 'Учитель'): Promise<CreateRoomResponse> {
    const payload = options && typeof options === 'object' && ('subject' in options || 'quiz' in options || 'question_count' in options || 'textbook_id' in options)
      ? {
          quiz: options.quiz || undefined,
          teacher_name: options.teacher_name || teacherName,
          subject: options.subject,
          grade: options.grade,
          topic: options.topic,
          question_count: options.question_count,
          textbook_id: options.textbook_id,
          paragraph_num: options.paragraph_num,
        }
      : {
          quiz: options || undefined,
          teacher_name: teacherName,
        };

    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Не удалось создать комнату');
    }
    return res.json();
  },

  async getRoomInfo(roomCode: string): Promise<RoomInfoResponse> {
    const res = await fetch(`/api/rooms/${roomCode}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Комната не найдена');
    }
    return res.json();
  },

  async joinRoom(roomCode: string, name: string, avatar: string): Promise<JoinRoomResponse> {
    const res = await fetch(`/api/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatar }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Не удалось войти в комнату');
    }
    return res.json();
  },

  async getRoomQuiz(roomCode: string): Promise<any> {
    const res = await fetch(`/api/rooms/${roomCode}/quiz`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Не удалось загрузить викторину комнаты');
    }
    return res.json();
  },

  async updateRoomQuiz(roomCode: string, quiz: any): Promise<any> {
    const res = await fetch(`/api/rooms/${roomCode}/quiz`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quiz),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Не удалось обновить викторину комнаты');
    }
    return res.json();
  },

  async getPresetTextbookQuizzes(): Promise<any[]> {
    try {
      const res = await fetch('/api/ml2/textbooks/preset-quizzes');
      if (res.ok) {
        const data = await res.json();
        return data.quizzes || [];
      }
    } catch (e) {
      console.warn('Failed to fetch textbook preset quizzes:', e);
    }
    return [];
  },
};
