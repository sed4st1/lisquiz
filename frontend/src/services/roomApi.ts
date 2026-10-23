export interface CreateRoomResponse {
  room_code: string;
  status: string;
  quiz_title: string;
  teacher_token: string;
  ws_url: string;
}

export interface RoomInfoResponse {
  room_code: string;
  status: string;
  quiz_title: string;
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
  async createRoom(quiz?: any, teacherName: string = 'Учитель'): Promise<CreateRoomResponse> {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz: quiz || undefined,
        teacher_name: teacherName,
      }),
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
};
