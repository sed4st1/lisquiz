import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Pages
import TeacherCreateQuiz from './pages/TeacherCreateQuiz';
import TeacherLobby from './pages/TeacherLobby';
import StudentJoin from './pages/StudentJoin';
import StudentGameQuestion from './pages/StudentGameQuestion';
import FeedbackStreak from './pages/FeedbackStreak';
import TeacherGapReport from './pages/TeacherGapReport';
import ClassGrove from './pages/ClassGrove';
import SleepScreen from './pages/SleepScreen';
import SplashScreen from './components/SplashScreen';

// Client-side router screens
type Screen =
  | 'teacher_create'
  | 'teacher_lobby'
  | 'student_join'
  | 'student_game'
  | 'feedback_correct'
  | 'feedback_wrong'
  | 'teacher_report'
  | 'class_grove'
  | 'sleep_screen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState<Screen>('class_grove');
  const [role, setRole] = useState<'teacher' | 'student'>('student');

  const handleRoleSwitch = (newRole: 'teacher' | 'student') => {
    setRole(newRole);
    setScreen(newRole === 'teacher' ? 'teacher_create' : 'class_grove');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'teacher_create':
        return (
          <TeacherCreateQuiz
            onQuizCreated={() => setScreen('teacher_lobby')}
            onBack={() => setScreen('class_grove')}
          />
        );
      case 'teacher_lobby':
        return (
          <TeacherLobby
            onStartQuiz={() => setScreen('student_game')}
            onBack={() => setScreen('teacher_create')}
          />
        );
      case 'student_join':
        return <StudentJoin onJoined={() => setScreen('student_game')} />;
      case 'student_game':
        return (
          <StudentGameQuestion
            onBack={() => setScreen('class_grove')}
            onAnswer={(correct) => setScreen(correct ? 'feedback_correct' : 'feedback_wrong')}
          />
        );
      case 'feedback_correct':
        return (
          <FeedbackStreak
            isCorrect={true}
            points={750}
            streak={3}
            onContinue={() => setScreen('class_grove')}
          />
        );
      case 'feedback_wrong':
        return (
          <FeedbackStreak
            isCorrect={false}
            points={0}
            streak={0}
            correctAnswer="5/6"
            onContinue={() => setScreen('teacher_report')}
          />
        );
      case 'teacher_report':
        return <TeacherGapReport onBack={() => setScreen('class_grove')} />;
      case 'class_grove':
        return (
          <ClassGrove
            onBack={() => setScreen('teacher_create')}
            onStartQuiz={() => setScreen('student_game')}
            onOpenLeaderboard={() => setScreen('teacher_report')}
            onOpenStats={() => setScreen('teacher_report')}
          />
        );
      case 'sleep_screen':
        return (
          <SleepScreen
            onWakeUp={() => setScreen('class_grove')}
            onGoHome={() => setScreen('class_grove')}
          />
        );
      default:
        return <ClassGrove onBack={() => setScreen('teacher_create')} />;
    }
  };

  const DEV_SCREENS: { key: Screen | 'splash'; label: string; icon: string }[] = [
    { key: 'class_grove', label: 'Роща класса (Спринт)', icon: '🌳' },
    { key: 'student_join', label: 'Домой: Вход по PIN (Ученик)', icon: '🔑' },
    { key: 'student_game', label: 'Вопрос викторины (2.5D)', icon: '🎮' },
    { key: 'feedback_correct', label: 'Победа (Конфетти)', icon: '🎉' },
    { key: 'feedback_wrong', label: 'Ошибка (Фидбек)', icon: '❌' },
    { key: 'teacher_create', label: 'Создать квиз (Учитель)', icon: '✨' },
    { key: 'teacher_lobby', label: 'Лобби учителя (PIN)', icon: '👨‍🏫' },
    { key: 'teacher_report', label: 'Отчёт дефицитов (Gap Report)', icon: '📋' },
    { key: 'sleep_screen', label: 'Спящая роща (Ночной отдых)', icon: '🌙' },
    { key: 'splash', label: 'Заставка Спринта (Хвостик)', icon: '🦊' },
  ];

  return (
    <div className="app-shell">
      {/* =========================================================================
          PHONE VIEWPORT CONTAINER (Sferum MAX 60fps Target)
          ========================================================================= */}
      <div className="app-container">
        {/* Splash screen with waving Sprint tail */}
        <AnimatePresence>
          {showSplash && <SplashScreen onLoaded={() => setShowSplash(false)} />}
        </AnimatePresence>

        {/* Global App Header (Shown only on non-game views to avoid double headers) */}
        {screen !== 'class_grove' && screen !== 'sleep_screen' && (
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px 10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(13, 20, 36, 0.75)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src="/assets/mascot/app_icon.png"
                alt="Лисквиз"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  boxShadow: '0 2px 10px rgba(255, 122, 0, 0.35)',
                }}
              />
              <div>
                <h1
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: '#FFFFFF',
                    lineHeight: 1.2,
                    letterSpacing: '-0.3px',
                  }}
                >
                  Лисквиз
                </h1>
                <p style={{ fontSize: 11, color: '#10B981', fontWeight: 700, margin: 0 }}>
                  Роща знаний • 5А
                </p>
              </div>
            </div>

            {/* Role switch toggle */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: 12,
                padding: 3,
                gap: 2,
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <button
                onClick={() => handleRoleSwitch('teacher')}
                style={{
                  border: 'none',
                  background: role === 'teacher' ? '#FF7A00' : 'transparent',
                  color: role === 'teacher' ? '#fff' : '#9CA3AF',
                  padding: '5px 12px',
                  borderRadius: 9,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
              >
                Учитель
              </button>
              <button
                onClick={() => handleRoleSwitch('student')}
                style={{
                  border: 'none',
                  background: role === 'student' ? '#FF7A00' : 'transparent',
                  color: role === 'student' ? '#fff' : '#9CA3AF',
                  padding: '5px 12px',
                  borderRadius: 9,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
              >
                Ученик
              </button>
            </div>
          </header>
        )}

        {/* Active Screen Transition */}
        <main
          style={{
            flex: 1,
            height: '100%',
            minHeight: 0,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '100%',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* =========================================================================
          DESKTOP SIDEBAR: DEV CONTROLS & TEST MOUNT (Outside Phone Bezel)
          ========================================================================= */}
      <aside className="dev-sidebar">
        <div className="dev-sidebar-header">
          <span style={{ fontSize: 18 }}>🛠️</span>
          <div>
            <div className="dev-sidebar-title">Кнопки для разработчиков</div>
            <div className="dev-sidebar-sub">Быстрый переход к экранам и мокам:</div>
          </div>
        </div>

        <div className="dev-btn-list">
          {DEV_SCREENS.map((item) => {
            const isActive = item.key === 'splash' ? showSplash : screen === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`dev-screen-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (item.key === 'splash') {
                    setShowSplash(true);
                  } else {
                    setScreen(item.key as Screen);
                  }
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
