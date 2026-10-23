import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Sprout, Crown, BarChart2, Wrench, X, Flame, Droplets, Sparkles } from 'lucide-react';

// Pages
import ClassGrove from './pages/ClassGrove';
import StudentHome from './pages/StudentHome';
import StudentWaitingLobby from './pages/StudentWaitingLobby';
import StudentLeaderboard from './pages/StudentLeaderboard';
import StudentStats from './pages/StudentStats';
import StudentGameQuestion from './pages/StudentGameQuestion';
import FeedbackStreak from './pages/FeedbackStreak';
import TeacherCreateQuiz from './pages/TeacherCreateQuiz';
import TeacherLobby from './pages/TeacherLobby';
import TeacherGapReport from './pages/TeacherGapReport';
import TeacherLiveGame from './pages/TeacherLiveGame';
import StudentRoundWait from './pages/StudentRoundWait';
import SleepScreen from './pages/SleepScreen';
import { haptics } from './services/haptics';
import { socketService } from './services/socketService';

type TabType = 'home' | 'grove' | 'leaderboard' | 'stats';
type SubScreenType =
  | null
  | 'student_waiting'
  | 'student_game'
  | 'teacher_game'
  | 'feedback_correct'
  | 'feedback_wrong'
  | 'student_round_wait'
  | 'sleep_screen';

