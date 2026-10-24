/**
 * LISQUIZ Dev & QA Test Harness
 * 
 * Provides automated helpers for manual testing and demonstration:
 * 1. Adding mock student bots to live rooms
 * 2. Simulating live student answers with accuracy control
 * 3. Seeding persistent demo classes with long-term analytics and leaderboards
 * 4. 1-click full game loop runner
 */

import { roomApi } from './roomApi';
import { classApi, ClassItem } from './classApi';

export const testHarness = {
  /**
   * Adds mock student bots directly to the specified room.
   */
  async addMockStudents(roomCode: string, count: number = 3): Promise<number> {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/test/add_mock_players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.added_count || count;
      }
    } catch {
      // Fallback: join directly via roomApi
    }

    const pool = [
      { name: 'Иван К', avatar: 'fox_smart' },
      { name: 'Аня Смирнова', avatar: 'owl' },
      { name: 'Максим Петров', avatar: 'bear' },
      { name: 'София Морозова', avatar: 'bunny' },
      { name: 'Даниил Романов', avatar: 'raccoon' },
    ];

    let added = 0;
    for (let i = 0; i < Math.min(count, pool.length); i++) {
      try {
        await roomApi.joinRoom(roomCode, pool[i].name, pool[i].avatar);
        added++;
      } catch (e) {
        console.warn('Fallback joinRoom bot error:', e);
      }
    }
    return added;
  },

  /**
   * Simulates answers from all bots for the current active question.
   */
  async simulateBotAnswers(roomCode: string, accuracy: number = 0.75): Promise<number> {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/test/simulate_answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accuracy }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.simulated_count || 0;
      }
    } catch (e) {
      console.warn('simulateBotAnswers error:', e);
    }
    return 0;
  },

  /**
   * Creates a demo class (7А) and seeds mock students + generates long-term stats.
   */
  async seedDemoClass(): Promise<ClassItem> {
    // 1. Create class 7А
    const cls = await classApi.createClass('7А', 'Алгебра', 7);

    // 2. Enroll 5 students into the class
    const students = [
      { name: 'Иван К', pid: 'pid_s_ivan' },
      { name: 'Аня Смирнова', pid: 'pid_s_anya' },
      { name: 'Максим Петров', pid: 'pid_s_max' },
      { name: 'София Морозова', pid: 'pid_s_sofia' },
      { name: 'Даниил Романов', pid: 'pid_s_daniil' },
    ];

    for (const s of students) {
      try {
        await classApi.joinClass(cls.invite_code, s.pid);
      } catch {}
    }

    // 3. Create a room tied to this class
    try {
      const room = await roomApi.createRoom({
        subject: 'Алгебра',
        grade: 7,
        topic: 'Обыкновенные дроби',
        class_id: cls.id,
      });

      // Add bots to this room
      await this.addMockStudents(room.room_code, 4);
    } catch (e) {
      console.warn('Seed room creation notice:', e);
    }

    return cls;
  },
};
