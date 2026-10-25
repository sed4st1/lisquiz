import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Users,
  Target,
  HelpCircle,
  ChevronRight,
  Camera,
  Check,
  X,
  GraduationCap,
  ArrowLeft,
  Edit3,
  Play,
  Trash2,
  Sparkles,
  Search,
  Database,
} from 'lucide-react';
import { TactileButton } from '../components/TactileButton';
import { haptics } from '../services/haptics';
import { roomApi } from '../services/roomApi';
import { classApi, ClassItem } from '../services/classApi';
import { quizStorage, SavedQuiz } from '../services/quizStorage';
import { quizApi, CurriculumTopicItem } from '../services/quizApi';
import QuizQuestionEditorModal from '../components/QuizQuestionEditorModal';

export interface TextbookItem {
  id: string;
  subject: string;
  grade: number;
  author: string;
  title: string;
  publisher?: string;
  chapters_count?: number;
}

export interface ParagraphItem {
  num: number;
  title: string;
  skill_id?: string;
  topic?: string;
  keywords?: string[];
}

export interface BankTopicItem {
  subject: string;
  grade: number;
  topic: string;
  display_name: string;
  count: number;
}

const FALLBACK_TEXTBOOKS: TextbookItem[] = [
  { id: 'peryshkin_phys_7', subject: 'Физика', grade: 7, author: 'Пёрышкин А.В.', title: 'Физика 7 класс', publisher: 'Просвещение', chapters_count: 3 },
  { id: 'vilenkin_math_6', subject: 'Математика', grade: 6, author: 'Виленкин Н.Я.', title: 'Математика 6 класс', publisher: 'Просвещение', chapters_count: 3 },
  { id: 'merzlyak_math_6', subject: 'Математика', grade: 6, author: 'Мерзляк А.Г.', title: 'Математика 6 класс', publisher: 'Вентана-Граф', chapters_count: 2 },
  { id: 'ladyzhenskaya_rus_6', subject: 'Русский язык', grade: 6, author: 'Ладыженская Т.А.', title: 'Русский язык 6 класс', publisher: 'Просвещение', chapters_count: 1 },
  { id: 'makarychev_alg_7', subject: 'Алгебра', grade: 7, author: 'Макарычев Ю.Н.', title: 'Алгебра 7 класс', publisher: 'Просвещение', chapters_count: 2 },
  { id: 'atanasyan_geom_7_9', subject: 'Геометрия', grade: 7, author: 'Атанасян Л.С.', title: 'Геометрия 7–9 класс', publisher: 'Просвещение', chapters_count: 2 },
];

