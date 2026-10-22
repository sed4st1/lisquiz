import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Users,
  Target,
  HelpCircle,
  ChevronRight,
  Camera,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { TactileButton } from '../components/TactileButton';
import { haptics } from '../services/haptics';
import type { Quiz } from '../types/quiz';

export interface TeacherCreateQuizProps {
  onQuizCreated?: (quiz?: Quiz) => void;
  onNavigateToLobby?: () => void;
}

const SUBJECTS = [
  'Математика',
  'Русский язык',
  'Физика',
  'Химия',
  'Биология',
  'История',
  'География',
  'Обществознание',
  'Информатика',
  'Литература',
  'Английский язык',
];

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const QUESTION_COUNTS = [5, 8, 10, 15];

const TOPIC_PRESETS: Record<string, string[]> = {
  'Математика': ['Дроби', 'Линейные уравнения', 'Треугольники', 'Проценты'],
  'Физика': ['Законы Ньютона', 'Сила тяжести', 'Давление', 'Энергия'],
  'Информатика': ['Системы счисления', 'Алгоритмы', 'Базы данных', 'Python'],
  'Русский язык': ['Чередование корней', 'Сложные предложения', 'Н и НН'],
};

export default function TeacherCreateQuiz({
  onQuizCreated,
  onNavigateToLobby,
}: TeacherCreateQuizProps) {
  const [subject, setSubject] = useState<string>('Математика');
  const [grade, setGrade] = useState<number>(7);
  const [topic, setTopic] = useState<string>('Дроби');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isPhotoUploaded, setIsPhotoUploaded] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<'subject' | 'grade' | 'topic' | 'count' | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleStartGeneration = () => {
    haptics.notification('success');
    setIsGenerating(true);

    // Simulate AI generation with Sleeping Fox screen
    setTimeout(() => {
      setIsGenerating(false);
      if (onQuizCreated) {
        onQuizCreated();
      } else if (onNavigateToLobby) {
        onNavigateToLobby();
      }
    }, 2800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      haptics.impact('medium');
      setIsPhotoUploaded(true);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Создание викторины</h1>
      </header>

      {/* Mascot Hero Card */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        style={styles.heroCard}
      >
        <div style={styles.mascotSpeechBubble}>
          <p style={styles.speechText}>
            Привет! Я Спринт. Помогу создать отличную викторину с помощью ИИ!
          </p>
        </div>

        <div style={styles.mascotWrapper}>
          <img
            src="/assets/mascot/sprint_idle.png"
            alt="Спринт"
            style={styles.mascotImage}
          />
        </div>
      </motion.div>

      {/* Interactive Selection Tiles */}
      <div style={styles.tilesContainer}>
        {/* Tile 1: Subject */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            haptics.impact('light');
            setActiveModal('subject');
          }}
          style={styles.tileCard}
        >
          <div style={styles.tileLeft}>
            <div style={{ ...styles.tileIconCircle, backgroundColor: 'rgba(59, 130, 246, 0.22)', color: '#60A5FA' }}>
              <BookOpen size={20} />
            </div>
            <div style={styles.tileTexts}>
              <span style={styles.tileLabel}>Предмет</span>
              <span style={styles.tileValue}>{subject}</span>
            </div>
          </div>
          <ChevronRight size={20} color="#9CA3AF" />
        </motion.div>

        {/* Tile 2: Grade */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            haptics.impact('light');
            setActiveModal('grade');
          }}
          style={styles.tileCard}
        >
          <div style={styles.tileLeft}>
            <div style={{ ...styles.tileIconCircle, backgroundColor: 'rgba(16, 185, 129, 0.22)', color: '#34D399' }}>
              <Users size={20} />
            </div>
            <div style={styles.tileTexts}>
              <span style={styles.tileLabel}>Класс</span>
              <span style={styles.tileValue}>{grade} класс</span>
            </div>
          </div>
          <ChevronRight size={20} color="#9CA3AF" />
        </motion.div>

        {/* Tile 3: FRP Topic */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            haptics.impact('light');
            setActiveModal('topic');
          }}
          style={styles.tileCard}
        >
          <div style={styles.tileLeft}>
            <div style={{ ...styles.tileIconCircle, backgroundColor: 'rgba(245, 158, 11, 0.22)', color: '#FBBF24' }}>
              <Target size={20} />
            </div>
            <div style={styles.tileTexts}>
              <span style={styles.tileLabel}>Тема ФРП</span>
              <span style={styles.tileValue}>{topic}</span>
            </div>
          </div>
          <ChevronRight size={20} color="#9CA3AF" />
        </motion.div>

        {/* Tile 4: Question Count */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            haptics.impact('light');
            setActiveModal('count');
          }}
          style={styles.tileCard}
        >
          <div style={styles.tileLeft}>
            <div style={{ ...styles.tileIconCircle, backgroundColor: 'rgba(139, 92, 246, 0.22)', color: '#A78BFA' }}>
              <HelpCircle size={20} />
            </div>
            <div style={styles.tileTexts}>
              <span style={styles.tileLabel}>Количество вопросов</span>
              <span style={styles.tileValue}>{questionCount}</span>
            </div>
          </div>
          <ChevronRight size={20} color="#9CA3AF" />
        </motion.div>

        {/* Photo Upload Shortcut Card */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            haptics.impact('light');
            fileInputRef.current?.click();
          }}
          style={{
            ...styles.tileCard,
            borderStyle: 'dashed',
            borderColor: isPhotoUploaded ? '#10B981' : 'rgba(255, 255, 255, 0.22)',
            backgroundColor: isPhotoUploaded ? 'rgba(16, 185, 129, 0.12)' : 'rgba(14, 25, 45, 0.6)',
          }}
        >
          <div style={styles.tileLeft}>
            <div style={{ ...styles.tileIconCircle, backgroundColor: isPhotoUploaded ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)', color: isPhotoUploaded ? '#34D399' : '#FFFFFF' }}>
              <Camera size={20} />
            </div>
            <div style={styles.tileTexts}>
              <span style={{ ...styles.tileLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
                {isPhotoUploaded ? (
                  <>
                    Фото загружено
                    <Check size={16} color="#34D399" strokeWidth={3} />
                  </>
                ) : (
                  'Загрузить фото страницы'
                )}
              </span>
              <span style={{ ...styles.tileValue, fontSize: 13, color: '#9CA3AF' }}>
                {isPhotoUploaded ? 'ИИ извлечёт формулы и упражнения' : 'Из учебника или тетради'}
              </span>
            </div>
          </div>
          {isPhotoUploaded ? <Check size={20} color="#10B981" /> : <ChevronRight size={20} color="#9CA3AF" />}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </motion.div>
      </div>

      {/* Primary Action Button */}
      <div style={styles.actionSection}>
        <TactileButton
          theme="orange"
          size="lg"
          fullWidth
          onClick={handleStartGeneration}
          iconAfter={<Sparkles size={20} />}
        >
          Создать с ИИ
        </TactileButton>

        <p style={styles.buttonHint}>
          ИИ подберёт вопросы по теме, уровню и создаст интересную викторину
        </p>
      </div>

      {/* Sleeping Fox AI Generation Modal */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.loadingModalOverlay}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={styles.loadingModalCard}
            >
              {/* Sleeping Fox Illustration */}
              <div style={styles.sleepingFoxWrapper}>
                <img
                  src="/assets/backgrounds/sleep_screen.png"
                  alt="Спящий Спринт"
                  style={styles.sleepingFoxImg}
                />
              </div>

              <h2 style={styles.loadingTitle}>Спринт составляет квиз...</h2>
              <p style={styles.loadingSubtitle}>
                Подбираем интересные задания по теме «{topic}» ({grade} класс) по стандартам ФРП.
              </p>

              {/* Glowing Pulse Bar */}
              <div style={styles.loadingBarTrack}>
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                  style={styles.loadingBarFill}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Selection Sheets */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalBackdrop}
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={styles.modalSheet}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <span style={styles.modalTitle}>
                  {activeModal === 'subject' && 'Выберите предмет'}
                  {activeModal === 'grade' && 'Выберите класс'}
                  {activeModal === 'topic' && 'Выберите тему ФРП'}
                  {activeModal === 'count' && 'Количество вопросов'}
                </span>
                <button onClick={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                  <X size={18} color="#9CA3AF" />
                </button>
              </div>

              {/* Modal Body Items */}
              <div style={styles.modalList}>
                {activeModal === 'subject' &&
                  SUBJECTS.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        haptics.selection();
                        setSubject(item);
                        const presets = TOPIC_PRESETS[item];
                        if (presets && presets[0]) setTopic(presets[0]);
                        setActiveModal(null);
                      }}
                      style={{
                        ...styles.modalOptionBtn,
                        backgroundColor: subject === item ? 'rgba(255, 122, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        borderColor: subject === item ? '#FF7A00' : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <span style={{ color: subject === item ? '#FF7A00' : '#FFFFFF', fontWeight: 700 }}>
                        {item}
                      </span>
                      {subject === item && <Check size={18} color="#FF7A00" />}
                    </button>
                  ))}

                {activeModal === 'grade' &&
                  GRADES.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        haptics.selection();
                        setGrade(item);
                        setActiveModal(null);
                      }}
                      style={{
                        ...styles.modalOptionBtn,
                        backgroundColor: grade === item ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        borderColor: grade === item ? '#10B981' : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <span style={{ color: grade === item ? '#34D399' : '#FFFFFF', fontWeight: 700 }}>
                        {item} класс
                      </span>
                      {grade === item && <Check size={18} color="#34D399" />}
                    </button>
                  ))}

                {activeModal === 'topic' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(TOPIC_PRESETS[subject] || ['Общий повтор', 'Контрольная работа']).map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          haptics.selection();
                          setTopic(item);
                          setActiveModal(null);
                        }}
                        style={{
                          ...styles.modalOptionBtn,
                          backgroundColor: topic === item ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          borderColor: topic === item ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <span style={{ color: topic === item ? '#FBBF24' : '#FFFFFF', fontWeight: 700 }}>
                          {item}
                        </span>
                        {topic === item && <Check size={18} color="#FBBF24" />}
                      </button>
                    ))}
                  </div>
                )}

                {activeModal === 'count' &&
                  QUESTION_COUNTS.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        haptics.selection();
                        setQuestionCount(item);
                        setActiveModal(null);
                      }}
                      style={{
                        ...styles.modalOptionBtn,
                        backgroundColor: questionCount === item ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        borderColor: questionCount === item ? '#8B5CF6' : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <span style={{ color: questionCount === item ? '#A78BFA' : '#FFFFFF', fontWeight: 700 }}>
                        {item} вопросов
                      </span>
                      {questionCount === item && <Check size={18} color="#A78BFA" />}
                    </button>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
    justifyContent: 'space-between',
    backgroundImage: "url('/assets/backgrounds/quiz_bg_clean.png')",
    backgroundPosition: 'center top',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    padding: '12px 14px 18px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
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
  heroCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151F36',
    border: '2px solid #283756',
    borderBottom: '4px solid #1E2B45',
    borderRadius: 24,
    padding: '16px 18px',
    marginBottom: 14,
    zIndex: 3,
  },
  mascotSpeechBubble: {
    flex: 1,
    paddingRight: 10,
  },
  speechText: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#FFFFFF',
    lineHeight: 1.45,
    margin: 0,
  },
  mascotWrapper: {
    width: 90,
    height: 90,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5))',
  },
  tilesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
    zIndex: 3,
  },
  tileCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151F36',
    border: '2px solid #283756',
    borderBottom: '4px solid #1E2B45',
    borderRadius: 20,
    padding: '14px 16px',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  tileLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  tileIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTexts: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  tileLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: 600,
  },
  tileValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: 800,
  },
  actionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 'auto',
    zIndex: 3,
  },
  buttonHint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.3,
  },
  loadingModalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    backgroundColor: 'rgba(8, 13, 26, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: 28,
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
  },
  sleepingFoxWrapper: {
    position: 'relative',
    width: 140,
    height: 140,
    marginBottom: 12,
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  sleepingFoxImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  zzzContainer: {
    position: 'absolute',
    top: '30%',
    right: '25%',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0 0 6px',
  },
  loadingSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    margin: '0 0 16px',
    lineHeight: 1.4,
  },
  loadingBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    overflow: 'hidden',
    position: 'relative',
  },
  loadingBarFill: {
    width: '40%',
    height: '100%',
    background: 'linear-gradient(90deg, #FF7A00, #F59E0B)',
    borderRadius: 999,
    boxShadow: '0 0 10px #FF7A00',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: 'rgba(17, 24, 39, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTop: '1px solid rgba(255, 255, 255, 0.18)',
    padding: '16px 18px 28px',
    boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.6)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    padding: 6,
    cursor: 'pointer',
  },
  modalList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 280,
    overflowY: 'auto',
  },
  modalOptionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
};
