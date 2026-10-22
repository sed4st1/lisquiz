import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  UserPlus,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { TactileButton } from '../components/TactileButton';
import { haptics } from '../services/haptics';

export interface TeacherLobbyProps {
  pin?: string;
  quizTitle?: string;
  subject?: string;
  grade?: number;
  maxStudents?: number;
  onStartQuiz?: () => void;
}

const CONNECTED_STUDENTS = [
  { id: '1', name: 'Маша К.', avatar: '/assets/avatars/students/hedgehog.png' },
  { id: '2', name: 'Артём В.', avatar: '/assets/avatars/students/raccoon.png' },
  { id: '3', name: 'София Л.', avatar: '/assets/avatars/students/owl.png' },
  { id: '4', name: 'Дима С.', avatar: '/assets/avatars/students/bear.png' },
  { id: '5', name: 'Полина Т.', avatar: '/assets/avatars/students/bunny.png' },
  { id: '6', name: 'Кирилл М.', avatar: '/assets/avatars/students/squirrel.png' },
  { id: '7', name: 'Алина Д.', avatar: '/assets/avatars/students/hedgehog.png' },
  { id: '8', name: 'Никита Б.', avatar: '/assets/avatars/students/raccoon.png' },
  { id: '9', name: 'Лена О.', avatar: '/assets/avatars/students/owl.png' },
  { id: '10', name: 'Иван З.', avatar: '/assets/avatars/students/bear.png' },
  { id: '11', name: 'Оля Р.', avatar: '/assets/avatars/students/bunny.png' },
  { id: '12', name: 'Егор К.', avatar: '/assets/avatars/students/squirrel.png' },
  { id: '13', name: 'Таня С.', avatar: '/assets/avatars/students/hedgehog.png' },
  { id: '14', name: 'Максим Г.', avatar: '/assets/avatars/students/raccoon.png' },
  { id: '15', name: 'Даша Ф.', avatar: '/assets/avatars/students/owl.png' },
];