export interface TeacherCreateQuizProps {
  onBack?: () => void;
  onQuizCreated?: (roomData?: any) => void;
  onNavigateToLobby?: () => void;
  initialClassId?: string;
  initialClassName?: string;
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
const QUESTION_COUNTS = [3, 5, 8, 10];

const TOPIC_PRESETS: Record<string, string[]> = {
  'Математика': ['Дроби', 'Линейные уравнения', 'Треугольники', 'Проценты'],
  'Физика': ['Законы Ньютона', 'Сила тяжести', 'Давление', 'Энергия'],
  'Информатика': ['Системы счисления', 'Алгоритмы', 'Базы данных', 'Python'],
  'Русский язык': ['Чередование корней', 'Сложные предложения', 'Н и НН'],
};

export default function TeacherCreateQuiz({
  onBack,
  onQuizCreated,
  onNavigateToLobby,
  initialClassId,
  initialClassName,
}: TeacherCreateQuizProps) {
  // Main view mode: 'create' or 'saved'
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create');

  // Classes state
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  // Saved quizzes state & editor
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>(() => quizStorage.getSavedQuizzes());
  const [editingQuiz, setEditingQuiz] = useState<SavedQuiz | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Creation state
  const [subject, setSubject] = useState<string>('Математика');
  const [grade, setGrade] = useState<number>(7);
  const [topic, setTopic] = useState<string>('Дроби');
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [isPhotoUploaded, setIsPhotoUploaded] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [textbooks, setTextbooks] = useState<TextbookItem[]>(FALLBACK_TEXTBOOKS);
  const [selectedTextbook, setSelectedTextbook] = useState<TextbookItem | null>(null);
  const [selectedParagraph, setSelectedParagraph] = useState<ParagraphItem | null>(null);
  const [inspectingTextbook, setInspectingTextbook] = useState<any | null>(null);
  const [textbookModalStep, setTextbookModalStep] = useState<'books' | 'paragraphs'>('books');
  const [activeModal, setActiveModal] = useState<'subject' | 'grade' | 'topic' | 'count' | 'textbook' | 'class' | null>(null);
  const [bankTopics, setBankTopics] = useState<BankTopicItem[]>([]);
  const [curriculumTopics, setCurriculumTopics] = useState<CurriculumTopicItem[]>([]);
  const [topicSourceTab, setTopicSourceTab] = useState<'frp' | 'bank'>('frp');
  const [topicSearchQuery, setTopicSearchQuery] = useState<string>('');
  const [customTopicInput, setCustomTopicInput] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    quizStorage.syncFromDb().then((list) => {
      if (list && list.length > 0) setSavedQuizzes(list);
    });

    fetch('/api/ml2/textbooks')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.textbooks && d.textbooks.length > 0) {
          setTextbooks(d.textbooks);
        }
      })
      .catch(() => {});

    fetch('/api/quiz/bank/topics')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.topics && d.topics.length > 0) {
          setBankTopics(d.topics);
        }
      })
      .catch(() => {});

    quizApi.getCurriculumTopics().then((list) => {
      if (list && list.length > 0) {
        setCurriculumTopics(list);
      }
    });

    classApi.listClasses()
      .then((list) => {
        if (list && list.length > 0) {
          setClasses(list);
          if (initialClassId) {
            const found = list.find((c) => c.id === initialClassId);
            if (found) setSelectedClass(found);
            else setSelectedClass(list[0]);
          } else if (initialClassName) {
            const found = list.find((c) => c.name === initialClassName);
            if (found) setSelectedClass(found);
            else setSelectedClass(list[0]);
          }
        }
      })
      .catch(() => {});
  }, [initialClassId, initialClassName]);

  const isSubjectMatch = (subjA?: string, subjB?: string) => {
    const a = (subjA || '').trim().toLowerCase();
    const b = (subjB || '').trim().toLowerCase();
    if (a === b) return true;
    if ((a === 'литература' || a === 'литературное чтение') && (b === 'литература' || b === 'литературное чтение')) return true;
    if ((a === 'математика' || a === 'алгебра' || a === 'геометрия') && (b === 'математика' || b === 'алгебра' || b === 'геометрия')) return true;
    if ((a === 'окружающий мир' || a === 'природоведение' || a === 'естествознание') && (b === 'окружающий мир' || b === 'природоведение' || b === 'естествознание')) return true;
    return false;
  };

  const filteredCurriculumTopics = React.useMemo(() => {
    let list = curriculumTopics;
    if (subject) {
      list = list.filter((t) => isSubjectMatch(t.subject, subject));
    }
    if (grade) {
      list = list.filter((t) => t.grade === grade);
    }
    if (topicSearchQuery.trim()) {
      const rawQ = topicSearchQuery.toLowerCase();
      const cleanTokens = rawQ.replace(/[^\w\sа-яё]/gi, ' ').split(/\s+/).filter(Boolean);
      const stopWords = new Set([
        'для', 'по', 'в', 'во', 'на', 'о', 'об', 'обо', 'с', 'со', 'и', 'к', 'ко',
        'из', 'от', 'до', 'за', 'у', 'под', 'над', 'при', 'про',
        'класс', 'класса', 'классы', 'классу', 'классом', 'кл',
        'п', 'пп', 'номер', 'урок', 'урока', 'уроку', 'тема', 'теме', 'тему',
        'тест', 'квиз', 'задание', 'викторина'
      ]);
      const meaningfulTokens = cleanTokens.filter(t => !stopWords.has(t) && !/^\d+$/.test(t));
      const targetTokens = meaningfulTokens.length > 0 ? meaningfulTokens : cleanTokens;

      const direct = list.filter(t => `${t.topic} ${t.section} ${t.description} ${(t.keywords || []).join(' ')}`.toLowerCase().includes(rawQ));
      if (direct.length > 0) {
        list = direct;
      } else {
        const allMatch = list.filter(t => {
          const fullText = `${t.topic} ${t.section} ${t.description} ${(t.keywords || []).join(' ')}`.toLowerCase();
          return targetTokens.every(token => fullText.includes(token));
        });
        if (allMatch.length > 0) {
          list = allMatch;
        } else {
          list = list.filter(t => {
            const fullText = `${t.topic} ${t.section} ${t.description} ${(t.keywords || []).join(' ')}`.toLowerCase();
            return targetTokens.some(token => fullText.includes(token));
          });
        }
      }
    }
    return list;
  }, [curriculumTopics, subject, grade, topicSearchQuery]);

  const filteredBankTopics = React.useMemo(() => {
    let list = bankTopics;
    if (subject) {
      list = list.filter((t) => isSubjectMatch(t.subject, subject));
    }
    if (grade) {
      if (!topicSearchQuery.trim()) {
        const sameGrade = list.filter((t) => t.grade === grade);
        if (sameGrade.length > 0) list = sameGrade;
      }
    }
    if (topicSearchQuery.trim()) {
      const rawQ = topicSearchQuery.toLowerCase();
      const cleanTokens = rawQ.replace(/[^\w\sа-яё]/gi, ' ').split(/\s+/).filter(Boolean);
      const stopWords = new Set([
        'для', 'по', 'в', 'во', 'на', 'о', 'об', 'обо', 'с', 'со', 'и', 'к', 'ко',
        'из', 'от', 'до', 'за', 'у', 'под', 'над', 'при', 'про',
        'класс', 'класса', 'классы', 'классу', 'классом', 'кл',
        'п', 'пп', 'номер', 'урок', 'урока', 'уроку', 'тема', 'теме', 'тему',
        'тест', 'квиз', 'задание', 'викторина'
      ]);
      const meaningfulTokens = cleanTokens.filter(t => !stopWords.has(t) && !/^\d+$/.test(t));
      const targetTokens = meaningfulTokens.length > 0 ? meaningfulTokens : cleanTokens;

      const direct = list.filter(t =>
        t.display_name.toLowerCase().includes(rawQ) ||
        t.topic.toLowerCase().includes(rawQ) ||
        t.subject.toLowerCase().includes(rawQ)
      );
      if (direct.length > 0) {
        list = direct;
      } else {
        const allMatch = list.filter(t => {
          const fullText = `${t.display_name} ${t.topic} ${t.subject}`.toLowerCase();
          return targetTokens.every(token => fullText.includes(token));
        });
        if (allMatch.length > 0) {
          list = allMatch;
        } else {
          list = list.filter(t => {
            const fullText = `${t.display_name} ${t.topic} ${t.subject}`.toLowerCase();
            return targetTokens.some(token => fullText.includes(token));
          });
        }
      }
    }
    return list;
  }, [bankTopics, subject, grade, topicSearchQuery]);

  const handleSelectTextbookForInspection = async (tb: TextbookItem) => {
    haptics.selection();
    setInspectingTextbook(tb);
    setTextbookModalStep('paragraphs');
    try {
      const res = await fetch(`/api/ml2/textbooks/${tb.id}`);
      if (res.ok) {
        const full = await res.json();
        setInspectingTextbook(full);
      }
    } catch {}
  };

  const handleSelectParagraph = (para: ParagraphItem) => {
    haptics.notification('success');
    setSelectedTextbook(inspectingTextbook);
    setSelectedParagraph(para);
    if (inspectingTextbook?.subject) setSubject(inspectingTextbook.subject);
    if (inspectingTextbook?.grade) setGrade(inspectingTextbook.grade);
    setTopic(`§ ${para.num}. ${para.title}`);
    setActiveModal(null);
  };

  const handleGenerateQuizWithAI = async () => {
    haptics.notification('success');
    setIsGenerating(true);

    try {
      const isTbValid =
        selectedTextbook &&
        selectedParagraph;

      const generated = await quizApi.generateQuiz({
        subject: selectedTextbook?.subject || subject,
        grade: selectedTextbook?.grade || grade,
        topic: selectedParagraph ? `§ ${selectedParagraph.num}. ${selectedParagraph.title}` : topic,
        question_count: questionCount,
        textbook_id: isTbValid ? selectedTextbook.id : undefined,
        paragraph_num: isTbValid ? selectedParagraph.num : undefined,
      });

      if (generated && generated.questions && generated.questions.length > 0) {
        try {
          await quizApi.saveQuiz(generated);
        } catch (e) {
          console.warn('Auto-save generated quiz notice:', e);
        }
        const updatedList = quizStorage.upsertQuiz(generated);
        quizStorage.setActiveQuiz(generated.id);
        setSavedQuizzes(updatedList);
        setEditingQuiz(generated);
        setIsEditorOpen(true);
      }
    } catch (err: any) {
      console.error('Failed to generate quiz with AI:', err);
      alert('Ошибка при генерации теста: ' + (err?.message || 'попробуйте ещё раз'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartGeneration = async () => {
    haptics.notification('success');
    setIsGenerating(true);

    try {
      const isTbValid =
        selectedTextbook &&
        selectedParagraph &&
        selectedTextbook.subject?.toLowerCase() === subject.toLowerCase();

      const roomData = await roomApi.createRoom({
        subject,
        grade,
        topic,
        question_count: questionCount,
        textbook_id: isTbValid ? selectedTextbook.id : undefined,
        paragraph_num: isTbValid ? selectedParagraph.num : undefined,
        class_id: selectedClass?.id,
      });

      if (roomData && roomData.quiz) {
        const rawTitle = roomData.quiz_title || roomData.quiz.title || `${subject}: ${topic}`;
        const cleanTitle = rawTitle.replace(/\s*\((?:ФГОС(?:\/ФРП)?|ФРП)\)/g, '').trim();
        const newQuiz: SavedQuiz = {
          id: `quiz_${Date.now()}`,
          title: cleanTitle,
          subject: roomData.subject || roomData.quiz.subject || subject,
          grade: roomData.grade || roomData.quiz.grade || grade,
          topic: roomData.quiz.topic || topic,
          group_label: selectedClass ? selectedClass.name : `${grade} класс`,
          is_active: true,
          updated_at: new Date().toISOString(),
          questions: roomData.quiz.questions || [],
        };
        const updatedList = quizStorage.upsertQuiz(newQuiz);
        quizStorage.setActiveQuiz(newQuiz.id);
        setSavedQuizzes(updatedList);
        try {
          await quizApi.saveQuiz(newQuiz);
        } catch (e) {
          console.warn('Failed to save generated quiz to DB:', e);
        }
      }

      setIsGenerating(false);
      if (onQuizCreated) {
        onQuizCreated(roomData);
      } else if (onNavigateToLobby) {
        onNavigateToLobby();
      }
    } catch (err) {
      console.error('Failed to create room:', err);
      setTimeout(() => {
        setIsGenerating(false);
        onQuizCreated?.();
      }, 400);
    }
  };

  const handleCreateManualQuiz = () => {
    haptics.impact('medium');
    const newQuiz: SavedQuiz = {
      id: `quiz_custom_${Date.now()}`,
      title: topic ? `${subject}: ${topic}` : `Викторина по ${subject}`,
      subject: subject,
      grade: grade,
      topic: topic || 'Новая тема',
      group_label: selectedClass ? selectedClass.name : `${grade} класс`,
      is_active: false,
      updated_at: new Date().toISOString(),
      questions: [
        {
          id: 1,
          text: 'Текст первого вопроса',
          explanation: '',
          time_limit_sec: 20,
          tier: 1,
          is_boss: false,
          topic: topic || 'Тема',
          options: [
            { id: 1, text: 'Правильный ответ', is_correct: true },
            { id: 2, text: 'Вариант 2', is_correct: false },
            { id: 3, text: 'Вариант 3', is_correct: false },
            { id: 4, text: 'Вариант 4', is_correct: false },
          ],
        },
      ],
    };
    const list = quizStorage.upsertQuiz(newQuiz);
    setSavedQuizzes(list);
    setEditingQuiz(newQuiz);
    setIsEditorOpen(true);
  };

  const handleLaunchSavedQuiz = async (quiz: SavedQuiz) => {
    haptics.notification('success');
    setIsGenerating(true);

    try {
      const roomData = await roomApi.createRoom({
        quiz,
        subject: quiz.subject,
        grade: quiz.grade,
        topic: quiz.topic,
        question_count: quiz.questions?.length || 5,
        class_id: selectedClass?.id,
      });

      setTimeout(() => {
        setIsGenerating(false);
        if (onQuizCreated) {
          onQuizCreated(roomData);
        } else if (onNavigateToLobby) {
          onNavigateToLobby();
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to launch saved quiz:', err);
      setTimeout(() => {
        setIsGenerating(false);
        onQuizCreated?.();
      }, 1000);
    }
  };

  const handleSaveEditedQuiz = async (updated: SavedQuiz) => {
    const list = quizStorage.upsertQuiz(updated);
    quizStorage.setActiveQuiz(updated.id);
    setSavedQuizzes(list);
    try {
      await quizApi.saveQuiz(updated);
    } catch (e) {
      console.warn('Failed to save edited quiz to DB:', e);
    }
    setIsEditorOpen(false);
    setEditingQuiz(null);
    setActiveTab('saved');
    haptics.notification('success');
  };

  const handleDeleteQuiz = (id: string) => {
    const list = quizStorage.deleteQuiz(id);
    setSavedQuizzes(list);
    haptics.notification('success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      haptics.impact('medium');
      setIsPhotoUploaded(true);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        {onBack && (
          <button onClick={onBack} style={styles.backBtn} title="Назад">
            <ArrowLeft size={18} color="#FFFFFF" />
          </button>
        )}
        <h1 style={styles.headerTitle}>Викторины</h1>
        <div style={{ width: 36 }} />
      </header>

      {/* Segmented Control: Создать / Мои викторины */}
      <div style={styles.tabToggleBox}>
        <button
          onClick={() => {
            haptics.selection();
            setActiveTab('create');
          }}
          style={{
            ...styles.tabBtn,
            backgroundColor: activeTab === 'create' ? '#FF7A00' : 'transparent',
            color: activeTab === 'create' ? '#FFFFFF' : '#9CA3AF',
          }}
        >
          Создать викторину
        </button>
        <button
          onClick={() => {
            haptics.selection();
            setActiveTab('saved');
          }}
          style={{
            ...styles.tabBtn,
            backgroundColor: activeTab === 'saved' ? '#FF7A00' : 'transparent',
            color: activeTab === 'saved' ? '#FFFFFF' : '#9CA3AF',
          }}
        >
          Мои викторины ({savedQuizzes.length})
        </button>
      </div>

      {/* ========================================================
          TAB 1: СОЗДАНИЕ ВИКТОРИНЫ
         ======================================================== */}
      {activeTab === 'create' && (
        <div style={styles.tabBody}>
          <div style={styles.tilesContainer}>
            {/* Tile: Класс */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                haptics.impact('light');
                setActiveModal('class');
              }}
              style={{
                ...styles.tileCard,
                borderColor: selectedClass ? '#3B82F6' : '#283756',
              }}
            >
              <div style={styles.tileLeft}>
                <div style={{ ...styles.tileIconCircle, backgroundColor: 'rgba(59, 130, 246, 0.22)', color: '#60A5FA' }}>
                  <Users size={20} />
                </div>
                <div style={styles.tileTexts}>
                  <span style={styles.tileLabel}>Класс</span>
                  <span style={{ ...styles.tileValue, color: selectedClass ? '#60A5FA' : '#9CA3AF' }}>
                    {selectedClass ? `${selectedClass.name} (${selectedClass.subject})` : 'Без привязки к классу'}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} color="#9CA3AF" />
            </motion.div>

            {/* Tile: Учебник РФ и параграф */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                haptics.impact('light');
                setTextbookModalStep('books');
                setActiveModal('textbook');
              }}
              style={{
                ...styles.tileCard,
                borderColor: selectedParagraph ? '#EC4899' : '#283756',
              }}
            >
              <div style={styles.tileLeft}>
                <div style={{ ...styles.tileIconCircle, backgroundColor: 'rgba(236, 72, 153, 0.22)', color: '#F472B6' }}>
                  <GraduationCap size={20} />
                </div>
                <div style={styles.tileTexts}>
                  <span style={styles.tileLabel}>Учебник и параграф</span>
                  <span style={{ ...styles.tileValue, color: selectedParagraph ? '#F472B6' : '#FFFFFF' }}>
                    {selectedParagraph
                      ? `${selectedTextbook?.author?.split(' ')[0] || ''} § ${selectedParagraph.num}. ${selectedParagraph.title}`
                      : 'Выбрать из каталога'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {selectedParagraph && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTextbook(null);
                      setSelectedParagraph(null);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: 8,
                      padding: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Сбросить учебник"
                  >
                    <X size={16} color="#EF4444" />
                  </button>
                )}
                <ChevronRight size={20} color="#9CA3AF" />
              </div>
            </motion.div>

            {/* Tile: Предмет */}
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

            {/* Tile: Класс (параллель) */}
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
                  <span style={styles.tileLabel}>Параллель</span>
                  <span style={styles.tileValue}>{grade} класс</span>
                </div>
              </div>
              <ChevronRight size={20} color="#9CA3AF" />
            </motion.div>

            {/* Tile: Тема */}
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
                  <span style={styles.tileLabel}>Тема</span>
                  <span style={styles.tileValue}>{topic}</span>
                </div>
              </div>
              <ChevronRight size={20} color="#9CA3AF" />
            </motion.div>

            {/* Tile: Количество вопросов */}
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
                  <span style={styles.tileLabel}>Вопросов</span>
                  <span style={styles.tileValue}>{questionCount}</span>
                </div>
              </div>
              <ChevronRight size={20} color="#9CA3AF" />
            </motion.div>

            {/* Фото страницы */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                haptics.impact('light');
                fileInputRef.current?.click();
              }}
              style={{
                ...styles.tileCard,
                borderStyle: 'dashed',
                borderColor: isPhotoUploaded ? '#10B981' : 'rgba(255, 255, 255, 0.2)',
              }}
            >
              <div style={styles.tileLeft}>
                <div style={{ ...styles.tileIconCircle, backgroundColor: isPhotoUploaded ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)' }}>
                  <Camera size={20} color={isPhotoUploaded ? '#34D399' : '#FFFFFF'} />
                </div>
                <div style={styles.tileTexts}>
                  <span style={styles.tileLabel}>
                    {isPhotoUploaded ? 'Фото загружено ✓' : 'Фото страницы'}
                  </span>
                  <span style={{ ...styles.tileValue, fontSize: 12, color: '#9CA3AF' }}>
                    {isPhotoUploaded ? 'Задания распознаны' : 'Из учебника или тетради'}
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

          {/* Verified Question Bank Banner (Anti-AI Bento Card) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'rgba(255, 122, 0, 0.08)',
              border: '1px solid rgba(255, 122, 0, 0.25)',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255, 122, 0, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FF7A00',
                }}
              >
                <Database size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>
                  Банк Lisquiz: 6 313 проверенных задач
                </span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  0 мс генерация • 0 галлюцинаций • Базовый, средний и босс-вопросы
                </span>
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#34D399',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                padding: '3px 8px',
                borderRadius: 999,
              }}
            >
              10 предметов
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.submitSection}>
            <div style={styles.dualSubmitRow}>
              <TactileButton
                theme="orange"
                size="lg"
                fullWidth
                disabled={isGenerating}
                onClick={handleGenerateQuizWithAI}
                iconBefore={<Sparkles size={18} />}
              >
                {isGenerating ? 'ИИ создаёт вопросы...' : '✨ Сгенерировать викторину с ИИ'}
              </TactileButton>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
                <TactileButton
                  theme="green"
                  size="md"
                  fullWidth
                  disabled={isGenerating}
                  onClick={handleStartGeneration}
                  iconBefore={<Play size={16} />}
                >
                  🚀 Запуск в игру
                </TactileButton>

                <TactileButton
                  theme="blue"
                  size="md"
                  fullWidth
                  disabled={isGenerating}
                  onClick={handleCreateManualQuiz}
                  iconBefore={<Edit3 size={16} />}
                >
                  Собрать вручную
                </TactileButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: МОИ ВИКТОРИНЫ (ПРОСМОТР И РЕДАКТИРОВАНИЕ)
         ======================================================== */}
      {activeTab === 'saved' && (
        <div style={styles.tabBody}>
          {savedQuizzes.length === 0 ? (
            <div style={styles.emptyBox}>
              <p style={styles.emptyText}>У вас пока нет сохранённых викторин</p>
              <button
                onClick={() => setActiveTab('create')}
                style={styles.emptyBtn}
              >
                Создать викторину
              </button>
            </div>
          ) : (
            <div style={styles.quizzesList}>
              {savedQuizzes.map((quiz) => (
                <div key={quiz.id} style={styles.quizCard}>
                  <div style={styles.quizCardTop}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={styles.quizCardTitle}>{quiz.title}</h3>
                      <div style={styles.quizCardMeta}>
                        <span>{quiz.subject}</span>
                        <span>•</span>
                        <span>{quiz.grade} кл</span>
                        <span>•</span>
                        <span>{quiz.questions?.length || 0} вопр.</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      style={styles.deleteBtn}
                      title="Удалить"
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </button>
                  </div>

                  <div style={styles.quizCardActions}>
                    <button
                      onClick={() => {
                        haptics.impact('light');
                        setEditingQuiz(quiz);
                        setIsEditorOpen(true);
                      }}
                      style={styles.editBtn}
                    >
                      <Edit3 size={15} />
                      <span>Редактировать</span>
                    </button>

                    <button
                      onClick={() => handleLaunchSavedQuiz(quiz)}
                      style={styles.playBtn}
                    >
                      <Play size={15} fill="#FFFFFF" />
                      <span>Запустить</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Question Editor Modal */}
      {isEditorOpen && editingQuiz && (
        <QuizQuestionEditorModal
          quiz={editingQuiz}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingQuiz(null);
          }}
          onSave={handleSaveEditedQuiz}
        />
      )}

      {/* Selection Sheets / Modals */}
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
                  {activeModal === 'class' && 'Выбор класса'}
                  {activeModal === 'subject' && 'Предмет'}
                  {activeModal === 'grade' && 'Класс'}
                  {activeModal === 'topic' && 'Тема'}
                  {activeModal === 'count' && 'Количество вопросов'}
                  {activeModal === 'textbook' && (textbookModalStep === 'books' ? 'Каталог учебников' : 'Выбор параграфа')}
                </span>
                <button onClick={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                  <X size={18} color="#9CA3AF" />
                </button>
              </div>

              <div style={styles.modalList}>
                {/* Modal: Class */}
                {activeModal === 'class' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={() => {
                        haptics.selection();
                        setSelectedClass(null);
                        setActiveModal(null);
                      }}
                      style={{
                        ...styles.modalOptionBtn,
                        backgroundColor: !selectedClass ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        borderColor: !selectedClass ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <span style={{ color: '#FFFFFF', fontWeight: 700 }}>Без привязки к классу</span>
                      {!selectedClass && <Check size={18} color="#3B82F6" />}
                    </button>

                    {classes.map((cls) => {
                      const isSel = selectedClass?.id === cls.id;
                      return (
                        <button
                          key={cls.id}
                          onClick={() => {
                            haptics.selection();
                            setSelectedClass(cls);
                            setSubject(cls.subject);
                            setGrade(cls.grade);
                            setActiveModal(null);
                          }}
                          style={{
                            ...styles.modalOptionBtn,
                            backgroundColor: isSel ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            borderColor: isSel ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div>
                            <span style={{ color: '#FFFFFF', fontWeight: 700, display: 'block' }}>
                              {cls.name} — {cls.subject}
                            </span>
                            <span style={{ color: '#9CA3AF', fontSize: 11 }}>
                              {cls.grade} класс • Код {cls.invite_code}
                            </span>
                          </div>
                          {isSel && <Check size={18} color="#3B82F6" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Modal: Textbooks */}
                {activeModal === 'textbook' && (
                  <div>
                    {textbookModalStep === 'paragraphs' && inspectingTextbook ? (
                      <div>
                        <button
                          onClick={() => setTextbookModalStep('books')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#9CA3AF',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 700,
                            padding: '4px 0 12px',
                          }}
                        >
                          <ArrowLeft size={16} /> Назад к учебникам
                        </button>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                          {inspectingTextbook.sections?.map((sec: any, sIdx: number) => (
                            <div key={sIdx} style={{ marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 4 }}>
                                {sec.chapter}
                              </span>
                              {sec.paragraphs?.map((p: ParagraphItem) => (
                                <button
                                  key={p.num}
                                  onClick={() => handleSelectParagraph(p)}
                                  style={{ ...styles.modalOptionBtn, marginBottom: 4 }}
                                >
                                  <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13 }}>
                                    § {p.num}. {p.title}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                        {textbooks.map((tb) => {
                          const isSubjectMatch = !subject || tb.subject.toLowerCase() === subject.toLowerCase() ||
                            (subject === 'Математика' && (tb.subject === 'Алгебра' || tb.subject === 'Геометрия')) ||
                            (subject === 'Алгебра' && tb.subject === 'Математика') ||
                            (subject === 'Геометрия' && tb.subject === 'Математика');
                          return (
                            <button
                              key={tb.id}
                              onClick={() => handleSelectTextbookForInspection(tb)}
                              style={{
                                ...styles.modalOptionBtn,
                                borderColor: isSubjectMatch ? 'rgba(59, 130, 246, 0.45)' : 'rgba(255, 255, 255, 0.1)',
                                backgroundColor: isSubjectMatch ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                              }}
                            >
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
                                    {tb.title}
                                  </span>
                                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, backgroundColor: '#1E293B', color: '#60A5FA', fontWeight: 800 }}>
                                    {tb.subject}
                                  </span>
                                </div>
                                <span style={{ color: '#9CA3AF', fontSize: 11 }}>
                                  {tb.author} • {tb.grade} класс
                                </span>
                              </div>
                              <ChevronRight size={18} color="#9CA3AF" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Modal: Subject */}
                {activeModal === 'subject' &&
                  SUBJECTS.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        haptics.selection();
                        setSubject(item);
                        setSelectedTextbook(null);
                        setSelectedParagraph(null);
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

                {/* Modal: Grade */}
                {activeModal === 'grade' &&
                  GRADES.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        haptics.selection();
                        setGrade(item);
                        if (selectedTextbook && selectedTextbook.grade !== item) {
                          setSelectedTextbook(null);
                          setSelectedParagraph(null);
                        }
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

                {/* Modal: Topic with FRP edsoo.ru & Bank Search */}
                {activeModal === 'topic' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Live search input */}
                    <div style={{ position: 'relative', width: '100%' }}>
                      <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 11 }} />
                      <input
                        type="text"
                        value={topicSearchQuery}
                        onChange={(e) => setTopicSearchQuery(e.target.value)}
                        placeholder="Поиск по темам ФРП (edsoo.ru) и банку..."
                        style={{
                          width: '100%',
                          padding: '8px 34px 8px 34px',
                          borderRadius: 10,
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#FFFFFF',
                          fontSize: 13,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      {topicSearchQuery && (
                        <button
                          onClick={() => setTopicSearchQuery('')}
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            background: 'none',
                            border: 'none',
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            padding: 2,
                          }}
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    {/* Source Switcher: FRP edsoo.ru vs Question Bank */}
                    <div style={{ display: 'flex', gap: 6, backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: 4, borderRadius: 10 }}>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          setTopicSourceTab('frp');
                        }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '6px 8px',
                          borderRadius: 7,
                          border: 'none',
                          backgroundColor: topicSourceTab === 'frp' ? '#FF7A00' : 'transparent',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <GraduationCap size={14} />
                        <span>ФРП edsoo.ru</span>
                        <span style={{ fontSize: 10, opacity: 0.8, backgroundColor: 'rgba(0, 0, 0, 0.25)', padding: '1px 5px', borderRadius: 4 }}>
                          {filteredCurriculumTopics.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          setTopicSourceTab('bank');
                        }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '6px 8px',
                          borderRadius: 7,
                          border: 'none',
                          backgroundColor: topicSourceTab === 'bank' ? '#FF7A00' : 'transparent',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Database size={14} />
                        <span>Банк заданий</span>
                        <span style={{ fontSize: 10, opacity: 0.8, backgroundColor: 'rgba(0, 0, 0, 0.25)', padding: '1px 5px', borderRadius: 4 }}>
                          {filteredBankTopics.length}
                        </span>
                      </button>
                    </div>

                    {/* Custom Topic Input */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        value={customTopicInput}
                        onChange={(e) => setCustomTopicInput(e.target.value)}
                        placeholder="Или введите свою тему вручную..."
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: 8,
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#FFFFFF',
                          fontSize: 12,
                          outline: 'none',
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customTopicInput.trim()) {
                            setTopic(customTopicInput.trim());
                            setActiveModal(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customTopicInput.trim()) {
                            setTopic(customTopicInput.trim());
                            setActiveModal(null);
                          }
                        }}
                        disabled={!customTopicInput.trim()}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 8,
                          backgroundColor: customTopicInput.trim() ? '#FF7A00' : 'rgba(255, 255, 255, 0.1)',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: customTopicInput.trim() ? 'pointer' : 'default',
                        }}
                      >
                        ОК
                      </button>
                    </div>

                    {/* Content List based on active tab */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                      {topicSourceTab === 'frp' ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Темы по стандарту РФ ({subject}, {grade} класс)
                            </span>
                            <span style={{ fontSize: 9, color: '#34D399', fontWeight: 700, backgroundColor: 'rgba(52, 211, 153, 0.12)', padding: '1px 5px', borderRadius: 4 }}>
                              ФРП Минпросвещения
                            </span>
                          </div>

                          {filteredCurriculumTopics.length > 0 ? (
                            filteredCurriculumTopics.map((ct) => {
                              const isSel = topic.toLowerCase() === ct.topic.toLowerCase();
                              return (
                                <button
                                  key={ct.id}
                                  onClick={() => {
                                    haptics.notification('success');
                                    setTopic(ct.topic);
                                    setActiveModal(null);
                                  }}
                                  style={{
                                    ...styles.modalOptionBtn,
                                    backgroundColor: isSel ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                    borderColor: isSel ? '#F59E0B' : 'rgba(255, 255, 255, 0.08)',
                                  }}
                                >
                                  <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                      <span style={{ color: isSel ? '#FBBF24' : '#FFFFFF', fontWeight: 700, fontSize: 13 }}>
                                        {ct.topic}
                                      </span>
                                      {ct.has_cas && (
                                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', fontWeight: 800 }}>
                                          CAS SymPy
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                      <span style={{ color: '#F59E0B', fontSize: 10, fontWeight: 600 }}>
                                        {ct.section}
                                      </span>
                                    </div>
                                    <span style={{ color: '#9CA3AF', fontSize: 11, lineHeight: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                      {ct.description}
                                    </span>
                                  </div>
                                  {isSel && <Check size={18} color="#FBBF24" style={{ flexShrink: 0, marginLeft: 8 }} />}
                                </button>
                              );
                            })
                          ) : (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
                              По запросу ничего не найдено в программе {grade} класса
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                            Проверенные темы из банка ({filteredBankTopics.length})
                          </span>

                          {filteredBankTopics.length > 0 ? (
                            filteredBankTopics.map((bt, idx) => {
                              const isSel = topic.toLowerCase() === bt.display_name.toLowerCase() || topic.toLowerCase() === bt.topic.toLowerCase();
                              return (
                                <button
                                  key={`${bt.topic}_${bt.grade}_${idx}`}
                                  onClick={() => {
                                    haptics.selection();
                                    setTopic(bt.display_name || bt.topic);
                                    setGrade(bt.grade);
                                    setActiveModal(null);
                                  }}
                                  style={{
                                    ...styles.modalOptionBtn,
                                    backgroundColor: isSel ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                    borderColor: isSel ? '#F59E0B' : 'rgba(255, 255, 255, 0.08)',
                                  }}
                                >
                                  <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                      <span style={{ color: isSel ? '#FBBF24' : '#FFFFFF', fontWeight: 700, fontSize: 13 }}>
                                        {bt.display_name || bt.topic}
                                      </span>
                                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', fontWeight: 800 }}>
                                        {bt.count} зад.
                                      </span>
                                    </div>
                                    <span style={{ color: '#9CA3AF', fontSize: 11 }}>
                                      {bt.subject} • {bt.grade} класс
                                    </span>
                                  </div>
                                  {isSel && <Check size={18} color="#FBBF24" style={{ flexShrink: 0, marginLeft: 8 }} />}
                                </button>
                              );
                            })
                          ) : (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
                              Темы в банке не найдены
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Modal: Count */}
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
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
    padding: '12px 14px 80px',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
  },
  tabToggleBox: {
    display: 'flex',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  tabBtn: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 11,
    border: 'none',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transition: 'all 0.15s ease',
  },
  tabBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  tilesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  tileCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: 16,
    backgroundColor: '#151F36',
    border: '1.5px solid #283756',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  tileLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  tileIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tileTexts: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  tileLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: 600,
  },
  tileValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  submitSection: {
    marginTop: 12,
  },
  dualSubmitRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    width: '100%',
  },
  quizzesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  quizCard: {
    backgroundColor: '#151F36',
    border: '1.5px solid #283756',
    borderRadius: 16,
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  quizCardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  quizCardTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0 0 4px',
  },
  quizCardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 600,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    padding: 6,
    cursor: 'pointer',
    opacity: 0.7,
  },
  quizCardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '9px 12px',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  playBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '9px 12px',
    borderRadius: 12,
    backgroundColor: '#FF7A00',
    border: 'none',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(255, 122, 0, 0.35)',
  },
  emptyBox: {
    textAlign: 'center',
    padding: '40px 16px',
    backgroundColor: '#151F36',
    borderRadius: 18,
    border: '1px solid #283756',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
  },
  emptyBtn: {
    padding: '10px 20px',
    borderRadius: 12,
    backgroundColor: '#FF7A00',
    color: '#FFFFFF',
    border: 'none',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(6px)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    textAlign: 'left',
  },
};
