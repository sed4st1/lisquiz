import { useState, useEffect, useRef } from 'react'

const AVATARS = [
  { id: 'fox_smart', label: '🦊 Умный Лис' },
  { id: 'owl', label: '🦉 Мудрая Сова' },
  { id: 'raccoon', label: '🦝 Енот-Хакер' },
  { id: 'bear', label: '🐻 Сильный Медведь' },
  { id: 'hedgehog', label: '🦔 Шустрый Ёжик' },
]

const OPTION_STYLES = [
  { symbol: '▲', colorClass: 'opt-red' },
  { symbol: '◆', colorClass: 'opt-blue' },
  { symbol: '●', colorClass: 'opt-yellow' },
  { symbol: '■', colorClass: 'opt-green' },
]

interface OptionItem {
  id: number
  text: string
  symbol?: string
  color?: string
  is_correct?: boolean
}

interface QuestionItem {
  id: number
  text: string
  topic?: string
  explanation?: string
  time_limit_sec: number
  options: OptionItem[]
}

interface PlayerItem {
  id: string
  name: string
  avatar: string
  score?: number
  streak?: number
  connected?: boolean
}

interface PersonalResult {
  is_correct: boolean
  points_awarded: number
  speed_bonus: number
  total_score: number
  streak: number
  grove_energy?: number
}

interface ResultsData {
  question_id: number
  correct_option_id: number
  explanation: string
  distribution: Record<string, number>
  grove_energy: number
}

interface LeaderboardItem {
  rank: number
  id: string
  name: string
  avatar: string
  score: number
  streak: number
}

interface LeaderboardData {
  top_players: LeaderboardItem[]
  grove_energy: number
  is_last_question: boolean
}

interface QuestionStatItem {
  question_id: number
  text: string
  topic: string
  correct_percent: number
  mistake_count: number
  dominant_distractor?: string
  cognitive_gap?: string
}

interface GapReportData {
  room_code: string
  quiz_title: string
  total_participants: number
  average_score: number
  class_accuracy_percent: number
  grove_growth_percent: number
  questions_stats: QuestionStatItem[]
  topics_to_review: string[]
  homework_recommendation: string
  flagged_cheaters: string[]
}