export default function App() {
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [tab, setTab] = useState<TabType>('grove');
  const [subScreen, setSubScreen] = useState<SubScreenType>(null);
  const [isMobileDevOpen, setIsMobileDevOpen] = useState(false);

  // Live session state
  const [activePin, setActivePin] = useState<string>('482915');
  const [teacherToken, setTeacherToken] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('Иван К');
  const [studentAvatar, setStudentAvatar] = useState<string>('fox_smart');
  const [currentQuestionData, setCurrentQuestionData] = useState<any>(null);
  const [personalAnswerResult, setPersonalAnswerResult] = useState<any>(null);

  // Listen to incoming WebSocket events
  useEffect(() => {
    const handleQuestionStart = (data: any) => {
      setCurrentQuestionData(data);
      if (role === 'teacher') {
        setSubScreen('teacher_game');
      } else {
        setSubScreen('student_game');
      }
    };

    const handleAnswerResult = (data: any) => {
      setPersonalAnswerResult(data);
      setSubScreen(data.is_correct ? 'feedback_correct' : 'feedback_wrong');
    };

    const handleGameFinished = () => {
      if (role === 'teacher') {
        setTab('stats');
      } else {
        setSubScreen(null);
        setTab('leaderboard');
      }
    };

    socketService.on('QUESTION_START', handleQuestionStart);
    socketService.on('PERSONAL_ANSWER_RESULT', handleAnswerResult);
    socketService.on('GAME_FINISHED', handleGameFinished);

    return () => {
      socketService.off('QUESTION_START', handleQuestionStart);
      socketService.off('PERSONAL_ANSWER_RESULT', handleAnswerResult);
      socketService.off('GAME_FINISHED', handleGameFinished);
    };
  }, [role]);

  const handleRoleSwitch = (newRole: 'teacher' | 'student') => {
    haptics.impact('light');
    setRole(newRole);
    setSubScreen(null);
    setTab(newRole === 'teacher' ? 'home' : 'grove');
  };

  const handleTabChange = (newTab: TabType) => {
    haptics.selection();
    setSubScreen(null);
    setTab(newTab);
  };

  // Render content according to active Tab & Role
  const renderTabContent = () => {
    if (subScreen === 'student_waiting') {
      return (
        <StudentWaitingLobby
          roomCode={activePin}
          playerName={studentName}
          playerAvatar={studentAvatar}
          onGameStart={() => setSubScreen('student_game')}
          onLeaveRoom={() => {
            socketService.disconnect();
            setSubScreen(null);
          }}
        />
      );
    }
    if (subScreen === 'student_game') {
      const qIndex = currentQuestionData?.question_index ?? 0;
      const totalQ = currentQuestionData?.total_questions ?? 10;
      const qObj = currentQuestionData?.question;
      const options = qObj?.options?.map((opt: any) => ({
        id: `opt_${opt.id}`,
        text: opt.text,
        color: opt.color || 'blue',
        shape: opt.symbol || 'circle',
      })) || undefined;

      return (
        <StudentGameQuestion
          questionNumber={qIndex + 1}
          totalQuestions={totalQ}
          questionText={qObj?.text}
          latex={qObj?.latex}
          options={options}
          tier={currentQuestionData?.tier || 2}
          is_boss={currentQuestionData?.is_boss || false}
          timeLimitSec={currentQuestionData?.time_limit_sec || 25}
          onBack={() => setSubScreen(null)}
          onAnswerSubmit={(optionId, isCorrect, responseTimeMs, tabBlurred) => {
            const parsed = parseInt(optionId.replace('opt_', ''), 10);
            const rawId = isNaN(parsed) ? 0 : parsed;
            if (socketService.isConnected()) {
              socketService.send('SUBMIT_ANSWER', {
                question_id: qObj?.id ?? 1,
                option_id: rawId,
                time_taken_sec: responseTimeMs / 1000,
                tab_blurred: tabBlurred,
              });
            } else {
              setSubScreen(isCorrect ? 'feedback_correct' : 'feedback_wrong');
            }
          }}
        />
      );
    }
    if (subScreen === 'teacher_game') {
      return (
        <TeacherLiveGame
          roomCode={activePin}
          initialQuestionData={currentQuestionData}
          onFinishQuiz={() => {
            setSubScreen(null);
            setTab('stats');
          }}
        />
      );
    }
    if (subScreen === 'feedback_correct') {
      return (
        <FeedbackStreak
          isCorrect={true}
          points={personalAnswerResult?.points_awarded || 750}
          streak={personalAnswerResult?.streak || 3}
          onContinue={() => setSubScreen('student_round_wait')}
        />
      );
    }
    if (subScreen === 'feedback_wrong') {
      return (
        <FeedbackStreak
          isCorrect={false}
          points={0}
          streak={0}
          correctAnswer={personalAnswerResult?.correct_option_text || '5/6'}
          onContinue={() => setSubScreen('student_round_wait')}
        />
      );
    }
    if (subScreen === 'student_round_wait') {
      return (
        <StudentRoundWait
          roomCode={activePin}
          playerName={studentName}
          playerAvatar={studentAvatar}
          personalResult={personalAnswerResult}
          onNextQuestion={(qData) => {
            setCurrentQuestionData(qData);
            setSubScreen('student_game');
          }}
          onGameFinished={() => {
            setSubScreen(null);
            setTab('leaderboard');
          }}
        />
      );
    }
    if (subScreen === 'sleep_screen') {
      return (
        <SleepScreen
          onWakeUp={() => setSubScreen(null)}
          onGoHome={() => setSubScreen(null)}
        />
      );
    }

    // Role: STUDENT
    if (role === 'student') {
      switch (tab) {
        case 'home':
          return (
            <StudentHome
              onJoinGame={(payload) => {
                setActivePin(payload.pin);
                setStudentName(payload.name);
                setStudentAvatar(payload.avatar);
                socketService.connect(payload.pin, payload.joinData.session_token).catch(() => { });
                setSubScreen('student_waiting');
              }}
              onGoToGrove={() => setTab('grove')}
            />
          );
        case 'grove':
          return (
            <ClassGrove
              onStartQuiz={() => setSubScreen('student_game')}
              onOpenLeaderboard={() => setTab('leaderboard')}
              onOpenStats={() => setTab('stats')}
            />
          );
        case 'leaderboard':
          return <StudentLeaderboard />;
        case 'stats':
          return <StudentStats />;
      }
    }

    // Role: TEACHER
    if (role === 'teacher') {
      switch (tab) {
        case 'home':
          return (
            <TeacherCreateQuiz
              onQuizCreated={(roomData: any) => {
                if (roomData) {
                  setActivePin(roomData.room_code);
                  setTeacherToken(roomData.teacher_token);
                }
                setTab('leaderboard');
              }}
            />
          );
        case 'grove':
          return (
            <ClassGrove
              onStartQuiz={() => setTab('leaderboard')}
              onOpenLeaderboard={() => setTab('leaderboard')}
              onOpenStats={() => setTab('stats')}
            />
          );
        case 'leaderboard':
          return (
            <TeacherLobby
              pin={activePin}
              teacherToken={teacherToken}
              onRoomReady={(pin, token) => {
                setActivePin(pin);
                setTeacherToken(token);
              }}
              onStartQuiz={() => {
                if (socketService.isConnected()) {
                  socketService.send('TEACHER_ACTION', { action: 'START_QUESTION', question_index: 0 });
                }
                setSubScreen('teacher_game');
              }}
            />
          );
        case 'stats':
          return <TeacherGapReport />;
      }
    }

    return null;
  };

  const activeBg = (tab === 'grove' && !subScreen)
    ? "url('/assets/backgrounds/grove_bg_clean.png')"
    : "url('/assets/backgrounds/quiz_bg_clean.png')";

  return (
    <div className="desktop-layout">
      {/* ========================================================
          MOBILE PHONE FRAME (Authentic Sferum / MAX experience)
         ======================================================== */}
      <div
        className="app-container"
        style={{
          backgroundImage: activeBg,
          backgroundPosition: 'center top',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Mobile Top App Bar: Grove Stats + Role Switch */}
        <header style={styles.topHeader}>
          <div style={styles.topStatsGroup}>
            <div style={styles.topStatPill} title="Стрик 5 дней">
              <Flame size={15} color="#FF7A00" />
              <span style={styles.topStatVal}>5</span>
            </div>
            <div style={styles.topStatPill} title="Здоровье Древа 95%">
              <Droplets size={14} color="#34D399" />
              <span style={styles.topStatVal}>95%</span>
            </div>
            <div style={styles.topStatPill} title="Стадия Дерева 4">
              <Sparkles size={13} color="#FBBF24" />
              <span style={styles.topStatVal}>Ур. 4</span>
            </div>
          </div>

          {/* Role switcher toggle: Учитель / Ученик */}
          <div style={styles.roleToggleBox}>
            <button
              onClick={() => handleRoleSwitch('teacher')}
              style={{
                ...styles.roleBtn,
                background: role === 'teacher' ? '#FF7A00' : 'transparent',
                color: role === 'teacher' ? '#FFFFFF' : '#9CA3AF',
              }}
            >
              Учитель
            </button>
            <button
              onClick={() => handleRoleSwitch('student')}
              style={{
                ...styles.roleBtn,
                background: role === 'student' ? '#FF7A00' : 'transparent',
                color: role === 'student' ? '#FFFFFF' : '#9CA3AF',
              }}
            >
              Ученик
            </button>
          </div>
        </header>

        {/* Scrollable Screen Body */}
        <main style={styles.mainContent}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${role}-${tab}-${subScreen || 'main'}`}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={styles.screenWrapper}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ========================================================
            TELEGRAM FLOATING CAPSULE NAVIGATION DOCK (Icon only)
           ======================================================== */}
        {!subScreen && (
          <div style={styles.dockWrapper}>
            <nav style={styles.bottomNavDock}>
              {/* Tab 1: Домой */}
              {(() => {
                const isActive = tab === 'home' && !subScreen;
                return (
                  <button
                    onClick={() => handleTabChange('home')}
                    style={styles.navBtn}
                    title="Домой"
                  >
                    <div
                      style={{
                        ...styles.navIconCircle,
                        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                        border: isActive ? '2px solid #10B981' : '2px solid transparent',
                        boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.45)' : 'none',
                      }}
                    >
                      <Home size={22} color={isActive ? '#10B981' : '#7E8B9B'} />
                    </div>
                  </button>
                );
              })()}

              {/* Tab 2: Роща */}
              {(() => {
                const isActive = tab === 'grove' && !subScreen;
                return (
                  <button
                    onClick={() => handleTabChange('grove')}
                    style={styles.navBtn}
                    title="Роща"
                  >
                    <div
                      style={{
                        ...styles.navIconCircle,
                        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                        border: isActive ? '2px solid #10B981' : '2px solid transparent',
                        boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.45)' : 'none',
                      }}
                    >
                      <Sprout size={22} color={isActive ? '#10B981' : '#7E8B9B'} />
                    </div>
                  </button>
                );
              })()}

              {/* Tab 3: Рейтинг / Лобби */}
              {(() => {
                const isActive = tab === 'leaderboard' && !subScreen;
                return (
                  <button
                    onClick={() => handleTabChange('leaderboard')}
                    style={styles.navBtn}
                    title={role === 'teacher' ? 'Лобби' : 'Рейтинг'}
                  >
                    <div
                      style={{
                        ...styles.navIconCircle,
                        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                        border: isActive ? '2px solid #10B981' : '2px solid transparent',
                        boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.45)' : 'none',
                      }}
                    >
                      <Crown size={22} color={isActive ? '#10B981' : '#7E8B9B'} />
                    </div>
                  </button>
                );
              })()}

              {/* Tab 4: Статистика / Отчёт */}
              {(() => {
                const isActive = tab === 'stats' && !subScreen;
                return (
                  <button
                    onClick={() => handleTabChange('stats')}
                    style={styles.navBtn}
                    title={role === 'teacher' ? 'Отчёт' : 'Статистика'}
                  >
                    <div
                      style={{
                        ...styles.navIconCircle,
                        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                        border: isActive ? '2px solid #10B981' : '2px solid transparent',
                        boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.45)' : 'none',
                      }}
                    >
                      <BarChart2 size={22} color={isActive ? '#10B981' : '#7E8B9B'} />
                    </div>
                  </button>
                );
              })()}
            </nav>
          </div>
        )}
      </div>

      {/* ========================================================
          DESKTOP DEV TOOLS SIDEBAR (Outside mobile screen)
         ======================================================== */}
      <aside className="dev-sidebar">
        <div style={styles.devHeader}>
          <Wrench size={16} color="#FF7A00" />
          <span style={styles.devTitle}>Кнопки для разработчиков</span>
        </div>
        <p style={styles.devSub}>Быстрый переход к экранам и мокам:</p>

        <div style={styles.devList}>
          <button
            onClick={() => {
              setRole('student');
              setTab('grove');
              setSubScreen(null);
            }}
            style={styles.devBtn}
          >
            🌳 Роща класса (Спринт)
          </button>

          <button
            onClick={() => {
              setRole('student');
              setTab('home');
              setSubScreen(null);
            }}
            style={styles.devBtn}
          >
            🔑 Домой: Вход по PIN (Ученик)
          </button>

          <button
            onClick={() => {
              setRole('student');
              setSubScreen('student_game');
            }}
            style={styles.devBtn}
          >
            🎮 Вопрос викторины (2.5D)
          </button>

          <button
            onClick={() => {
              setRole('student');
              setSubScreen('feedback_correct');
            }}
            style={styles.devBtn}
          >
            🎉 Победа (Конфетти)
          </button>

          <button
            onClick={() => {
              setRole('student');
              setSubScreen('feedback_wrong');
            }}
            style={styles.devBtn}
          >
            ❌ Ошибка (Фидбек)
          </button>

          <button
            onClick={() => {
              setRole('student');
              setSubScreen('student_round_wait');
            }}
            style={styles.devBtn}
          >
            ⏳ Ожидание раунда (Ученик)
          </button>

          <button
            onClick={() => {
              setRole('student');
              setTab('leaderboard');
              setSubScreen(null);
            }}
            style={styles.devBtn}
          >
            🏆 Рейтинг ученика (Топ-3)
          </button>

          <button
            onClick={() => {
              setRole('student');
              setTab('stats');
              setSubScreen(null);
            }}
            style={styles.devBtn}
          >
            📊 Статистика ученика (Ачивки)
          </button>

          <div style={styles.devDivider} />

          <button
            onClick={() => {
              setRole('teacher');
              setTab('home');
              setSubScreen(null);
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#93C5FD' }}
          >
            ✨ Создать квиз (Учитель)
          </button>

          <button
            onClick={() => {
              setRole('teacher');
              setTab('leaderboard');
              setSubScreen(null);
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#93C5FD' }}
          >
            🧑‍🏫 Лобби учителя (PIN)
          </button>

          <button
            onClick={() => {
              setRole('teacher');
              setSubScreen('teacher_game');
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#93C5FD' }}
          >
            🎮 Игра Live (Учитель)
          </button>

          <button
            onClick={() => {
              setRole('teacher');
              setTab('stats');
              setSubScreen(null);
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#93C5FD' }}
          >
            📋 Отчёт дефицитов (Gap Report)
          </button>

          <button
            onClick={() => {
              setSubScreen('sleep_screen');
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(168, 85, 247, 0.4)', color: '#D8B4FE' }}
          >
            🌙 Спящая роща (Ночной отдых)
          </button>
        </div>
      </aside>

      {/* Floating Toggle for Dev tools on small mobile screens */}
      <button
        className="mobile-dev-toggle"
        onClick={() => setIsMobileDevOpen((prev) => !prev)}
        title="Кнопки для разработчиков"
      >
        <Wrench size={18} color="#FFFFFF" />
      </button>

      {/* Mobile Dev Drawer */}
      {isMobileDevOpen && (
        <div className="mobile-dev-drawer">
          <div style={styles.mobileDevDrawerHeader}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#FF7A00' }}>
              🛠️ Кнопки для разработчиков
            </span>
            <button
              onClick={() => setIsMobileDevOpen(false)}
              style={styles.drawerCloseBtn}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button
              onClick={() => {
                setRole('student');
                setTab('grove');
                setSubScreen(null);
                setIsMobileDevOpen(false);
              }}
              style={styles.mobileDevBtn}
            >
              🌳 Роща
            </button>
            <button
              onClick={() => {
                setRole('student');
                setTab('home');
                setSubScreen(null);
                setIsMobileDevOpen(false);
              }}
              style={styles.mobileDevBtn}
            >
              🔑 Вход по PIN
            </button>
            <button
              onClick={() => {
                setSubScreen('student_game');
                setIsMobileDevOpen(false);
              }}
              style={styles.mobileDevBtn}
            >
              🎮 Игра
            </button>
            <button
              onClick={() => {
                setSubScreen('feedback_correct');
                setIsMobileDevOpen(false);
              }}
              style={styles.mobileDevBtn}
            >
              🎉 Победа
            </button>
            <button
              onClick={() => {
                setRole('teacher');
                setTab('home');
                setSubScreen(null);
                setIsMobileDevOpen(false);
              }}
              style={styles.mobileDevBtn}
            >
              ✨ Квиз
            </button>
            <button
              onClick={() => {
                setRole('teacher');
                setTab('leaderboard');
                setSubScreen(null);
                setIsMobileDevOpen(false);
              }}
              style={styles.mobileDevBtn}
            >
              🧑‍🏫 Лобби
            </button>
            <button
              onClick={() => {
                setRole('teacher');
                setTab('stats');
                setSubScreen(null);
                setIsMobileDevOpen(false);
              }}
              style={styles.mobileDevBtn}
            >
              📋 Отчёт
            </button>
            <button
              onClick={() => {
                setSubScreen('sleep_screen');
                setIsMobileDevOpen(false);
              }}
              style={styles.mobileDevBtn}
            >
              🌙 Сон
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px 8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(13, 20, 36, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    zIndex: 10,
    flexShrink: 0,
  },
  topStatsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  topStatPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: 999,
    padding: '4px 9px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
  },
  topStatVal: {
    fontSize: 12,
    fontWeight: 800,
    color: '#FFFFFF',
    letterSpacing: '0.2px',
  },
  roleToggleBox: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 3,
    gap: 2,
    border: 'none',
  },
  roleBtn: {
    border: 'none',
    padding: '5px 12px',
    borderRadius: 9,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
    transition: 'all 0.15s ease',
  },
  mainContent: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  screenWrapper: {
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
  },
  dockWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '0 12px 14px 12px',
    backgroundColor: 'transparent',
    zIndex: 25,
    pointerEvents: 'none',
  },
  bottomNavDock: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 58,
    backgroundColor: 'rgba(12, 20, 37, 0.94)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 29,
    padding: '0 8px',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
    pointerEvents: 'auto',
  },
  navBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.18s ease',
  },
  navIconCircle: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.18s ease',
  },
  devHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  devTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#FF7A00',
  },
  devSub: {
    fontSize: 11,
    color: '#9CA3AF',
    margin: '0 0 10px 0',
    lineHeight: 1.3,
  },
  devList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  devBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    borderRadius: 10,
    padding: '8px 10px',
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  devDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    margin: '4px 0',
  },
  mobileDevDrawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  drawerCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
  },
  mobileDevBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '8px',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
