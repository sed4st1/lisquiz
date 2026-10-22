import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Sprout, Crown, BarChart2, Wrench, X } from 'lucide-react';

// Pages
import ClassGrove from './pages/ClassGrove';
import StudentHome from './pages/StudentHome';
import StudentLeaderboard from './pages/StudentLeaderboard';
import StudentStats from './pages/StudentStats';
import StudentGameQuestion from './pages/StudentGameQuestion';
import FeedbackStreak from './pages/FeedbackStreak';
import TeacherCreateQuiz from './pages/TeacherCreateQuiz';
import TeacherLobby from './pages/TeacherLobby';
import TeacherGapReport from './pages/TeacherGapReport';
import SleepScreen from './pages/SleepScreen';
import { haptics } from './services/haptics';

type TabType = 'home' | 'grove' | 'leaderboard' | 'stats';
type SubScreenType =
  | null
  | 'student_game'
  | 'feedback_correct'
  | 'feedback_wrong'
  | 'sleep_screen';

export default function App() {
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [tab, setTab] = useState<TabType>('grove');
  const [subScreen, setSubScreen] = useState<SubScreenType>(null);
  const [isMobileDevOpen, setIsMobileDevOpen] = useState(false);

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
    // If a sub-screen is actively invoked (e.g. game in progress or celebration)
    if (subScreen === 'student_game') {
      return (
        <StudentGameQuestion
          onBack={() => setSubScreen(null)}
          onAnswer={(isCorrect) => setSubScreen(isCorrect ? 'feedback_correct' : 'feedback_wrong')}
        />
      );
    }
    if (subScreen === 'feedback_correct') {
      return (
        <FeedbackStreak
          isCorrect={true}
          points={750}
          streak={3}
          onContinue={() => setSubScreen(null)}
        />
      );
    }
    if (subScreen === 'feedback_wrong') {
      return (
        <FeedbackStreak
          isCorrect={false}
          points={0}
          streak={0}
          correctAnswer="5/6"
          onContinue={() => setSubScreen(null)}
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
              onJoinGame={(pin) => {
                console.log('Student entered PIN:', pin);
                setSubScreen('student_game');
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
              onQuizCreated={() => setTab('leaderboard')}
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
              onStartQuiz={() => setSubScreen('student_game')}
            />
          );
        case 'stats':
          return <TeacherGapReport />;
      }
    }

    return null;
  };

  return (
    <div className="desktop-layout">
      {/* ========================================================
          MOBILE PHONE FRAME (Authentic Sferum / MAX experience)
         ======================================================== */}
      <div className="app-container">
        {/* Mobile Top App Bar: Brand + Role Switch */}
        <header style={styles.topHeader}>
          <div style={styles.brandGroup}>
            <img
              src="/assets/mascot/app_icon.png"
              alt="Лисквиз"
              style={styles.mascotIcon}
            />
            <div>
              <h1 style={styles.brandTitle}>Лисквиз</h1>
              <p style={styles.brandSub}>
                {role === 'teacher' ? 'Учитель 5А класс' : 'Роща знаний 5А'}
              </p>
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
            TELEGRAM FLOATING CAPSULE NAVIGATION DOCK (Image 1)
           ======================================================== */}
        <div style={styles.dockWrapper}>
          <nav style={styles.bottomNavDock}>
            {/* Tab 1: Домой */}
            {(() => {
              const isActive = tab === 'home' && !subScreen;
              return (
                <button
                  onClick={() => handleTabChange('home')}
                  style={styles.navBtn}
                >
                  {isActive && <div style={styles.dockNotch} />}
                  <div
                    style={{
                      ...styles.navIconCircle,
                      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                      border: isActive ? '2px solid #10B981' : '2px solid transparent',
                      boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.45)' : 'none',
                    }}
                  >
                    <Home size={20} color={isActive ? '#10B981' : '#7E8B9B'} />
                  </div>
                  <span style={{ ...styles.navLabel, color: isActive ? '#10B981' : '#7E8B9B' }}>
                    Домой
                  </span>
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
                >
                  {isActive && <div style={styles.dockNotch} />}
                  <div
                    style={{
                      ...styles.navIconCircle,
                      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                      border: isActive ? '2px solid #10B981' : '2px solid transparent',
                      boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.45)' : 'none',
                    }}
                  >
                    <Sprout size={20} color={isActive ? '#10B981' : '#7E8B9B'} />
                  </div>
                  <span style={{ ...styles.navLabel, color: isActive ? '#10B981' : '#7E8B9B' }}>
                    Роща
                  </span>
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
                >
                  {isActive && <div style={styles.dockNotch} />}
                  <div
                    style={{
                      ...styles.navIconCircle,
                      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                      border: isActive ? '2px solid #10B981' : '2px solid transparent',
                      boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.45)' : 'none',
                    }}
                  >
                    <Crown size={20} color={isActive ? '#10B981' : '#7E8B9B'} />
                  </div>
                  <span style={{ ...styles.navLabel, color: isActive ? '#10B981' : '#7E8B9B' }}>
                    {role === 'teacher' ? 'Лобби' : 'Рейтинг'}
                  </span>
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
                >
                  {isActive && <div style={styles.dockNotch} />}
                  <div
                    style={{
                      ...styles.navIconCircle,
                      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                      border: isActive ? '2px solid #10B981' : '2px solid transparent',
                      boxShadow: isActive ? '0 0 16px rgba(16, 185, 129, 0.45)' : 'none',
                    }}
                  >
                    <BarChart2 size={20} color={isActive ? '#10B981' : '#7E8B9B'} />
                  </div>
                  <span style={{ ...styles.navLabel, color: isActive ? '#10B981' : '#7E8B9B' }}>
                    {role === 'teacher' ? 'Отчёт' : 'Статистика'}
                  </span>
                </button>
              );
            })()}
          </nav>
        </div>
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
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  mascotIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    boxShadow: '0 2px 10px rgba(255, 122, 0, 0.35)',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: '#FFFFFF',
    lineHeight: 1.1,
    letterSpacing: '-0.3px',
    margin: 0,
  },
  brandSub: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: 700,
    margin: 0,
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
    backgroundImage: "url('/assets/backgrounds/quiz_bg_clean.png')",
    backgroundPosition: 'center top',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  },
  dockWrapper: {
    padding: '0 12px 14px 12px',
    backgroundColor: 'transparent',
    zIndex: 15,
    flexShrink: 0,
  },
  bottomNavDock: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 68,
    backgroundColor: 'rgba(12, 20, 37, 0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 26,
    padding: '4px 6px',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
  },
  navBtn: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
    transition: 'all 0.18s ease',
  },
  dockNotch: {
    position: 'absolute',
    top: -5,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#10B981',
    boxShadow: '0 0 8px #10B981',
  },
  navIconCircle: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.18s ease',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: 700,
    transition: 'color 0.18s ease',
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