export default function App() {
  const [role, setRole] = useState<'teacher' | 'student'>('teacher')

  // Состояние учителя
  const [teacherName, setTeacherName] = useState('Ангелина Валерьевна')
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null)
  const [quizTitle, setQuizTitle] = useState('Математика (5 класс) — Обыкновенные дроби')

  // Состояние ученика
  const [studentPin, setStudentPin] = useState('')
  const [studentName, setStudentName] = useState('Иван Кошельник')
  const [selectedAvatar, setSelectedAvatar] = useState('fox_smart')
  const [studentToken, setStudentToken] = useState<string | null>(null)
  const [studentPlayerId, setStudentPlayerId] = useState<string | null>(null)

  // Общее состояние комнаты (WebSockets)
  const [roomStatus, setRoomStatus] = useState<string>('lobby')
  const [playersList, setPlayersList] = useState<PlayerItem[]>([])
  const [wsConnected, setWsConnected] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [groveEnergy, setGroveEnergy] = useState<number>(0)

  // Игровой цикл
  const [countdownVal, setCountdownVal] = useState<number>(3)
  const [questionIndex, setQuestionIndex] = useState<number>(0)
  const [totalQuestions, setTotalQuestions] = useState<number>(3)
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem | null>(null)
  const [timerRemaining, setTimerRemaining] = useState<number>(20)

  // Ход ответов для учителя
  const [answeredCount, setAnsweredCount] = useState<number>(0)
  const [totalConnected, setTotalConnected] = useState<number>(0)
  const [allAnswered, setAllAnswered] = useState<boolean>(false)

  // Ход ответов для ученика
  const [hasAnswered, setHasAnswered] = useState<boolean>(false)
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null)
  const [personalResult, setPersonalResult] = useState<PersonalResult | null>(null)
  const [tabBlurred, setTabBlurred] = useState<boolean>(false)

  // Результаты, Лидерборд, Итоговый отчет
  const [resultsData, setResultsData] = useState<ResultsData | null>(null)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null)
  const [gapReportData, setGapReportData] = useState<GapReportData | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const questionStartTimeRef = useRef<number>(0)
  const tabBlurredRef = useRef<boolean>(false)

  // Закрытие сокета при смене роли
  useEffect(() => {
    resetState()
  }, [role])

  // Анти-чит для учеников: отслеживание расфокуса окна
  useEffect(() => {
    if (role !== 'student' || roomStatus !== 'question' || hasAnswered) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabBlurredRef.current = true
        setTabBlurred(true)
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              event: 'CHEAT_SUSPECTED',
              data: { reason: 'tab_switched' },
            })
          )
        }
      }
    }

    const handleBlur = () => {
      tabBlurredRef.current = true
      setTabBlurred(true)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'CHEAT_SUSPECTED',
            data: { reason: 'window_blur' },
          })
        )
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
  }, [role, roomStatus, hasAnswered])

  // Очистка таймеров
  const clearGameTimers = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }

  const resetState = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
    clearGameTimers()
    setWsConnected(false)
    setCreatedRoomCode(null)
    setStudentToken(null)
    setStudentPlayerId(null)
    setPlayersList([])
    setRoomStatus('lobby')
    setStatusMessage('')
    setGroveEnergy(0)
    setCurrentQuestion(null)
    setHasAnswered(false)
    setSelectedOptionId(null)
    setPersonalResult(null)
    setResultsData(null)
    setLeaderboardData(null)
    setGapReportData(null)
    setAnsweredCount(0)
    setAllAnswered(false)
    setTabBlurred(false)
    tabBlurredRef.current = false
  }

  // Подключение к WebSocket
  const connectWebSocket = (roomCode: string, token: string) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.port === '3000' ? 'localhost:8000' : window.location.host
    const wsUrl = `${protocol}//${host}/ws/rooms/${roomCode}?token=${token}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      setStatusMessage('🟢 Подключено к серверу реального времени')

      // Пинг каждые 15 секунд
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'PING' }))
        }
      }, 15000)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleWsEvent(msg.event, msg.data)
      } catch (err) {
        console.error('Ошибка парсинга WS сообщения:', err)
      }
    }

    ws.onclose = (e) => {
      setWsConnected(false)
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
      clearGameTimers()
      if (e.code === 4003) {
        alert('Вы были исключены учителем из комнаты.')
        resetState()
      } else {
        setStatusMessage('🔴 Соединение с сервером разорвано')
      }
    }

    ws.onerror = (err) => {
      console.error('WS Error:', err)
      setWsConnected(false)
    }
  }

  // Обработка входящих WebSocket событий
  const handleWsEvent = (event: string, data: any) => {
    switch (event) {
      case 'SYNC_STATE':
        setRoomStatus(data.status)
        setGroveEnergy(data.grove_energy || 0)
        if (data.current_question) {
          setCurrentQuestion(data.current_question)
          setQuestionIndex(data.current_question_index)
          setTotalQuestions(data.total_questions)
        }
        if (data.has_answered) {
          setHasAnswered(true)
        }
        break

      case 'PLAYER_JOINED':
        setPlayersList((prev) => {
          if (prev.some((p) => p.id === data.player_id)) return prev
          return [...prev, { id: data.player_id, name: data.name, avatar: data.avatar, connected: true }]
        })
        break

      case 'PLAYER_LEFT':
        setPlayersList((prev) => prev.filter((p) => p.id !== data.player_id))
        break

      case 'COUNTDOWN_START':
        clearGameTimers()
        setRoomStatus('countdown')
        setCountdownVal(data.countdown_sec || 3)
        if (data.total_questions) setTotalQuestions(data.total_questions)
        const nextQIndex = data.question_index !== undefined ? data.question_index : 0
        setQuestionIndex(nextQIndex)
        setStatusMessage(`⏰ Вопрос ${nextQIndex + 1}: Приготовьтесь...`)

        // Запуск обратного отсчета 3..2..1
        let cd = data.countdown_sec || 3
        timerIntervalRef.current = window.setInterval(() => {
          cd -= 1
          if (cd > 0) {
            setCountdownVal(cd)
          } else {
            clearGameTimers()
            // Учитель автоматически запускает вопрос при окончании отсчета
            if (role === 'teacher' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  event: 'TEACHER_ACTION',
                  data: { action: 'START_QUESTION', question_index: nextQIndex },
                })
              )
            }
          }
        }, 1000)
        break

      case 'QUESTION_START':
        clearGameTimers()
        setRoomStatus('question')
        setCurrentQuestion(data.question)
        setQuestionIndex(data.question_index)
        setTotalQuestions(data.total_questions)
        const limitSec = data.time_limit_sec || 20
        setTimerRemaining(limitSec)
        setHasAnswered(false)
        setSelectedOptionId(null)
        setPersonalResult(null)
        setAnsweredCount(0)
        setAllAnswered(false)
        setTabBlurred(false)
        tabBlurredRef.current = false
        questionStartTimeRef.current = Date.now()
        setStatusMessage(`Вопрос ${data.question_index + 1}: ${data.question?.text || ''}`)

        // Таймер вопроса
        let rem = limitSec
        timerIntervalRef.current = window.setInterval(() => {
          rem -= 1
          if (rem >= 0) {
            setTimerRemaining(rem)
          } else {
            clearGameTimers()
          }
        }, 1000)
        break

      case 'ANSWER_COLLECTED':
        setAnsweredCount(data.answered_count || 0)
        setTotalConnected(data.total_players || 0)
        setAllAnswered(Boolean(data.all_answered))
        break

      case 'PERSONAL_ANSWER_RESULT':
        setPersonalResult(data)
        if (data.grove_energy !== undefined) setGroveEnergy(data.grove_energy)
        break

      case 'QUESTION_RESULTS':
        clearGameTimers()
        setRoomStatus('reveal_results')
        setResultsData(data)
        if (data.grove_energy !== undefined) setGroveEnergy(data.grove_energy)
        setStatusMessage(`Правильный ответ: вариант #${data.correct_option_id + 1}`)
        break

      case 'LEADERBOARD_UPDATE':
        clearGameTimers()
        setRoomStatus('leaderboard')
        setLeaderboardData(data)
        if (data.grove_energy !== undefined) setGroveEnergy(data.grove_energy)
        setStatusMessage('🏆 Лидерборд класса обновлен!')
        break

      case 'GAME_FINISHED':
        clearGameTimers()
        setRoomStatus('finished')
        setGapReportData(data.gap_report)
        setStatusMessage('🎉 Викторина успешно завершена! Готов отчет дефицитов.')
        break

      case 'CHEAT_ALERT':
        alert(`⚠️ Внимание: Ученик ${data.name} переключил вкладку во время вопроса!`)
        break

      case 'KICKED':
        alert(`Вас исключили: ${data.reason}`)
        resetState()
        break
    }
  }

  // ==========================================
  // Действия Учителя
  // ==========================================

  const handleCreateRoom = async () => {
    try {
      setStatusMessage('Создание комнаты...')
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_name: teacherName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Ошибка создания комнаты')

      setCreatedRoomCode(data.room_code)
      setQuizTitle(data.quiz_title)
      connectWebSocket(data.room_code, data.teacher_token)
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`)
      setStatusMessage('')
    }
  }

  const handleKickPlayer = (playerId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'KICK_PLAYER',
          data: { player_id: playerId },
        })
      )
    }
  }

  const handleStartGame = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'TEACHER_ACTION',
          data: { action: 'START_GAME' },
        })
      )
    }
  }

  const handleShowResults = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'TEACHER_ACTION',
          data: { action: 'SHOW_RESULTS' },
        })
      )
    }
  }

  const handleShowLeaderboard = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'TEACHER_ACTION',
          data: { action: 'SHOW_LEADERBOARD' },
        })
      )
    }
  }

  const handleNextQuestion = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'TEACHER_ACTION',
          data: { action: 'NEXT_QUESTION' },
        })
      )
    }
  }

  // ==========================================
  // Действия Ученика
  // ==========================================

  const handleJoinRoom = async () => {
    if (!studentPin || studentPin.length !== 6) {
      alert('Введите корректный 6-значный PIN-код комнаты')
      return
    }
    if (!studentName.trim()) {
      alert('Введите ваше имя')
      return
    }

    try {
      setStatusMessage('Подключение к комнате...')
      const res = await fetch(`/api/rooms/${studentPin}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName,
          avatar: selectedAvatar,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Не удалось войти в комнату')

      setStudentToken(data.session_token)
      setStudentPlayerId(data.player_id)
      connectWebSocket(studentPin, data.session_token)
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`)
      setStatusMessage('')
    }
  }

  const handleSubmitAnswer = (optionId: number) => {
    if (hasAnswered || !currentQuestion) return

    const timeTaken = Math.max(0.5, (Date.now() - questionStartTimeRef.current) / 1000)
    setSelectedOptionId(optionId)
    setHasAnswered(true)

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'SUBMIT_ANSWER',
          data: {
            question_id: currentQuestion.id,
            option_id: optionId,
            time_taken_sec: timeTaken,
            tab_blurred: tabBlurredRef.current,
          },
        })
      )
    }
  }

  // Мое место в лидерборде (для ученика)
  const myLeaderboardEntry = leaderboardData?.top_players.find((p) => p.id === studentPlayerId)

  return (
    <div className="app-container">
      {/* Шапка приложения */}
      <header className="header">
        <div className="brand">
          <span className="mascot-badge">🦊</span>
          <div>
            <h1>Лисквиз</h1>
            <p>Интерактивные викторины в Сферуме (MAX)</p>
          </div>
        </div>
        <div className="role-switch">
          <button
            className={`btn-role ${role === 'teacher' ? 'active' : ''}`}
            onClick={() => setRole('teacher')}
          >
            Учитель
          </button>
          <button
            className={`btn-role ${role === 'student' ? 'active' : ''}`}
            onClick={() => setRole('student')}
          >
            Ученик
          </button>
        </div>
      </header>

      {/* Основной контент */}
      <main className="content">
        {/* Индикатор статуса WebSocket */}
        {statusMessage && (
          <div className="status-banner">
            <span>{statusMessage}</span>
            {wsConnected && <span className="online-dot">●</span>}
          </div>
        )}

        {/* ========================================================
            РЕЖИМ УЧИТЕЛЯ
           ======================================================== */}
        {role === 'teacher' && (
          <div>
            {/* 1. Создание комнаты */}
            {!createdRoomCode && (
              <section className="card">
                <h2>Создание комнаты для урока</h2>
                <p className="subtitle">Экспресс-викторина по Федеральной рабочей программе</p>
                <div className="form-group">
                  <label>Имя учителя</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Выбранная тема викторины</label>
                  <input type="text" value={quizTitle} readOnly />
                </div>
                <button className="btn-primary" onClick={handleCreateRoom}>
                  ✨ Открыть комнату и получить PIN
                </button>
              </section>
            )}

            {/* 2. Лобби ожидания */}
            {createdRoomCode && roomStatus === 'lobby' && (
              <section className="card lobby-card">
                <div className="lobby-header">
                  <div>
                    <span className="badge">Код для подключения класса:</span>
                    <h2 className="pin-display">{createdRoomCode}</h2>
                  </div>
                  <button className="btn-secondary" onClick={resetState}>
                    Выйти
                  </button>
                </div>

                <div className="grove-bar">
                  <span>🌳 Энергия «Рощи класса»: {groveEnergy}%</span>
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${groveEnergy}%` }}></div>
                  </div>
                </div>

                <div className="players-section">
                  <div className="section-title">
                    <h3>Ученики в лобби ({playersList.length})</h3>
                    <button
                      className="btn-primary btn-start"
                      onClick={handleStartGame}
                    >
                      ▶ Запустить игру
                    </button>
                  </div>

                  {playersList.length === 0 ? (
                    <div className="empty-lobby">
                      <p>🦊 Спринт ждёт учеников...</p>
                      <small>Попросите школьников ввести PIN <b>{createdRoomCode}</b></small>
                    </div>
                  ) : (
                    <div className="players-grid">
                      {playersList.map((p) => (
                        <div key={p.id} className="player-chip">
                          <span className="player-avatar">
                            {AVATARS.find((a) => a.id === p.avatar)?.label.split(' ')[0] || '🦊'}
                          </span>
                          <span className="player-name">{p.name}</span>
                          <button
                            className="btn-kick"
                            title="Исключить ученика"
                            onClick={() => handleKickPlayer(p.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 3. Обратный отсчет перед вопросом */}
            {createdRoomCode && roomStatus === 'countdown' && (
              <section className="card center-card">
                <span className="mascot-hero">🦊</span>
                <h2>Вопрос {questionIndex + 1} из {totalQuestions}</h2>
                <div className="countdown-number">{countdownVal}</div>
                <p className="subtitle">Приготовьтесь к вопросу!</p>
              </section>
            )}

            {/* 4. Вопрос в процессе (Экран учителя) */}
            {createdRoomCode && roomStatus === 'question' && currentQuestion && (
              <section className="card">
                <div className="question-header">
                  <span className="badge">Вопрос {questionIndex + 1} из {totalQuestions}</span>
                  <span className="timer-badge">⏱ {timerRemaining}с</span>
                </div>

                <div className="timer-bar-bg">
                  <div
                    className="timer-bar-fill"
                    style={{ width: `${(timerRemaining / (currentQuestion.time_limit_sec || 20)) * 100}%` }}
                  ></div>
                </div>

                <h2 className="question-text">{currentQuestion.text}</h2>

                <div className="answers-status">
                  <span>Ответов получено: <b>{answeredCount}</b> {totalConnected > 0 ? `из ${totalConnected}` : ''}</span>
                  {allAnswered && <span className="all-answered-badge">⚡ Все ответили!</span>}
                </div>

                <div className="options-grid">
                  {currentQuestion.options.map((opt, idx) => (
                    <div
                      key={opt.id}
                      className={`option-card ${OPTION_STYLES[idx % 4].colorClass} ${opt.is_correct ? 'correct-preview' : ''}`}
                    >
                      <span className="option-symbol">{OPTION_STYLES[idx % 4].symbol}</span>
                      <span className="option-text">{opt.text}</span>
                      {opt.is_correct && <span className="teacher-correct-tag">★ Верный</span>}
                    </div>
                  ))}
                </div>

                <button className="btn-primary" onClick={handleShowResults} style={{ marginTop: '20px' }}>
                  👉 Показать результаты вопроса
                </button>
              </section>
            )}

            {/* 5. Результаты вопроса (Экран учителя) */}
            {createdRoomCode && roomStatus === 'reveal_results' && resultsData && currentQuestion && (
              <section className="card">
                <span className="badge">Результаты вопроса {questionIndex + 1}</span>
                <h2 className="question-text">{currentQuestion.text}</h2>

                <div className="results-distribution">
                  {currentQuestion.options.map((opt, idx) => {
                    const count = resultsData.distribution[String(opt.id)] || 0
                    const isRight = opt.id === resultsData.correct_option_id
                    return (
                      <div key={opt.id} className={`result-bar-item ${isRight ? 'is-correct-bar' : ''}`}>
                        <div className="result-bar-info">
                          <span>
                            {OPTION_STYLES[idx % 4].symbol} {opt.text} {isRight ? '✅ (Правильный)' : ''}
                          </span>
                          <b>{count} {count === 1 ? 'ответ' : 'ответов'}</b>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${playersList.length > 0 ? Math.round((count / playersList.length) * 100) : count > 0 ? 100 : 0}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {resultsData.explanation && (
                  <div className="explanation-box">
                    <strong>💡 Методическое пояснение:</strong>
                    <p>{resultsData.explanation}</p>
                  </div>
                )}

                <div className="grove-bar" style={{ marginTop: '16px' }}>
                  <span>🌳 Энергия «Рощи класса»: {groveEnergy}%</span>
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${groveEnergy}%` }}></div>
                  </div>
                </div>

                <button className="btn-primary" onClick={handleShowLeaderboard} style={{ marginTop: '16px' }}>
                  🏆 Показать лидерборд
                </button>
              </section>
            )}

            {/* 6. Лидерборд (Экран учителя) */}
            {createdRoomCode && roomStatus === 'leaderboard' && leaderboardData && (
              <section className="card">
                <span className="badge">Таблица лидеров</span>
                <h2>Лидерборд класса</h2>

                <div className="leaderboard-list">
                  {leaderboardData.top_players.map((p) => (
                    <div key={p.id} className={`leaderboard-row rank-${p.rank}`}>
                      <div className="rank-badge">#{p.rank}</div>
                      <div className="player-meta">
                        <span className="player-avatar">
                          {AVATARS.find((a) => a.id === p.avatar)?.label.split(' ')[0] || '🦊'}
                        </span>
                        <span className="player-name">{p.name}</span>
                        {p.streak > 1 && <span className="streak-badge">🔥 x{p.streak}</span>}
                      </div>
                      <div className="player-score">{p.score} б.</div>
                    </div>
                  ))}
                </div>

                <button className="btn-primary" onClick={handleNextQuestion} style={{ marginTop: '20px' }}>
                  {leaderboardData.is_last_question ? '🏁 Завершить викторину и открыть отчет' : '▶ Следующий вопрос'}
                </button>
              </section>
            )}

            {/* 7. Итоговый отчет дефицитов (Экран учителя) */}
            {createdRoomCode && roomStatus === 'finished' && gapReportData && (
              <section className="card gap-report-card">
                <span className="badge">Итоговый анализ по ФРП</span>
                <h2>Отчет дефицитов класса (Gap Report)</h2>
                <p className="subtitle">{gapReportData.quiz_title}</p>

                <div className="stats-kpi-grid">
                  <div className="kpi-box">
                    <span className="kpi-val">{gapReportData.total_participants}</span>
                    <span className="kpi-lbl">Учеников</span>
                  </div>
                  <div className="kpi-box">
                    <span className="kpi-val">{gapReportData.class_accuracy_percent}%</span>
                    <span className="kpi-lbl">Точность</span>
                  </div>
                  <div className="kpi-box">
                    <span className="kpi-val">{gapReportData.average_score}</span>
                    <span className="kpi-lbl">Средний балл</span>
                  </div>
                  <div className="kpi-box">
                    <span className="kpi-val">{gapReportData.grove_growth_percent}%</span>
                    <span className="kpi-lbl">Роща класса</span>
                  </div>
                </div>

                <div className="questions-stat-table">
                  <h3>Анализ по вопросам программы</h3>
                  {gapReportData.questions_stats.map((qs) => (
                    <div key={qs.question_id} className="stat-row">
                      <div className="stat-header">
                        <span className="topic-name">#{qs.question_id} {qs.topic}</span>
                        <span className={`accuracy-pill ${qs.correct_percent >= 60 ? 'good' : 'warning'}`}>
                          {qs.correct_percent}% верно
                        </span>
                      </div>
                      <p className="stat-text">{qs.text}</p>
                      {qs.dominant_distractor && (
                        <p className="dominant-error">
                          ⚠️ Типичная ошибка: <span>«{qs.dominant_distractor}»</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="recommendation-card">
                  <strong>📌 Рекомендация к домашнему заданию:</strong>
                  <p>{gapReportData.homework_recommendation}</p>
                </div>

                {gapReportData.flagged_cheaters.length > 0 && (
                  <div className="cheaters-card">
                    <strong>🛡️ Античит-контроль (переключение вкладок):</strong>
                    <p>{gapReportData.flagged_cheaters.join(', ')}</p>
                  </div>
                )}

                <button className="btn-primary" onClick={resetState} style={{ marginTop: '20px' }}>
                  🔄 Создать новую викторину
                </button>
              </section>
            )}
          </div>
        )}

        {/* ========================================================
            РЕЖИМ УЧЕНИКА
           ======================================================== */}
        {role === 'student' && (
          <div>
            {/* 1. Вход в викторину */}
            {!studentToken && (
              <section className="card">
                <h2>Вход в викторину</h2>
                <p className="subtitle">Без сложной регистрации — вход по PIN-коду с экрана учителя</p>
                <div className="form-group">
                  <label>6-значный код комнаты (PIN)</label>
                  <input
                    type="text"
                    placeholder="Например: 482915"
                    maxLength={6}
                    value={studentPin}
                    onChange={(e) => setStudentPin(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Ваше имя или позывной</label>
                  <input
                    type="text"
                    placeholder="Иван К."
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Выберите аватара маскота</label>
                  <div className="avatar-picker">
                    {AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        className={`avatar-btn ${selectedAvatar === av.id ? 'active' : ''}`}
                        onClick={() => setSelectedAvatar(av.id)}
                      >
                        {av.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn-primary" onClick={handleJoinRoom}>
                  🎮 Войти в комнату
                </button>
              </section>
            )}

            {/* 2. Лобби ожидания старта */}
            {studentToken && roomStatus === 'lobby' && (
              <section className="card student-lobby">
                <div className="mascot-welcome">
                  <span className="mascot-hero">🦊</span>
                  <h2>Вы в игре!</h2>
                  <p className="subtitle">Комната #{studentPin}</p>
                </div>

                <div className="waiting-box">
                  <div className="pulse-loader"></div>
                  <p>Ожидаем, пока учитель запустит викторину...</p>
                  <small>Лисёнок Спринт разминает лапки перед забегом 🐾</small>
                </div>

                <button className="btn-secondary" onClick={resetState} style={{ marginTop: '20px', width: '100%' }}>
                  Покинуть комнату
                </button>
              </section>
            )}

            {/* 3. Обратный отсчет перед вопросом */}
            {studentToken && roomStatus === 'countdown' && (
              <section className="card center-card">
                <span className="mascot-hero">🦊</span>
                <h2>Вопрос {questionIndex + 1} из {totalQuestions}</h2>
                <div className="countdown-number">{countdownVal}</div>
                <p className="subtitle">Внимание на экран!</p>
              </section>
            )}

            {/* 4. Вопрос в процессе (Экран ученика) */}
            {studentToken && roomStatus === 'question' && currentQuestion && (
              <section className="card">
                <div className="question-header">
                  <span className="badge">Вопрос {questionIndex + 1} из {totalQuestions}</span>
                  <span className="timer-badge">⏱ {timerRemaining}с</span>
                </div>

                <div className="timer-bar-bg">
                  <div
                    className="timer-bar-fill"
                    style={{ width: `${(timerRemaining / (currentQuestion.time_limit_sec || 20)) * 100}%` }}
                  ></div>
                </div>

                <h2 className="question-text">{currentQuestion.text}</h2>

                {tabBlurred && (
                  <div className="blur-warning">
                    ⚠️ Обнаружен расфокус окна! Скоростной бонус аннулирован.
                  </div>
                )}

                {!hasAnswered ? (
                  <div className="student-options-grid">
                    {currentQuestion.options.map((opt, idx) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`student-opt-btn ${OPTION_STYLES[idx % 4].colorClass}`}
                        onClick={() => handleSubmitAnswer(opt.id)}
                      >
                        <span className="opt-symbol-big">{OPTION_STYLES[idx % 4].symbol}</span>
                        <span className="opt-text-big">{opt.text}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="answered-waiting-box">
                    <span className="mascot-hero">🐾</span>
                    <h3>Ответ принят!</h3>
                    {selectedOptionId !== null && (
                      <p className="subtitle">
                        Вы выбрали вариант #{selectedOptionId + 1}. Ожидаем окончания времени или остальных участников...
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* 5. Результаты вопроса (Экран ученика) */}
            {studentToken && roomStatus === 'reveal_results' && (
              <section className="card center-card">
                {personalResult ? (
                  personalResult.is_correct ? (
                    <div className="feedback-card correct">
                      <span className="feedback-emoji">🎉</span>
                      <h2>Верно!</h2>
                      <div className="points-added">+{personalResult.points_awarded} б.</div>
                      {personalResult.speed_bonus > 0 && (
                        <p className="bonus-note">⚡ Бонус за скорость: +{personalResult.speed_bonus}</p>
                      )}
                      {personalResult.streak > 1 && (
                        <p className="streak-note">🔥 Серия побед: x{personalResult.streak}</p>
                      )}
                      <div className="total-score-pill">Всего очков: {personalResult.total_score}</div>
                    </div>
                  ) : (
                    <div className="feedback-card wrong">
                      <span className="feedback-emoji">❌</span>
                      <h2>Ошибочка!</h2>
                      <p className="subtitle">Не расстраивайтесь, следующий вопрос будет лучше!</p>
                      <div className="total-score-pill">Всего очков: {personalResult.total_score}</div>
                    </div>
                  )
                ) : (
                  <div className="feedback-card">
                    <span className="feedback-emoji">⌛</span>
                    <h2>Время вышло</h2>
                    <p className="subtitle">Вы не успели дать ответ</p>
                  </div>
                )}

                {resultsData?.explanation && (
                  <div className="explanation-box" style={{ marginTop: '20px', textAlign: 'left' }}>
                    <strong>💡 Пояснение:</strong>
                    <p>{resultsData.explanation}</p>
                  </div>
                )}

                <div className="grove-bar" style={{ marginTop: '16px' }}>
                  <span>🌳 Энергия «Рощи класса»: {groveEnergy}%</span>
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${groveEnergy}%` }}></div>
                  </div>
                </div>
              </section>
            )}

            {/* 6. Лидерборд (Экран ученика) */}
            {studentToken && roomStatus === 'leaderboard' && leaderboardData && (
              <section className="card">
                <span className="badge">Результаты класса</span>
                <h2>Таблица лидеров</h2>

                {myLeaderboardEntry && (
                  <div className="my-rank-banner">
                    <span>Твое текущее место:</span>
                    <b>#{myLeaderboardEntry.rank} • {myLeaderboardEntry.score} б.</b>
                  </div>
                )}

                <div className="leaderboard-list">
                  {leaderboardData.top_players.map((p) => (
                    <div
                      key={p.id}
                      className={`leaderboard-row rank-${p.rank} ${p.id === studentPlayerId ? 'my-row' : ''}`}
                    >
                      <div className="rank-badge">#{p.rank}</div>
                      <div className="player-meta">
                        <span className="player-avatar">
                          {AVATARS.find((a) => a.id === p.avatar)?.label.split(' ')[0] || '🦊'}
                        </span>
                        <span className="player-name">
                          {p.name} {p.id === studentPlayerId ? '(Ты)' : ''}
                        </span>
                        {p.streak > 1 && <span className="streak-badge">🔥 x{p.streak}</span>}
                      </div>
                      <div className="player-score">{p.score} б.</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 7. Завершение игры (Экран ученика) */}
            {studentToken && roomStatus === 'finished' && (
              <section className="card center-card">
                <span className="mascot-hero">🏆</span>
                <h2>Викторина завершена!</h2>
                <p className="subtitle">Лисёнок Спринт благодарит за отличную игру 🦊</p>

                {myLeaderboardEntry && (
                  <div className="my-final-result">
                    <div className="final-rank">#{myLeaderboardEntry.rank} место</div>
                    <div className="final-score">{myLeaderboardEntry.score} баллов</div>
                  </div>
                )}

                <div className="grove-bar" style={{ marginTop: '20px' }}>
                  <span>🌳 Наш класс вырастил Рощу на {groveEnergy}%</span>
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${groveEnergy}%` }}></div>
                  </div>
                </div>

                <button className="btn-secondary" onClick={resetState} style={{ marginTop: '24px', width: '100%' }}>
                  В главное меню
                </button>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Футер */}
      <footer className="footer">
        <p>Команда «Вабба-Лабба-Дэдлайн» • Всероссийский хакатон «Идея фикс» 2026</p>
      </footer>
    </div>
  )
}
