# 📡 Спецификация API и WebSocket-протокола платформы «Лисквиз» (Lisquiz)

> Версия API: `v0.1.0`  
> Базовый префикс REST: `/api`  
> Базовый префикс WebSocket: `/ws`  
> Формат данных: `application/json` (UTF-8)

---

## 📑 Содержание

1. [Общие принципы и форматы ошибок](#1-общие-принципы-и-форматы-ошибок)
2. [REST API: Викторины (`/api/quiz`)](#2-rest-api-викторины-apiquiz)
3. [REST API: Игровые комнаты (`/api/rooms`)](#3-rest-api-игровые-комнаты-apirooms)
4. [REST API: Аналитика и Отчеты (`/api/analytics`)](#4-rest-api-аналитика-и-отчеты-apianalytics)
5. [REST API: Платформа MAX / Сферум (`/api/max`)](#5-rest-api-платформа-max--сферум-apimax)
6. [WebSocket протокол реального времени (`/ws/rooms/{room_code}`)](#6-websocket-протокол-реального-времени-wsroomsroom_code)
7. [Схема пакета восстановления `SYNC_STATE`](#7-схема-пакета-восстановления-sync_state)

---

## 1. Общие принципы и форматы ошибок

### Стандартный формат ошибки HTTP (RFC 7807):
```json
{
  "code": "ROOM_NOT_FOUND",
  "detail": "Игровая комната с кодом 482915 не найдена или уже завершена",
  "timestamp": "2026-10-21T11:30:00Z"
}
```

### Коды ошибок:
| Код | HTTP статус | Описание |
| :--- | :---: | :--- |
| `INVALID_CREDENTIALS` | 401 | Неверный сессионный токен или поддельная подпись MAX `initData` |
| `ROOM_NOT_FOUND` | 404 | Комната с данным 6-значным PIN-кодом не существует |
| `ROOM_ALREADY_PLAYING`| 409 | Нельзя войти в комнату: игра уже началась |
| `ROOM_FULL` | 409 | Достигнут лимит участников комнаты (максимум 50) |
| `ALREADY_ANSWERED` | 400 | Ученик уже отправил ответ на текущий вопрос |
| `VALIDATION_ERROR` | 422 | Некорректный формат переданных полей |

---

## 2. REST API: Викторины (`/api/quiz`)

### 2.1. Создание викторины с помощью ИИ
`POST /api/quiz/generate`

Генерация проверочной викторины по предмету и теме Федеральной рабочей программы (ФРП).

**Тело запроса:**
```json
{
  "subject": "Математика",
  "grade": 5,
  "topic": "Сложение и вычитание обыкновенных дробей",
  "question_count": 5,
  "source_notes": "Текст с доски или конспект урока (опционально)"
}
```

**Успешный ответ (`200 OK`):**
```json
{
  "id": "quiz_a7f9b2c1",
  "title": "Математика (5 класс) — Сложение и вычитание обыкновенных дробей",
  "subject": "Математика",
  "grade": 5,
  "topic": "Сложение и вычитание обыкновенных дробей",
  "created_at": "2026-10-21T11:30:00Z",
  "questions": [
    {
      "id": 1,
      "text": "Чему равна сумма $\\frac{1}{4} + \\frac{2}{4}$?",
      "explanation": "Знаменатели одинаковые, складываем числители: (1 + 2) / 4 = 3/4.",
      "time_limit_sec": 20,
      "topic": "Сложение дробей с одинаковым знаменателем",
      "options": [
        { "id": 0, "text": "$\\frac{3}{4}$", "is_correct": true, "symbol": "triangle", "color": "orange" },
        { "id": 1, "text": "$\\frac{3}{8}$", "is_correct": false, "symbol": "diamond", "color": "blue" },
        { "id": 2, "text": "$\\frac{2}{4}$", "is_correct": false, "symbol": "circle", "color": "yellow" },
        { "id": 3, "text": "$\\frac{1}{2}$", "is_correct": false, "symbol": "square", "color": "green" }
      ]
    }
  ]
}
```

### 2.2. Ручное сохранение / редактирование викторины
`POST /api/quiz`

**Тело запроса:** Полный объект `Quiz` (аналогично ответу генерации).  
**Ответ:** `{"status": "saved", "quiz_id": "quiz_a7f9b2c1"}`.

### 2.3. Справочник предметов и тем ФРП
`GET /api/quiz/catalog/topics?grade=5&subject=Математика`

**Ответ (`200 OK`):**
```json
{
  "subject": "Математика",
  "grade": 5,
  "sections": [
    {
      "name": "Натуральные числа",
      "topics": ["Арифметика натуральных чисел", "Делимость чисел"]
    },
    {
      "name": "Обыкновенные дроби",
      "topics": ["Понятие дроби", "Сложение и вычитание", "Правильные и неправильные дроби"]
    }
  ]
}
```

---

## 3. REST API: Игровые комнаты (`/api/rooms`)

### 3.1. Создание комнаты (Учитель)
`POST /api/rooms`

**Тело запроса:**
```json
{
  "quiz_id": "quiz_a7f9b2c1"
}
```

**Ответ (`201 Created`):**
```json
{
  "room_code": "482915",
  "quiz_title": "Математика (5 класс) — Обыкновенные дроби",
  "status": "lobby",
  "teacher_token": "sec_teach_89a1b2c3d4",
  "ws_url": "/ws/rooms/482915?token=sec_teach_89a1b2c3d4&role=teacher",
  "qr_url": "/api/rooms/482915/qr"
}
```

### 3.2. Проверка статуса комнаты (Ученик перед входом)
`GET /api/rooms/{room_code}`

**Ответ (`200 OK`):**
```json
{
  "room_code": "482915",
  "status": "lobby",
  "quiz_title": "Математика (5 класс)",
  "total_questions": 5,
  "players_count": 14
}
```

### 3.3. Вход ученика в комнату
`POST /api/rooms/{room_code}/join`

**Тело запроса:**
```json
{
  "name": "Иван К.",
  "avatar": "fox_smart"
}
```

**Ответ (`200 OK`):**
```json
{
  "player_id": "p_91b4ca",
  "name": "Иван К.",
  "avatar": "fox_smart",
  "session_token": "sec_stud_10f2d8e4",
  "ws_url": "/ws/rooms/482915?token=sec_stud_10f2d8e4&role=student"
}
```

### 3.4. Управление ходом игры (Учитель)
`POST /api/rooms/{room_code}/control`  
*Требует заголовок: `Authorization: Bearer <teacher_token>`*

**Тело запроса:**
```json
{
  "action": "START_GAME" // Возможные: START_GAME, NEXT_QUESTION, PAUSE_GAME, FINISH_GAME
}
```

---

## 4. REST API: Аналитика и Отчеты (`/api/analytics`)

### 4.1. Получение диагностической матрицы пробелов (Class Gap Heatmap)
`GET /api/rooms/{room_code}/report`

**Ответ (`200 OK`):**
```json
{
  "room_code": "482915",
  "quiz_title": "Обыкновенные дроби",
  "total_participants": 28,
  "average_score": 1840.5,
  "class_accuracy_percent": 74,
  "grove_growth_percent": 82,
  "questions_stats": [
    {
      "question_id": 1,
      "text": "Чему равна сумма 1/4 + 2/4?",
      "topic": "Сложение дробей",
      "correct_percent": 89,
      "mistake_count": 3,
      "dominant_distractor": "3/8",
      "cognitive_gap": "Сложение знаменателей вместо сохранения общего знаменателя"
    },
    {
      "question_id": 2,
      "text": "Какая дробь называется правильной?",
      "topic": "Определение правильной дроби",
      "correct_percent": 46,
      "mistake_count": 15,
      "dominant_distractor": "Числитель больше знаменателя",
      "cognitive_gap": "Путаница между понятиями правильной и неправильной дроби"
    }
  ],
  "topics_to_review": [
    "Определение правильной и неправильной дроби (вопрос #2)",
    "Приведение к общему знаменателю (вопрос #4)"
  ],
  "homework_recommendation": "Скорректировать домашнее задание: включить 3 задачи на сравнение числителя со знаменателем.",
  "flagged_cheaters": [
    { "name": "Михаил С.", "blurred_count": 3, "reason": "Переключение вкладки более 3 раз" }
  ]
}
```

### 4.2. Экспорт ведомости успеваемости в CSV
`GET /api/rooms/{room_code}/export/csv`  
Возвращает файл `lisquiz_report_482915.csv` с баллами и ответами каждого ученика.

---

## 5. REST API: Платформа MAX / Сферум (`/api/max`)

### 5.1. Вебхук событий чат-бота
`POST /api/max/webhook`

Принимает события от платформы MAX (входящие сообщения в чате, нажатия inline-кнопок).

**Пример полезной нагрузки от MAX:**
```json
{
  "update_id": 100234,
  "message": {
    "message_id": 451,
    "chat_id": "chat_school_class_5a",
    "from": {
      "id": "max_u_9921",
      "first_name": "Ангелина",
      "is_bot": false
    },
    "text": "/quiz 482915"
  }
}
```

### 5.2. Валидация WebApp InitData (152-ФЗ Zero-PII)
`POST /api/max/auth/validate`

Проверяет HMAC-SHA256 подпись параметров запуска Сферума и возвращает псевдонимизированный `pseudonym_id` без сохранения персональных данных.

---

## 6. WebSocket протокол реального времени (`/ws/rooms/{room_code}`)

### Формат сообщения (JSON):
```json
{
  "event": "EVENT_NAME",
  "data": { ... }
}
```

### 6.1. События клиента к серверу (Client -> Server)

| Событие | Роль | Полезная нагрузка | Описание |
| :--- | :---: | :--- | :--- |
| `PING` | Все | `{}` | Heartbeat каждые 15 сек |
| `SUBMIT_ANSWER` | Student | `{"question_id": 1, "option_id": 0, "time_taken_sec": 4.2}` | Отправка ответа на вопрос |
| `CHEAT_SUSPECTED`| Student | `{"reason": "tab_switched", "elapsed_ms": 2400}` | Уведомление о расфокусе окна |
| `TEACHER_ACTION`| Teacher | `{"action": "START" \| "NEXT" \| "SHOW_RESULTS"}` | Управление раундом |
| `KICK_PLAYER` | Teacher | `{"player_id": "p_91b4ca"}` | Удаление игрока из комнаты |

### 6.2. События сервера к клиенту (Server -> Client)

#### `PLAYER_JOINED` (Рассылается в лобби всем):
```json
{
  "event": "PLAYER_JOINED",
  "data": {
    "player_id": "p_91b4ca",
    "name": "Иван К.",
    "avatar": "fox_smart",
    "total_players": 12
  }
}
```

#### `QUESTION_START` (Начало вопроса):
```json
{
  "event": "QUESTION_START",
  "data": {
    "question_index": 0,
    "total_questions": 5,
    "text": "Чему равна сумма $\\frac{1}{4} + \\frac{2}{4}$?",
    "time_limit_sec": 20,
    "options": [
      { "id": 0, "text": "$\\frac{3}{4}$", "symbol": "triangle", "color": "orange" },
      { "id": 1, "text": "$\\frac{3}{8}$", "symbol": "diamond", "color": "blue" },
      { "id": 2, "text": "$\\frac{2}{4}$", "symbol": "circle", "color": "yellow" },
      { "id": 3, "text": "$\\frac{1}{2}$", "symbol": "square", "color": "green" }
    ]
  }
}
```
*(Примечание: поле `is_correct` намеренно скрыто от клиента до окончания раунда).*

#### `QUESTION_RESULTS` (Раскрытие правильного ответа):
```json
{
  "event": "QUESTION_RESULTS",
  "data": {
    "question_id": 1,
    "correct_option_id": 0,
    "explanation": "Знаменатели одинаковые: 1/4 + 2/4 = 3/4.",
    "distribution": { "0": 22, "1": 4, "2": 1, "3": 1 },
    "grove_energy_added": 15
  }
}
```

#### `PERSONAL_ANSWER_RESULT` (Персонально каждому ученику):
```json
{
  "event": "PERSONAL_ANSWER_RESULT",
  "data": {
    "is_correct": true,
    "points_awarded": 870,
    "total_score": 1620,
    "streak": 2,
    "mascot_emotion": "JOY_CELEBRATE"
  }
}
```

#### `LEADERBOARD_UPDATE` (Промежуточный топ):
```json
{
  "event": "LEADERBOARD_UPDATE",
  "data": {
    "top_players": [
      { "rank": 1, "name": "Иван К.", "score": 1620, "streak": 2, "avatar": "fox_smart" },
      { "rank": 2, "name": "Мария С.", "score": 1550, "streak": 2, "avatar": "owl" },
      { "rank": 3, "name": "Артем П.", "score": 1410, "streak": 1, "avatar": "raccoon" }
    ],
    "class_grove_energy": 65
  }
}
```

---

## 7. Схема пакета восстановления `SYNC_STATE`

При переподключении клиента (обрыв связи, перезапуск страницы, сворачивание приложения) сервер немедленно высылает полный снапшот состояния:

```json
{
  "event": "SYNC_STATE",
  "data": {
    "room_code": "482915",
    "status": "playing",
    "current_question_index": 2,
    "total_questions": 5,
    "remaining_time_ms": 11400,
    "has_answered": false,
    "player_state": {
      "player_id": "p_91b4ca",
      "score": 1620,
      "streak": 2,
      "blurred_count": 0
    },
    "current_question": {
      "id": 3,
      "text": "Сократите дробь 6/8:",
      "options": [
        { "id": 0, "text": "3/4", "symbol": "triangle", "color": "orange" },
        { "id": 1, "text": "1/2", "symbol": "diamond", "color": "blue" },
        { "id": 2, "text": "2/3", "symbol": "circle", "color": "yellow" },
        { "id": 3, "text": "4/5", "symbol": "square", "color": "green" }
      ]
    }
  }
}
```
Клиентский интерфейс мгновенно переходит в актуальный экран, отображает правильные секунды на таймере и предотвращает рассинхронизацию с классом.
