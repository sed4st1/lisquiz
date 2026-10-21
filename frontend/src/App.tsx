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

  return (
    <div className="app-container">
      {/* Mobile Top App Bar with Mascot Icon and Role Switch */}
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
              width: 38,
              height: 38,
              borderRadius: 12,
              boxShadow: '0 2px 10px rgba(255, 122, 0, 0.35)',
            }}
          />
          <div>
            <h1
              style={{
                fontSize: 17,
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

      {/* Screen Quick Tabs for Interactive Testing & Live Demo */}
      <nav
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 12px 6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          backgroundColor: 'rgba(8, 13, 26, 0.5)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          zIndex: 9,
        }}
      >
        {[
          { key: 'class_grove', label: 'Роща' },
          { key: 'student_game', label: 'Игра' },
          { key: 'feedback_correct', label: 'Победа' },
          { key: 'teacher_create', label: 'Создать квиз' },
          { key: 'teacher_lobby', label: 'Лобби' },
          { key: 'student_join', label: 'Вход' },
          { key: 'teacher_report', label: 'Отчёт' },
        ].map((item) => {
          const isActive = screen === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setScreen(item.key as Screen)}
              style={{
                background: isActive ? 'rgba(255, 122, 0, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#FF7A00' : '#9CA3AF',
                border: isActive
                  ? '1px solid rgba(255, 122, 0, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 999,
                padding: '4px 10px',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: isActive ? 800 : 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Active Screen Transition */}
      <main
        style={{
          flex: 1,
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
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