export default function TeacherLobby({
  pin = '482915',
  quizTitle = 'Викторина по математике',
  grade = 7,
  onStartQuiz,
}: TeacherLobbyProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [students, setStudents] = useState(CONNECTED_STUDENTS);

  const handleCopyPin = () => {
    haptics.notification('success');
    navigator.clipboard?.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleAddStudent = () => {
    haptics.impact('light');
    const newStudent = {
      id: String(Date.now()),
      name: `Ученик ${students.length + 1}`,
      avatar: '/assets/avatars/students/bunny.png',
    };
    setStudents((prev) => [...prev, newStudent]);
  };

  const digits = pin.split('');

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Комната ожидания</h1>
      </header>

      {/* Quiz Title Pill */}
      <div style={styles.topicBadgeWrapper}>
        <div style={styles.topicBadge}>
          <img
            src="/assets/icons/icon_sprout.svg"
            alt="Росток"
            style={{ width: 16, height: 16 }}
          />
          <span>{quizTitle}, {grade} класс</span>
        </div>
      </div>

      {/* PIN Code Panel */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        style={styles.pinCard}
      >
        <span style={styles.pinCardTitle}>PIN-код для учеников</span>

        <div style={styles.pinRow} onClick={handleCopyPin} title="Нажмите, чтобы скопировать">
          <div style={styles.digitBoxesRow}>
            {digits.map((digit, i) => (
              <div key={i} style={styles.digitBox}>
                <span style={styles.digitChar}>{digit}</span>
              </div>
            ))}
          </div>

          <button style={styles.copyBtn} aria-label="Скопировать PIN">
            {copied ? <Check size={18} color="#10B981" /> : <Copy size={18} color="#9CA3AF" />}
          </button>
        </div>

        {/* Connected Count Indicator */}
        <div style={styles.statusRow}>
          <span style={styles.statusDot} />
          <span style={styles.statusText}>
            Подключились: <strong style={{ color: '#FFFFFF' }}>{students.length} из 30</strong>
          </span>
        </div>
      </motion.div>

      {/* Students Avatar Grid */}
      <div style={styles.avatarsCard}>
        <div style={styles.avatarGrid}>
          {students.map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.03, type: 'spring', stiffness: 500, damping: 22 }}
              style={styles.avatarItem}
              title={student.name}
            >
              <div style={styles.avatarCircle}>
                <img
                  src={student.avatar}
                  alt={student.name}
                  style={styles.avatarImg}
                />
                <span style={styles.avatarOnlineDot} />
              </div>
              <span style={styles.avatarName}>{student.name}</span>
            </motion.div>
          ))}

          {/* Add Student Button */}
          <motion.div
            whileTap={{ scale: 0.9 }}
            onClick={handleAddStudent}
            style={styles.addAvatarBtn}
            title="Пригласить ученика"
          >
            <div style={styles.addCircle}>
              <UserPlus size={20} color="#9CA3AF" />
            </div>
            <span style={styles.avatarName}>Ещё</span>
          </motion.div>
        </div>
      </div>

      {/* Launch Quiz Button */}
      <div style={styles.actionSection}>
        <TactileButton
          theme="green"
          size="lg"
          fullWidth
          onClick={() => {
            haptics.notification('success');
            onStartQuiz?.();
          }}
          iconBefore={<Rocket size={20} />}
        >
          Начать викторину
        </TactileButton>
      </div>

      {/* Bottom Glade with Mascot */}
      <div style={styles.bottomGladeSection}>
        <div style={styles.mascotSpeechBubble}>
          <Sparkles size={14} color="#F59E0B" style={{ flexShrink: 0 }} />
          <span>Все готовы? Тогда поехали!</span>
        </div>

        <div style={styles.mascotWrapper}>
          <img
            src="/assets/mascot/sprint_idle.png"
            alt="Спринт в лесу"
            style={styles.mascotImg}
          />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundImage: "url('/assets/backgrounds/quiz_bg_clean.png')",
    backgroundPosition: 'center top',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    padding: '12px 14px 16px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
    zIndex: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  topicBadgeWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 10,
    zIndex: 3,
  },
  topicBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14, 25, 45, 0.88)',
    border: 'none',
    borderRadius: 999,
    padding: '5px 14px',
    fontSize: 12,
    fontWeight: 700,
    color: '#34D399',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: 'none',
  },
  pinCard: {
    position: 'relative',
    backgroundColor: 'rgba(14, 30, 58, 0.94)',
    border: 'none',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    borderRadius: 24,
    padding: '16px 18px',
    boxShadow: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 3,
  },
  pinCardTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 10,
  },
  pinRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    marginBottom: 12,
  },
  digitBoxesRow: {
    display: 'flex',
    gap: 8,
  },
  digitBox: {
    width: 44,
    height: 54,
    backgroundColor: 'rgba(11, 20, 38, 0.9)',
    border: 'none',
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'none',
  },
  digitChar: {
    fontSize: 28,
    fontWeight: 900,
    color: '#FFFFFF',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
  },
  copyBtn: {
    width: 44,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'none',
    cursor: 'pointer',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  avatarsCard: {
    backgroundColor: 'rgba(14, 25, 45, 0.88)',
    border: 'none',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 22,
    padding: '14px 12px',
    boxShadow: 'none',
    marginBottom: 14,
    zIndex: 3,
  },
  avatarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 10,
    alignItems: 'center',
  },
  avatarItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  avatarCircle: {
    position: 'relative',
    width: 46,
    height: 46,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '85%',
    height: '85%',
    objectFit: 'contain',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: '50%',
    backgroundColor: '#10B981',
    border: '1.5px solid #0D1322',
  },
  avatarName: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: 600,
    textAlign: 'center',
    maxWidth: 54,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  addAvatarBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
  },
  addCircle: {
    width: 46,
    height: 46,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1.5px dashed rgba(255, 255, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSection: {
    marginBottom: 12,
    zIndex: 3,
  },
  bottomGladeSection: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mascotSpeechBubble: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    border: '1.5px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 16,
    padding: '6px 14px',
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  },
  mascotWrapper: {
    width: 95,
    height: 95,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImg: {
    maxHeight: '100%',
    width: 'auto',
    objectFit: 'contain',
    filter: 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.6))',
  },
};
