import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { colors } from './theme/tokens'

// Pages
import TeacherCreateQuiz from './pages/TeacherCreateQuiz'
import TeacherLobby from './pages/TeacherLobby'
import StudentJoin from './pages/StudentJoin'
import StudentGameQuestion from './pages/StudentGameQuestion'
import FeedbackStreak from './pages/FeedbackStreak'
import TeacherGapReport from './pages/TeacherGapReport'
import ClassGrove from './pages/ClassGrove'

// Simple client-side router screens
type Screen =
  | 'teacher_create'
  | 'teacher_lobby'
  | 'student_join'
  | 'student_game'
  | 'feedback_correct'
  | 'feedback_wrong'
  | 'teacher_report'
  | 'class_grove'

export default function App() {
  const [screen, setScreen] = useState<Screen>('teacher_create')
  const [role, setRole] = useState<'teacher' | 'student'>('teacher')

  const handleRoleSwitch = (newRole: 'teacher' | 'student') => {
    setRole(newRole)
    setScreen(newRole === 'teacher' ? 'teacher_create' : 'student_join')
  }

  const renderScreen = () => {
    switch (screen) {
      case 'teacher_create':
        return <TeacherCreateQuiz onQuizCreated={() => setScreen('teacher_lobby')} />
      case 'teacher_lobby':
        return <TeacherLobby onStartQuiz={() => setScreen('student_game')} onBack={() => setScreen('teacher_create')} />
      case 'student_join':
        return <StudentJoin onJoined={() => setScreen('student_game')} />
      case 'student_game':
        return (
          <StudentGameQuestion
            onAnswer={(correct) => setScreen(correct ? 'feedback_correct' : 'feedback_wrong')}
          />
        )
      case 'feedback_correct':
        return (
          <FeedbackStreak
            isCorrect={true}
            points={750}
            streak={3}
            onContinue={() => setScreen('teacher_report')}
          />
        )
      case 'feedback_wrong':
        return (
          <FeedbackStreak
            isCorrect={false}
            points={0}
            streak={0}
            correctAnswer="\\frac{5}{4}"
            onContinue={() => setScreen('teacher_report')}
          />
        )
      case 'teacher_report':
        return <TeacherGapReport onBack={() => setScreen('class_grove')} />
      case 'class_grove':
        return <ClassGrove onBack={() => setScreen('teacher_create')} />
      default:
        return <TeacherCreateQuiz onQuizCreated={() => setScreen('teacher_lobby')} />
    }
  }

  return (
    <div className="app-container">
      {/* Header with role switch */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: `1px solid ${colors.cardBorder}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/assets/mascot/app_icon.png"
            alt="Лисквиз"
            style={{ width: 36, height: 36, borderRadius: 10 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary, lineHeight: 1.2 }}>
              Лисквиз
            </h1>
            <p style={{ fontSize: 11, color: colors.textMuted }}>
              Интерактивные викторины
            </p>
          </div>
        </div>

        {/* Role switch */}
        <div style={{
          display: 'flex',
          background: colors.cardSurface,
          borderRadius: 10,
          padding: 3,
          gap: 2,
          border: `1px solid ${colors.cardBorder}`,
        }}>
          <button
            onClick={() => handleRoleSwitch('teacher')}
            style={{
              border: 'none',
              background: role === 'teacher' ? colors.foxOrange : 'transparent',
              color: role === 'teacher' ? '#fff' : colors.textSecondary,
              padding: '6px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            Учитель
          </button>
          <button
            onClick={() => handleRoleSwitch('student')}
            style={{
              border: 'none',
              background: role === 'student' ? colors.foxOrange : 'transparent',
              color: role === 'student' ? '#fff' : colors.textSecondary,
              padding: '6px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            Ученик
          </button>
        </div>
      </header>

      {/* Navigation breadcrumbs for demo */}
      <nav style={{
        display: 'flex',
        gap: 6,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}>
        {[
          { key: 'teacher_create', label: 'Создание', roles: ['teacher'] },
          { key: 'teacher_lobby', label: 'Лобби', roles: ['teacher'] },
          { key: 'student_join', label: 'Вход', roles: ['student'] },
          { key: 'student_game', label: 'Игра', roles: ['teacher', 'student'] },
          { key: 'feedback_correct', label: '✅ Верно', roles: ['teacher', 'student'] },
          { key: 'feedback_wrong', label: '❌ Неверно', roles: ['teacher', 'student'] },
          { key: 'teacher_report', label: 'Отчёт', roles: ['teacher'] },
          { key: 'class_grove', label: 'Роща', roles: ['teacher', 'student'] },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setScreen(item.key as Screen)}
            style={{
              background: screen === item.key ? colors.foxOrangeLight : colors.cardSurface,
              color: screen === item.key ? colors.foxOrange : colors.textMuted,
              border: screen === item.key ? `1px solid ${colors.foxOrange}40` : `1px solid ${colors.cardBorder}`,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: screen === item.key ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Screen content with page transitions */}
      <main style={{ flex: 1, position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            style={{ width: '100%' }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 16,
        paddingTop: 12,
        borderTop: `1px solid ${colors.cardBorder}`,
      }}>
        <p>Команда «Вабба-Лабба-Дэдлайн» • Всероссийский хакатон «Идея фикс» 2026</p>
      </footer>
    </div>
  )
}
