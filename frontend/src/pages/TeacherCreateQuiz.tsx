import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Edit3,
  X,
  Play,
  Trash2,
  CheckCircle2,
  Check,
  BookOpen,
  ChevronRight,
  Database,
  GraduationCap,
} from 'lucide-react';
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
  initialTab?: 'create' | 'saved';
}

export interface SubjectConfig {
  name: string;
  iconSrc: string;
  gradient: string;
  shadow: string;
  border: string;
  lightBg: string;
}

export const SUBJECTS = [
  'Математика',
  'Русский язык',
  'Литература',
  'Окружающий мир',
  'Физика',
  'Химия',
  'Биология',
  'История',
  'Обществознание',
  'География',
  'Информатика',
  'Английский язык',
  'Алгебра',
  'Геометрия',
  'Вероятность и статистика',
];

export const SUBJECT_CONFIGS: Record<string, SubjectConfig> = {
  'Физика': {
    name: 'Физика',
    iconSrc: '/assets/subjects/physics.png',
    gradient: 'linear-gradient(180deg, #FFC533 0%, #FFAA00 100%)',
    shadow: '0 4px 0 #D48800',
    border: '#FFE082',
    lightBg: '#FFF7E6',
  },
  'Математика': {
    name: 'Математика',
    iconSrc: '/assets/subjects/math.png',
    gradient: 'linear-gradient(180deg, #4DA3FF 0%, #2B7CE9 100%)',
    shadow: '0 4px 0 #1D5BB5',
    border: '#93C5FD',
    lightBg: '#EFF6FF',
  },
  'Литература': {
    name: 'Литература',
    iconSrc: '/assets/subjects/literature.png',
    gradient: 'linear-gradient(180deg, #B875FF 0%, #9340EB 100%)',
    shadow: '0 4px 0 #6C22B8',
    border: '#D8B4FE',
    lightBg: '#FAF5FF',
  },
  'Русский язык': {
    name: 'Русский язык',
    iconSrc: '/assets/subjects/russian.png',
    gradient: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
    shadow: '0 4px 0 #B45309',
    border: '#FDE68A',
    lightBg: '#FFFBEB',
  },
  'Химия': {
    name: 'Химия',
    iconSrc: '/assets/subjects/chemistry.png',
    gradient: 'linear-gradient(180deg, #FB7185 0%, #E11D48 100%)',
    shadow: '0 4px 0 #9F1239',
    border: '#FECDD3',
    lightBg: '#FFF1F2',
  },
  'Биология': {
    name: 'Биология',
    iconSrc: '/assets/subjects/biology.png',
    gradient: 'linear-gradient(180deg, #34D399 0%, #059669 100%)',
    shadow: '0 4px 0 #047857',
    border: '#A7F3D0',
    lightBg: '#ECFDF5',
  },
  'География': {
    name: 'География',
    iconSrc: '/assets/subjects/geography.png',
    gradient: 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)',
    shadow: '0 4px 0 #0369A1',
    border: '#BAE6FD',
    lightBg: '#F0F9FF',
  },
  'История': {
    name: 'История',
    iconSrc: '/assets/subjects/history.png',
    gradient: 'linear-gradient(180deg, #FBBF24 0%, #D97706 100%)',
    shadow: '0 4px 0 #B45309',
    border: '#FDE68A',
    lightBg: '#FFFBEB',
  },
  'Информатика': {
    name: 'Информатика',
    iconSrc: '/assets/subjects/informatics.png',
    gradient: 'linear-gradient(180deg, #2DD4BF 0%, #0D9488 100%)',
    shadow: '0 4px 0 #0F766E',
    border: '#99F6E4',
    lightBg: '#F0FDFA',
  },
  'Обществознание': {
    name: 'Обществознание',
    iconSrc: '/assets/subjects/social.png',
    gradient: 'linear-gradient(180deg, #FCD34D 0%, #D97706 100%)',
    shadow: '0 4px 0 #B45309',
    border: '#FEF08A',
    lightBg: '#FEFCE8',
  },
  'Английский язык': {
    name: 'Английский язык',
    iconSrc: '/assets/subjects/english.png',
    gradient: 'linear-gradient(180deg, #F87171 0%, #DC2626 100%)',
    shadow: '0 4px 0 #991B1B',
    border: '#FECACA',
    lightBg: '#FEF2F2',
  },
  'Алгебра': {
    name: 'Алгебра',
    iconSrc: '/assets/subjects/math.png',
    gradient: 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)',
    shadow: '0 4px 0 #0369A1',
    border: '#BAE6FD',
    lightBg: '#F0F9FF',
  },
  'Геометрия': {
    name: 'Геометрия',
    iconSrc: '/assets/subjects/math.png',
    gradient: 'linear-gradient(180deg, #818CF8 0%, #4F46E5 100%)',
    shadow: '0 4px 0 #3730A3',
    border: '#C7D2FE',
    lightBg: '#EEF2FF',
  },
  'Вероятность и статистика': {
    name: 'Вероятность и статистика',
    iconSrc: '/assets/subjects/math.png',
    gradient: 'linear-gradient(180deg, #C084FC 0%, #9333EA 100%)',
    shadow: '0 4px 0 #7E22CE',
    border: '#E9D5FF',
    lightBg: '#FAF5FF',
  },
  'Окружающий мир': {
    name: 'Окружающий мир',
    iconSrc: '/assets/subjects/biology.png',
    gradient: 'linear-gradient(180deg, #4ADE80 0%, #16A34A 100%)',
    shadow: '0 4px 0 #15803D',
    border: '#BBF7D0',
    lightBg: '#F0FDF4',
  },
};

const SUBJECT_KEYS = Object.keys(SUBJECT_CONFIGS);
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const QUESTION_COUNTS = [3, 5, 8, 10];

const TOPIC_PRESETS: Record<string, string[]> = {
  'Математика': ['Обыкновенные дроби', 'Линейные уравнения', 'Треугольники', 'Проценты'],
  'Алгебра': ['Квадратные уравнения', 'Производная функции', 'Тригонометрические уравнения', 'Логарифмы'],
  'Геометрия': ['Теорема Пифагора', 'Признаки равенства треугольников', 'Многогранники', 'Площадь фигур'],
  'Вероятность и статистика': ['Классическая вероятность', 'Среднее арифметическое', 'Комбинаторика'],
  'Физика': ['Законы Ньютона', 'Закон Ома', 'Давление и сила Архимеда', 'Электромагнитная индукция'],
  'Химия': ['Периодический закон', 'Электролитическая диссоциация', 'Углеводороды', 'Оксиды и кислоты'],
  'Биология': ['Строение клетки', 'Фотосинтез', 'Законы Менделя', 'Эволюция человека'],
  'Информатика': ['Системы счисления', 'Алгоритмы на Python', 'Базы данных и SQL', 'Математическая логика'],
  'Русский язык': ['Чередование корней', 'Сложные предложения', 'Правописание Н и НН', 'Спряжение глаголов'],
  'Литература': ['Мир сказок', 'Евгений Онегин', 'Война и мир', 'Серебряный век'],
  'История': ['Древняя Русь', 'Эпоха Петра I', 'Отечественная война 1812 года', 'Великая Отечественная война'],
  'Обществознание': ['Формы государства', 'Спрос и предложение', 'Конституция РФ', 'Права человека'],
  'География': ['Географические координаты', 'Природные зоны России', 'Страны мира', 'ТЭК России'],
  'Английский язык': ['Present Simple', 'Past Simple', 'Passive Voice', 'Conditionals'],
  'Окружающий мир': ['Времена года', 'Красная книга', 'Строение тела человека', 'Наша Родина Россия'],
};

export function formatQuestionsCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} вопросов`;
  if (mod10 === 1) return `${count} вопрос`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} вопроса`;
  return `${count} вопросов`;
}

export const INITIAL_STARTER_QUIZZES: SavedQuiz[] = [
  {
    id: 'starter_phys_1',
    title: 'Кинетическая энергия',
    subject: 'Физика',
    grade: 5,
    topic: 'Кинетическая энергия',
    group_label: '5 класс',
    is_active: true,
    updated_at: new Date().toISOString(),
    questions: [
      {
        id: 1,
        text: 'От каких величин зависит кинетическая энергия тела?',
        options: [
          { id: 1, text: 'От массы и скорости тела', is_correct: true },
          { id: 2, text: 'Только от высоты над землей', is_correct: false },
          { id: 3, text: 'От температуры тела', is_correct: false },
          { id: 4, text: 'От объема тела', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 2,
        text: 'Какая единица измерения энергии используется в системе СИ?',
        options: [
          { id: 1, text: 'Джоуль (Дж)', is_correct: true },
          { id: 2, text: 'Ньютон (Н)', is_correct: false },
          { id: 3, text: 'Ватт (Вт)', is_correct: false },
          { id: 4, text: 'Паскаль (Па)', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 3,
        text: 'Что происходит с кинетической энергией при увеличении скорости в 2 раза?',
        options: [
          { id: 1, text: 'Увеличивается в 4 раза', is_correct: true },
          { id: 2, text: 'Увеличивается в 2 раза', is_correct: false },
          { id: 3, text: 'Не изменяется', is_correct: false },
          { id: 4, text: 'Уменьшается в 2 раза', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 4,
        text: 'Какое из тел обладает кинетической энергией?',
        options: [
          { id: 1, text: 'Летящий самолет', is_correct: true },
          { id: 2, text: 'Сжатая пружина', is_correct: false },
          { id: 3, text: 'Книга на верхней полке', is_correct: false },
          { id: 4, text: 'Неподвижный мяч', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 5,
        text: 'По какой формуле вычисляется кинетическая энергия?',
        options: [
          { id: 1, text: 'Ek = (m · v²) / 2', is_correct: true },
          { id: 2, text: 'Ep = m · g · h', is_correct: false },
          { id: 3, text: 'F = m · a', is_correct: false },
          { id: 4, text: 'A = F · s', is_correct: false },
        ],
        time_limit_sec: 25,
      },
    ],
  },
  {
    id: 'starter_math_1',
    title: 'Дроби и действия с ними',
    subject: 'Математика',
    grade: 5,
    topic: 'Дроби и действия с ними',
    group_label: '5 класс',
    is_active: true,
    updated_at: new Date().toISOString(),
    questions: [
      {
        id: 1,
        text: 'Чему равна сумма 1/4 + 2/4?',
        options: [
          { id: 1, text: '3/4', is_correct: true },
          { id: 2, text: '3/8', is_correct: false },
          { id: 3, text: '2/4', is_correct: false },
          { id: 4, text: '1/2', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 2,
        text: 'Какая дробь называется правильной?',
        options: [
          { id: 1, text: 'Числитель меньше знаменателя', is_correct: true },
          { id: 2, text: 'Числитель больше знаменателя', is_correct: false },
          { id: 3, text: 'Знаменатель равен 1', is_correct: false },
          { id: 4, text: 'Числитель равен знаменателю', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 3,
        text: 'Сократите дробь 4/8 до несократимой:',
        options: [
          { id: 1, text: '1/2', is_correct: true },
          { id: 2, text: '2/4', is_correct: false },
          { id: 3, text: '1/4', is_correct: false },
          { id: 4, text: '2/8', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 4,
        text: 'Какая дробь больше: 3/5 или 2/5?',
        options: [
          { id: 1, text: '3/5', is_correct: true },
          { id: 2, text: '2/5', is_correct: false },
          { id: 3, text: 'Они равны', is_correct: false },
          { id: 4, text: 'Сравнить нельзя', is_correct: false },
        ],
        time_limit_sec: 15,
      },
      {
        id: 5,
        text: 'Чему равно произведение 1/2 · 2/3?',
        options: [
          { id: 1, text: '1/3', is_correct: true },
          { id: 2, text: '2/5', is_correct: false },
          { id: 3, text: '3/6', is_correct: false },
          { id: 4, text: '2/6', is_correct: false },
        ],
        time_limit_sec: 20,
      },
    ],
  },
  {
    id: 'starter_lit_1',
    title: 'Пушкин. Стихотворения',
    subject: 'Литература',
    grade: 7,
    topic: 'Пушкин. Стихотворения',
    group_label: '7 класс',
    is_active: true,
    updated_at: new Date().toISOString(),
    questions: [
      {
        id: 1,
        text: 'Кому посвящено стихотворение «Я помню чудное мгновенье»?',
        options: [
          { id: 1, text: 'А. П. Керн', is_correct: true },
          { id: 2, text: 'Н. Н. Гончаровой', is_correct: false },
          { id: 3, text: 'М. Н. Раевской', is_correct: false },
          { id: 4, text: 'Е. П. Бакуниной', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 2,
        text: 'Какое стихотворение начинается строками «Мороз и солнце; день чудесный!»?',
        options: [
          { id: 1, text: '«Зимнее утро»', is_correct: true },
          { id: 2, text: '«Зимний вечер»', is_correct: false },
          { id: 3, text: '«Осень»', is_correct: false },
          { id: 4, text: '«Деревня»', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 3,
        text: 'В каком учебном заведении Пушкин начал писать стихи?',
        options: [
          { id: 1, text: 'Царскосельский лицей', is_correct: true },
          { id: 2, text: 'Московский университет', is_correct: false },
          { id: 3, text: 'Пажеский корпус', is_correct: false },
          { id: 4, text: 'Санкт-Петербургский пансион', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 4,
        text: 'Какое время года поэт любил больше всего?',
        options: [
          { id: 1, text: 'Осень', is_correct: true },
          { id: 2, text: 'Лето', is_correct: false },
          { id: 3, text: 'Весна', is_correct: false },
          { id: 4, text: 'Зима', is_correct: false },
        ],
        time_limit_sec: 15,
      },
      {
        id: 5,
        text: 'Кому адресованы строки «Подруга дней моих суровых, голубка дряхлая моя!»?',
        options: [
          { id: 1, text: 'Няне Арине Родионовне', is_correct: true },
          { id: 2, text: 'Матери Надежде Осиповне', is_correct: false },
          { id: 3, text: 'Бабушке Марии Алексеевне', is_correct: false },
          { id: 4, text: 'Сестре Ольге', is_correct: false },
        ],
        time_limit_sec: 20,
      },
    ],
  },
  {
    id: 'starter_phys_2',
    title: 'Законы Ньютона',
    subject: 'Физика',
    grade: 9,
    topic: 'Законы Ньютона',
    group_label: '9 класс',
    is_active: true,
    updated_at: new Date().toISOString(),
    questions: [
      {
        id: 1,
        text: 'Какая формула выражает второй закон Ньютона?',
        options: [
          { id: 1, text: 'F = m · a', is_correct: true },
          { id: 2, text: 'E = m · c²', is_correct: false },
          { id: 3, text: 'p = m · v', is_correct: false },
          { id: 4, text: 'A = F · s', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 2,
        text: 'Какое свойство тел описывает первый закон Ньютона?',
        options: [
          { id: 1, text: 'Инертность', is_correct: true },
          { id: 2, text: 'Пластичность', is_correct: false },
          { id: 3, text: 'Упругость', is_correct: false },
          { id: 4, text: 'Хрупкость', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 3,
        text: 'Как формулируется третий закон Ньютона?',
        options: [
          { id: 1, text: 'Действие равно противодействию', is_correct: true },
          { id: 2, text: 'Сила тяжести пропорциональна массе', is_correct: false },
          { id: 3, text: 'Энергия сохраняется во времени', is_correct: false },
          { id: 4, text: 'Ускорение прямо пропорционально силе', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 4,
        text: 'В каких системах отсчета выполняются законы Ньютона?',
        options: [
          { id: 1, text: 'В инерциальных', is_correct: true },
          { id: 2, text: 'В неинерциальных', is_correct: false },
          { id: 3, text: 'В любых вращающихся', is_correct: false },
          { id: 4, text: 'Только в покоящихся', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 5,
        text: 'Какова единица измерения силы в системе СИ?',
        options: [
          { id: 1, text: 'Ньютон (Н)', is_correct: true },
          { id: 2, text: 'Паскаль (Па)', is_correct: false },
          { id: 3, text: 'Джоуль (Дж)', is_correct: false },
          { id: 4, text: 'Ватт (Вт)', is_correct: false },
        ],
        time_limit_sec: 15,
      },
      {
        id: 6,
        text: 'Чему равна равнодействующая сил 3 Н и 4 Н, направленных под углом 90°?',
        options: [
          { id: 1, text: '5 Н', is_correct: true },
          { id: 2, text: '7 Н', is_correct: false },
          { id: 3, text: '1 Н', is_correct: false },
          { id: 4, text: '12 Н', is_correct: false },
        ],
        time_limit_sec: 25,
      },
      {
        id: 7,
        text: 'Что происходит со скоростью тела, если сумма всех действующих сил равна нулю?',
        options: [
          { id: 1, text: 'Скорость остается постоянной', is_correct: true },
          { id: 2, text: 'Тело мгновенно остановится', is_correct: false },
          { id: 3, text: 'Скорость начнет равномерно падать', is_correct: false },
          { id: 4, text: 'Тело начнет двигаться по кругу', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 8,
        text: 'Кто сформулировал закон всемирного тяготения?',
        options: [
          { id: 1, text: 'Исаак Ньютон', is_correct: true },
          { id: 2, text: 'Альберт Эйнштейн', is_correct: false },
          { id: 3, text: 'Галилео Галилей', is_correct: false },
          { id: 4, text: 'Николай Коперник', is_correct: false },
        ],
        time_limit_sec: 15,
      },
    ],
  },
  {
    id: 'starter_math_2',
    title: 'Уравнения и неравенства',
    subject: 'Математика',
    grade: 6,
    topic: 'Уравнения и неравенства',
    group_label: '6 класс',
    is_active: true,
    updated_at: new Date().toISOString(),
    questions: [
      {
        id: 1,
        text: 'Решите уравнение: 2x + 6 = 16',
        options: [
          { id: 1, text: 'x = 5', is_correct: true },
          { id: 2, text: 'x = 4', is_correct: false },
          { id: 3, text: 'x = 10', is_correct: false },
          { id: 4, text: 'x = 11', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 2,
        text: 'Какое число является корнем уравнения: 5x = 25?',
        options: [
          { id: 1, text: '5', is_correct: true },
          { id: 2, text: '20', is_correct: false },
          { id: 3, text: '125', is_correct: false },
          { id: 4, text: '1', is_correct: false },
        ],
        time_limit_sec: 15,
      },
      {
        id: 3,
        text: 'Что называется корнем уравнения?',
        options: [
          { id: 1, text: 'Значение переменной, обращающее уравнение в верное равенство', is_correct: true },
          { id: 2, text: 'Любое положительное число', is_correct: false },
          { id: 3, text: 'Сумма коэффициентов', is_correct: false },
          { id: 4, text: 'Коэффициент перед неизвестным', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 4,
        text: 'Решите уравнение: 3(x - 2) = 9',
        options: [
          { id: 1, text: 'x = 5', is_correct: true },
          { id: 2, text: 'x = 3', is_correct: false },
          { id: 3, text: 'x = 1', is_correct: false },
          { id: 4, text: 'x = 6', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 5,
        text: 'При каком значении y выражение 2y - 4 равно нулю?',
        options: [
          { id: 1, text: 'y = 2', is_correct: true },
          { id: 2, text: 'y = -2', is_correct: false },
          { id: 3, text: 'y = 4', is_correct: false },
          { id: 4, text: 'y = 0', is_correct: false },
        ],
        time_limit_sec: 15,
      },
    ],
  },
  {
    id: 'starter_lit_2',
    title: 'Мировая литература',
    subject: 'Литература',
    grade: 10,
    topic: 'Мировая литература',
    group_label: '10 класс',
    is_active: true,
    updated_at: new Date().toISOString(),
    questions: [
      {
        id: 1,
        text: 'Кто является автором трагедии «Фауст»?',
        options: [
          { id: 1, text: 'И. В. Гёте', is_correct: true },
          { id: 2, text: 'Ф. Шиллер', is_correct: false },
          { id: 3, text: 'У. Шекспир', is_correct: false },
          { id: 4, text: 'Данте Алигьери', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 2,
        text: 'Какую всемирно известную трагедию написал Уильям Шекспир?',
        options: [
          { id: 1, text: '«Гамлет»', is_correct: true },
          { id: 2, text: '«Божественная комедия»', is_correct: false },
          { id: 3, text: '«Дон Кихот»', is_correct: false },
          { id: 4, text: '«Одиссея»', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 3,
        text: 'Кто написал масштабный роман «Отверженные»?',
        options: [
          { id: 1, text: 'Виктор Гюго', is_correct: true },
          { id: 2, text: 'Оноре де Бальзак', is_correct: false },
          { id: 3, text: 'Гюстав Флобер', is_correct: false },
          { id: 4, text: 'Александр Дюма', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 4,
        text: 'В какой стране жил и создавал бессмертные поэмы Данте Алигьери?',
        options: [
          { id: 1, text: 'Италия', is_correct: true },
          { id: 2, text: 'Франция', is_correct: false },
          { id: 3, text: 'Испания', is_correct: false },
          { id: 4, text: 'Греция', is_correct: false },
        ],
        time_limit_sec: 15,
      },
      {
        id: 5,
        text: 'Кто создал эпическую поэму «Божественная комедия»?',
        options: [
          { id: 1, text: 'Данте Алигьери', is_correct: true },
          { id: 2, text: 'Франческо Петрарка', is_correct: false },
          { id: 3, text: 'Джованни Боккаччо', is_correct: false },
          { id: 4, text: 'Джон Мильтон', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 6,
        text: 'Кто написал знаменитую философскую повесть «Кандид»?',
        options: [
          { id: 1, text: 'Вольтер', is_correct: true },
          { id: 2, text: 'Жан-Жак Руссо', is_correct: false },
          { id: 3, text: 'Дени Дидро', is_correct: false },
          { id: 4, text: 'Монтескьё', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 7,
        text: 'Главный благородный рыцарь романа Мигеля де Сервантеса:',
        options: [
          { id: 1, text: 'Дон Кихот', is_correct: true },
          { id: 2, text: 'Санчо Панса', is_correct: false },
          { id: 3, text: 'Роланд', is_correct: false },
          { id: 4, text: 'Сид Кампеадор', is_correct: false },
        ],
        time_limit_sec: 15,
      },
      {
        id: 8,
        text: 'Какая древнегреческая поэма принадлежит Гомеру?',
        options: [
          { id: 1, text: '«Одиссея»', is_correct: true },
          { id: 2, text: '«Энеида»', is_correct: false },
          { id: 3, text: '«Метаморфозы»', is_correct: false },
          { id: 4, text: '«Антигона»', is_correct: false },
        ],
        time_limit_sec: 15,
      },
      {
        id: 9,
        text: 'Кто является автором романтической драмы «Разбойники»?',
        options: [
          { id: 1, text: 'Фридрих Шиллер', is_correct: true },
          { id: 2, text: 'Генрих Гейне', is_correct: false },
          { id: 3, text: 'Э. Т. А. Гофман', is_correct: false },
          { id: 4, text: 'Генрих фон Клейст', is_correct: false },
        ],
        time_limit_sec: 20,
      },
      {
        id: 10,
        text: 'К какому драматическому жанру относится «Ромео и Джульетта»?',
        options: [
          { id: 1, text: 'Трагедия', is_correct: true },
          { id: 2, text: 'Комедия', is_correct: false },
          { id: 3, text: 'Фарс', is_correct: false },
          { id: 4, text: 'Водевиль', is_correct: false },
        ],
        time_limit_sec: 15,
      },
    ],
  },
];

export default function TeacherCreateQuiz({
  onBack,
  onQuizCreated,
  onNavigateToLobby,
  initialClassId,
  initialClassName,
  initialTab = 'create',
}: TeacherCreateQuizProps) {
  // Main view mode: 'create' or 'saved'
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>(() => {
    if (initialTab) return initialTab;
    try {
      const p = new URLSearchParams(window.location.search);
      const tab = p.get('tab') || p.get('view');
      if (tab === 'saved' || tab === 'templates') return 'saved';
    } catch {}
    return 'create';
  });

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Classes state
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  // Saved quizzes state & editor: empty for fresh user
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>(() => {
    const list = quizStorage.getSavedQuizzes();
    return list || [];
  });
  const [editingQuiz, setEditingQuiz] = useState<SavedQuiz | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Creation form state: clean neutral defaults
  const [subject, setSubject] = useState<string>('Математика');
  const [grade, setGrade] = useState<number>(5);
  const [topic, setTopic] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isPhotoUploaded, setIsPhotoUploaded] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Search & filter in saved tab
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('Все');

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
      if (list && list.length > 0) {
        setSavedQuizzes(list);
      }
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
            else setSelectedClass(list[0] || null);
          } else if (initialClassName) {
            const found = list.find((c) => c.name === initialClassName);
            if (found) setSelectedClass(found);
            else setSelectedClass(list[0] || null);
          }
        }
      })
      .catch(() => {});
  }, [initialClassId, initialClassName]);

  // Re-fetch curriculum topics if modal opened and list is empty
  useEffect(() => {
    if (activeModal === 'topic' && curriculumTopics.length === 0) {
      quizApi.getCurriculumTopics().then((list) => {
        if (list && list.length > 0) {
          setCurriculumTopics(list);
        }
      });
    }
  }, [activeModal, curriculumTopics.length]);


  const isSubjectMatch = (subjA?: string, subjB?: string) => {
    const a = (subjA || '').trim().toLowerCase();
    const b = (subjB || '').trim().toLowerCase();
    if (a === b) return true;
    if ((a === 'литература' || a === 'литературное чтение') && (b === 'литература' || b === 'литературное чтение')) return true;
    if ((a === 'математика' || a === 'алгебра' || a === 'геометрия' || a === 'вероятность и статистика') && (b === 'математика' || b === 'алгебра' || b === 'геометрия' || b === 'вероятность и статистика')) return true;
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
      const direct = list.filter(t =>
        `${t.subject} ${t.topic} ${t.section} ${t.description} ${(t.keywords || []).join(' ')}`.toLowerCase().includes(rawQ)
      );
      if (direct.length > 0) {
        return direct;
      }

      const cleanTokens = rawQ.replace(/[^\w\sа-яё]/gi, ' ').split(/\s+/).filter(Boolean);
      const stopWords = new Set([
        'для', 'по', 'в', 'во', 'на', 'о', 'об', 'обо', 'с', 'со', 'и', 'к', 'ко',
        'из', 'от', 'до', 'за', 'у', 'под', 'над', 'при', 'про',
        'класс', 'класса', 'классы', 'классу', 'классом', 'кл',
        'п', 'пп', 'номер', 'урок', 'урока', 'уроку', 'тема', 'теме', 'тему',
        'тест', 'квиз', 'задание', 'викторина'
      ]);
      const subjTokens = new Set(subject ? subject.toLowerCase().split(/\s+/) : []);
      const meaningfulTokens = cleanTokens.filter(t => !stopWords.has(t) && !/^\d+$/.test(t) && !subjTokens.has(t));

      // Если в запросе были только стоп-слова, цифры класса или название выбранного предмета,
      // сохраняем полный список тем предмета/класса
      if (meaningfulTokens.length === 0) {
        return list;
      }

      const matchToken = (token: string, text: string) => {
        if (text.includes(token)) return true;
        if (token.length >= 4) {
          const stem = token.slice(0, Math.max(4, token.length - 2));
          return text.includes(stem);
        }
        return false;
      };

      const allMatch = list.filter(t => {
        const fullText = `${t.subject} ${t.topic} ${t.section} ${t.description} ${(t.keywords || []).join(' ')}`.toLowerCase();
        return meaningfulTokens.every(token => matchToken(token, fullText));
      });
      if (allMatch.length > 0) {
        return allMatch;
      }
      return list.filter(t => {
        const fullText = `${t.subject} ${t.topic} ${t.section} ${t.description} ${(t.keywords || []).join(' ')}`.toLowerCase();
        return meaningfulTokens.some(token => matchToken(token, fullText));
      });
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
      const direct = list.filter(t =>
        `${t.subject} ${t.display_name} ${t.topic}`.toLowerCase().includes(rawQ)
      );
      if (direct.length > 0) {
        return direct;
      }

      const cleanTokens = rawQ.replace(/[^\w\sа-яё]/gi, ' ').split(/\s+/).filter(Boolean);
      const stopWords = new Set([
        'для', 'по', 'в', 'во', 'на', 'о', 'об', 'обо', 'с', 'со', 'и', 'к', 'ко',
        'из', 'от', 'до', 'за', 'у', 'под', 'над', 'при', 'про',
        'класс', 'класса', 'классы', 'классу', 'классом', 'кл',
        'п', 'пп', 'номер', 'урок', 'урока', 'уроку', 'тема', 'теме', 'тему',
        'тест', 'квиз', 'задание', 'викторина'
      ]);
      const subjTokens = new Set(subject ? subject.toLowerCase().split(/\s+/) : []);
      const meaningfulTokens = cleanTokens.filter(t => !stopWords.has(t) && !/^\d+$/.test(t) && !subjTokens.has(t));

      if (meaningfulTokens.length === 0) {
        return list;
      }

      const matchToken = (token: string, text: string) => {
        if (text.includes(token)) return true;
        if (token.length >= 4) {
          const stem = token.slice(0, Math.max(4, token.length - 2));
          return text.includes(stem);
        }
        return false;
      };

      const allMatch = list.filter(t => {
        const fullText = `${t.subject} ${t.display_name} ${t.topic}`.toLowerCase();
        return meaningfulTokens.every(token => matchToken(token, fullText));
      });
      if (allMatch.length > 0) {
        return allMatch;
      }
      return list.filter(t => {
        const fullText = `${t.subject} ${t.display_name} ${t.topic}`.toLowerCase();
        return meaningfulTokens.some(token => matchToken(token, fullText));
      });
    }
    return list;
  }, [bankTopics, subject, grade, topicSearchQuery]);

  // Auto-switch to FRP tab if Bank tab is active but has 0 topics while FRP has topics
  useEffect(() => {
    if (activeModal === 'topic' && topicSourceTab === 'bank' && filteredBankTopics.length === 0 && filteredCurriculumTopics.length > 0) {
      setTopicSourceTab('frp');
    }
  }, [activeModal, topicSourceTab, filteredBankTopics.length, filteredCurriculumTopics.length]);

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
      const roomData = await roomApi.createRoom({
        subject,
        grade,
        topic,
        question_count: questionCount,
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

  // Launch saved quiz
  const handleLaunchSavedQuiz = async (quiz: SavedQuiz) => {
    haptics.notification('success');
    setIsGenerating(true);

    try {
      const roomData = await roomApi.createRoom({
        subject: quiz.subject,
        grade: quiz.grade,
        topic: quiz.topic,
        question_count: quiz.questions?.length || 5,
        quiz_id: quiz.id,
        class_id: selectedClass?.id,
      });

      setIsGenerating(false);
      if (onQuizCreated) {
        onQuizCreated(roomData);
      } else if (onNavigateToLobby) {
        onNavigateToLobby();
      }
    } catch (err) {
      console.error('Failed to launch saved quiz:', err);
      setTimeout(() => {
        setIsGenerating(false);
        onQuizCreated?.();
      }, 400);
    }
  };

  const handleDeleteQuiz = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.impact('light');
    const updated = quizStorage.deleteQuiz(id);
    setSavedQuizzes(updated);
  };

  // Filtered saved quizzes
  const filteredQuizzes = savedQuizzes.filter((q) => {
    const matchesSubject = filterSubject === 'Все' || q.subject === filterSubject;
    const matchesSearch =
      !searchQuery.trim() ||
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div style={styles.viewport}>
      <div style={styles.container}>
        {/* ========================================================
            HEADER BAR: Back + Hanging Signboard
           ======================================================== */}
        <div style={styles.headerBar}>
          {onBack ? (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                haptics.impact('light');
                onBack();
              }}
              style={styles.roundBackBtn}
              title="Назад"
            >
              <ArrowLeft size={22} color="#4A2E18" strokeWidth={2.5} />
            </motion.button>
          ) : (
            <div style={{ width: 44 }} />
          )}

          <motion.div
            key={activeTab}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            style={styles.hangingSignWrapper}
          >
            <img
              src="/assets/classes/v2/sign_wood_blank.png"
              alt="Вывеска"
              style={styles.hangingSignImg}
            />
            <span style={styles.hangingSignText}>
              {activeTab === 'create' ? 'Создать викторину' : 'Мои викторины'}
            </span>
          </motion.div>

          <div style={{ width: 44 }} />
        </div>

        {/* ========================================================
            2-TAB SEGMENTED PILL SWITCHER
           ======================================================== */}
        <div style={styles.tabSwitcherContainer}>
          <div style={styles.tabSwitcherBar}>
            {/* Sliding orange pill indicator */}
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              style={{
                position: 'absolute',
                top: 4,
                bottom: 4,
                left: activeTab === 'create' ? '1.5%' : '51%',
                width: '47.5%',
                background: 'linear-gradient(180deg, #FF9126 0%, #F56B00 100%)',
                boxShadow: '0 3px 0 #C95000, 0 4px 10px rgba(245, 107, 0, 0.35)',
                borderRadius: 999,
                zIndex: 1,
              }}
            />

            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setActiveTab('create');
              }}
              style={{
                ...styles.tabSwitcherBtn,
                color: activeTab === 'create' ? '#FFFFFF' : '#4A2E18',
                fontWeight: activeTab === 'create' ? 900 : 700,
              }}
            >
              Создать
            </button>

            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setActiveTab('saved');
              }}
              style={{
                ...styles.tabSwitcherBtn,
                color: activeTab === 'saved' ? '#FFFFFF' : '#4A2E18',
                fontWeight: activeTab === 'saved' ? 900 : 700,
              }}
            >
              Шаблоны ({savedQuizzes.length})
            </button>
          </div>
        </div>

        {/* ========================================================
            TAB 1: СОЗДАТЬ ВИКТОРИНУ
           ======================================================== */}
        {activeTab === 'create' && (
          <div style={styles.tabContentCol}>
            {/* 1. SECTION: ПРЕДМЕТ */}
            <div style={styles.sectionBlock}>
              <div style={styles.sectionHeaderRow}>
                <img
                  src="/assets/classes/v2/icon_leaves.png"
                  alt="Лист"
                  style={styles.leafIconSm}
                />
                <span style={styles.sectionTitleText}>Предмет</span>
              </div>

              {/* Horizontal Scrollable Carousel of Subjects */}
              <div style={styles.subjectsScrollTrack}>
                {SUBJECT_KEYS.map((key) => {
                  const cfg = SUBJECT_CONFIGS[key]!;
                  const isSelected = subject === key;

                  return (
                    <motion.div
                      key={key}
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        haptics.selection();
                        setSubject(key);
                        const presets = TOPIC_PRESETS[key];
                        if (presets && presets.length > 0) {
                          setTopic(presets[0]!);
                        }
                      }}
                      style={{
                        ...styles.subjectCard,
                        background: isSelected ? cfg.gradient : '#FFFDF9',
                        border: isSelected ? `2.5px solid ${cfg.border}` : '2px solid #E5C39E',
                        boxShadow: isSelected ? `${cfg.shadow}, 0 6px 14px rgba(0,0,0,0.14)` : '0 3px 0 #D8BEA3',
                        color: isSelected ? '#FFFFFF' : '#4A2E18',
                      }}
                    >
                      <div style={styles.subjectIconSlot}>
                        <img
                          src={cfg.iconSrc}
                          alt={cfg.name}
                          style={styles.subjectIconImg}
                        />
                      </div>
                      <span style={styles.subjectCardLabel}>{cfg.name}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* 2. SECTION: КЛАСС (1-11) */}
            <div style={styles.sectionBlock}>
              <div style={styles.sectionHeaderRow}>
                <img
                  src="/assets/classes/v2/icon_leaves.png"
                  alt="Лист"
                  style={styles.leafIconSm}
                />
                <span style={styles.sectionTitleText}>Класс</span>
              </div>

              <div style={styles.gradesRow}>
                {GRADES.map((g) => {
                  const isSelected = grade === g;
                  return (
                    <motion.button
                      key={g}
                      type="button"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        haptics.selection();
                        setGrade(g);
                      }}
                      style={{
                        ...styles.gradePillBtn,
                        background: isSelected
                          ? 'linear-gradient(180deg, #FF9126 0%, #F56B00 100%)'
                          : '#FFFDF9',
                        borderColor: isSelected ? '#FFAF66' : '#E8D5C6',
                        boxShadow: isSelected ? '0 3px 0 #C95000' : '0 2px 0 #E5D2C2',
                        color: isSelected ? '#FFFFFF' : '#4A2E18',
                      }}
                    >
                      {g}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* 3. SECTION: ТЕМА УРОКА */}
            <div style={styles.sectionBlock}>
              <div style={styles.sectionHeaderRow}>
                <img
                  src="/assets/classes/v2/icon_leaves.png"
                  alt="Лист"
                  style={styles.leafIconSm}
                />
                <span style={styles.sectionTitleText}>Тема урока</span>
              </div>

              <div style={styles.topicInputWrapper}>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={subject === 'Математика' ? 'Например: Обыкновенные дроби' : 'Например: Законы Ньютона'}
                  style={styles.topicTextInput}
                />
              </div>

              {/* Topic presets chips */}
              {TOPIC_PRESETS[subject] && (
                <div style={styles.topicPresetsRow}>
                  {TOPIC_PRESETS[subject]!.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setTopic(p);
                      }}
                      style={{
                        ...styles.topicPresetChip,
                        backgroundColor: topic === p ? '#FFF5EA' : '#FFFDF9',
                        borderColor: topic === p ? '#FF9126' : '#E5C39E',
                        color: topic === p ? '#F56B00' : '#6B4A2F',
                        fontWeight: topic === p ? 900 : 700,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Rubricator & Textbooks triggers */}
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setActiveModal('topic');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 999,
                    backgroundColor: '#FFF5EA',
                    border: '1.5px solid #FF9126',
                    color: '#D95800',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  <GraduationCap size={15} color="#D95800" />
                  <span>Рубрикатор ФРП ({curriculumTopics.length || '593 темы'})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setTextbookModalStep('books');
                    setActiveModal('textbook');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 999,
                    backgroundColor: '#EFF6FF',
                    border: '1.5px solid #60A5FA',
                    color: '#2563EB',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  <BookOpen size={14} color="#2563EB" />
                  <span>Каталог учебников</span>
                </button>
              </div>
            </div>

            {/* 4. SECTION: ФОТО УЧЕБНИКА */}
            <div style={styles.sectionBlock}>
              <div style={styles.sectionHeaderRow}>
                <img
                  src="/assets/classes/v2/icon_leaves.png"
                  alt="Лист"
                  style={styles.leafIconSm}
                />
                <span style={styles.sectionTitleText}>Фото учебника</span>
              </div>

              <motion.div
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  ...styles.photoDropCard,
                  borderColor: isPhotoUploaded ? '#10B981' : '#DDB88C',
                  backgroundColor: isPhotoUploaded ? '#F0FDF4' : '#FFFDF9',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      haptics.notification('success');
                      setIsPhotoUploaded(true);
                    }
                  }}
                />

                <img
                  src="/assets/subjects/camera.png"
                  alt="Камера"
                  style={styles.cameraIconImg}
                />
                <div style={styles.photoDropTexts}>
                  <span style={styles.photoDropTitle}>
                    {isPhotoUploaded ? 'Материалы прикреплены' : 'Загрузить фото или тест'}
                  </span>
                  <span style={styles.photoDropSub}>
                    {isPhotoUploaded
                      ? 'ИИ распознает задания автоматически'
                      : 'Фото учебника, готового теста, списка вопросов или темы'}
                  </span>
                </div>
                {isPhotoUploaded && (
                  <CheckCircle2 size={20} color="#10B981" strokeWidth={2.6} style={{ flexShrink: 0 }} />
                )}
              </motion.div>
            </div>

            {/* 5. SECTION: КОЛИЧЕСТВО ВОПРОСОВ */}
            <div style={styles.sectionBlock}>
              <div style={styles.sectionHeaderRow}>
                <img
                  src="/assets/classes/v2/icon_leaves.png"
                  alt="Лист"
                  style={styles.leafIconSm}
                />
                <span style={styles.sectionTitleText}>Количество вопросов</span>
              </div>

              <div style={styles.countPillsRow}>
                {QUESTION_COUNTS.map((cnt) => {
                  const isSelected = questionCount === cnt;
                  return (
                    <motion.button
                      key={cnt}
                      type="button"
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        haptics.selection();
                        setQuestionCount(cnt);
                      }}
                      style={{
                        ...styles.countPillBtn,
                        background: isSelected
                          ? 'linear-gradient(180deg, #FF9126 0%, #F56B00 100%)'
                          : '#FFFDF9',
                        borderColor: isSelected ? '#FFAF66' : '#E8D5C6',
                        boxShadow: isSelected ? '0 3px 0 #C95000' : '0 2px 0 #E5D2C2',
                        color: isSelected ? '#FFFFFF' : '#4A2E18',
                      }}
                    >
                      {cnt}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* 6. BIG BOTTOM ACTION BUTTON */}
            <div style={styles.bottomBarContainer}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleStartGeneration}
                disabled={isGenerating}
                style={styles.generateBigBtn}
              >
                <img
                  src="/assets/classes/v2/icon_acorn.png"
                  alt="Желудь"
                  style={{ width: 24, height: 24, flexShrink: 0 }}
                />
                <span>
                  {isGenerating ? 'Собираем викторину...' : 'Сгенерировать викторину'}
                </span>
              </motion.button>

              <button
                type="button"
                onClick={handleGenerateQuizWithAI}
                disabled={isGenerating}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '10px 16px',
                  borderRadius: 999,
                  backgroundColor: '#FFFDF9',
                  border: '1.5px solid #E5C39E',
                  color: '#6B4A2F',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Edit3 size={15} color="#855F3F" />
                <span>Сгенерировать и настроить вопросы вручную</span>
              </button>
            </div>
          </div>
        )}

      {/* Selection Sheets / Modals for FRP 593 topics, textbooks, etc. */}
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
                  {activeModal === 'topic' && 'Каталог тем ФРП и банка'}
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
                            <div style={{ padding: '16px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: '#9CA3AF', fontSize: 12 }}>
                                {topicSearchQuery.trim()
                                  ? `По запросу «${topicSearchQuery}» ничего не найдено в программе ${grade} класса`
                                  : `В каталоге ФРП для ${subject} (${grade} класс) темы пока не загружены`}
                              </span>
                              {topicSearchQuery.trim() && (
                                <button
                                  type="button"
                                  onClick={() => setTopicSearchQuery('')}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    color: '#FFFFFF',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Сбросить поиск
                                </button>
                              )}
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
                            <div style={{ padding: '16px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: '#9CA3AF', fontSize: 12 }}>
                                В банке заданий пока нет тестов по {subject} ({grade} класс).
                              </span>
                              {filteredCurriculumTopics.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    haptics.selection();
                                    setTopicSourceTab('frp');
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '7px 12px',
                                    borderRadius: 8,
                                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                    border: '1px solid #F59E0B',
                                    color: '#FBBF24',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <GraduationCap size={14} />
                                  <span>Показать темы ФРП edsoo.ru ({filteredCurriculumTopics.length})</span>
                                </button>
                              )}
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

        {/* ========================================================
            TAB 2: МОИ ВИКТОРИНЫ (ШАБЛОНЫ)
           ======================================================== */}
        {activeTab === 'saved' && (
          <div style={styles.tabContentCol}>
            {/* Search Input Bar */}
            <div style={styles.searchBarWrapper}>
              <Search size={18} color="#855F3F" strokeWidth={2.4} style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по темам..."
                style={styles.searchTextInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={styles.searchClearBtn}
                >
                  <X size={15} color="#855F3F" />
                </button>
              )}
            </div>

            {/* Subject Filter Chips */}
            <div style={styles.filterChipsTrack}>
              {['Все', 'Физика', 'Математика', 'Литература', 'Русский язык', 'Биология'].map((sub) => {
                const isSelected = filterSubject === sub;
                const cfg = SUBJECT_CONFIGS[sub];

                return (
                  <motion.button
                    key={sub}
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      haptics.selection();
                      setFilterSubject(sub);
                    }}
                    style={{
                      ...styles.filterChipBtn,
                      background: isSelected
                        ? 'linear-gradient(180deg, #FF9126 0%, #F56B00 100%)'
                        : '#FFFDF9',
                      borderColor: isSelected ? '#FFAF66' : '#E5C39E',
                      boxShadow: isSelected ? '0 3px 0 #C95000' : '0 2px 0 #E5D2C2',
                      color: isSelected ? '#FFFFFF' : '#4A2E18',
                      fontWeight: isSelected ? 900 : 700,
                    }}
                  >
                    {cfg && (
                      <img
                        src={cfg.iconSrc}
                        alt={sub}
                        style={{ width: 16, height: 16, objectFit: 'contain' }}
                      />
                    )}
                    <span>{sub}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Cards List */}
            <div style={styles.quizzesScrollList}>
              {filteredQuizzes.map((quiz, idx) => {
                const cfg = SUBJECT_CONFIGS[quiz.subject] || SUBJECT_CONFIGS['Физика']!;
                const count = quiz.questions?.length || 5;
                const estTime = Math.max(2, Math.round(count * 0.6));

                return (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + idx * 0.04 }}
                    style={styles.quizCard}
                  >
                    {/* Left Icon Square */}
                    <div style={{ ...styles.quizCardIconSquare, background: cfg.gradient }}>
                      <img
                        src={cfg.iconSrc}
                        alt={quiz.subject}
                        style={styles.quizCardIconImg}
                      />
                    </div>

                    {/* Middle Info */}
                    <div style={styles.quizCardInfoCol}>
                      <div style={styles.quizCardTitleText}>{quiz.title}</div>

                      <div style={styles.quizCardBadgesRow}>
                        <span style={styles.badgeGrade}>{quiz.grade} класс</span>
                        <span style={styles.badgeCount}>{formatQuestionsCount(count)}</span>
                        <span style={styles.badgeTime}>~{estTime} мин</span>
                      </div>
                    </div>

                    {/* Right Actions: Launch + Edit */}
                    <div style={styles.quizCardActionsCol}>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleLaunchSavedQuiz(quiz)}
                        style={styles.launchQuizGreenBtn}
                        title="Запустить викторину"
                      >
                        <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
                        <span>Запустить</span>
                      </motion.button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => {
                            haptics.impact('light');
                            setEditingQuiz(quiz);
                            setIsEditorOpen(true);
                          }}
                          style={styles.cardMiniActionBtn}
                          title="Редактировать"
                        >
                          <Edit3 size={15} color="#855F3F" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                          style={styles.cardMiniActionBtn}
                          title="Удалить"
                        >
                          <Trash2 size={15} color="#B88E6A" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Empty State */}
              {filteredQuizzes.length === 0 && (
                <div style={styles.emptyCardBox}>
                  <img
                    src="/assets/classes/v2/avatar_sprint_head.png"
                    alt="Спринт"
                    style={{ width: 64, height: 64, borderRadius: 999, objectFit: 'cover', marginBottom: 10 }}
                  />
                  <div style={styles.emptyTitle}>Шаблонов пока нет</div>
                  <div style={styles.emptySub}>
                    Создайте викторину во вкладке «Создать», и она сохранится здесь!
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveTab('create')}
                    style={styles.emptyCreateBtn}
                  >
                    Создать викторину
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Question Editor */}
        {isEditorOpen && editingQuiz && (
          <QuizQuestionEditorModal
            isOpen={isEditorOpen}
            quiz={editingQuiz}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingQuiz(null);
            }}
            onSave={(updated) => {
              const list = quizStorage.upsertQuiz(updated);
              setSavedQuizzes(list);
              setIsEditorOpen(false);
              setEditingQuiz(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#FFF9F0',
    display: 'flex',
    justifyContent: 'center',
    padding: 0,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },
  container: {
    width: '100%',
    maxWidth: 440,
    minHeight: '100vh',
    padding: '14px 14px 60px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
  },
  roundBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #D8BEA3, 0 4px 10px rgba(120, 80, 40, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
  },
  hangingSignWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 242,
    height: 64,
  },
  hangingSignImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  hangingSignText: {
    position: 'relative',
    zIndex: 2,
    fontSize: 14.5,
    fontWeight: 900,
    color: '#3D2411',
    letterSpacing: '0.01em',
    textShadow: '0 1px 0 rgba(255, 255, 255, 0.7)',
    whiteSpace: 'nowrap',
    textAlign: 'center',
    marginTop: -2,
    pointerEvents: 'none',
  },
  tabSwitcherContainer: {
    width: '100%',
    margin: '12px 0 14px',
  },
  tabSwitcherBar: {
    position: 'relative',
    width: '100%',
    height: 46,
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #E0B78B, 0 6px 12px rgba(140, 90, 40, 0.08)',
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    padding: 3,
    boxSizing: 'border-box',
  },
  tabSwitcherBtn: {
    flex: 1,
    height: '100%',
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13.5,
    cursor: 'pointer',
    position: 'relative',
    zIndex: 2,
    transition: 'color 0.15s ease',
    outline: 'none',
  },
  tabContentCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  sectionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
  },
  leafIconSm: {
    width: 16,
    height: 16,
    objectFit: 'contain',
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: 900,
    color: '#3D2411',
  },
  subjectsScrollTrack: {
    display: 'flex',
    gap: 10,
    overflowX: 'auto',
    paddingBottom: 6,
    paddingLeft: 2,
    paddingRight: 2,
    scrollbarWidth: 'none',
  },
  subjectCard: {
    minWidth: 92,
    width: 92,
    height: 98,
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
    flexShrink: 0,
    boxSizing: 'border-box',
    outline: 'none',
    userSelect: 'none',
    padding: '6px 4px',
  },
  subjectIconSlot: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIconImg: {
    width: 42,
    height: 42,
    objectFit: 'contain',
    display: 'block',
  },
  subjectCardLabel: {
    fontSize: 11.5,
    fontWeight: 800,
    textAlign: 'center',
    lineHeight: 1.15,
    whiteSpace: 'normal',
    maxWidth: '92%',
  },
  gradesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    overflowX: 'auto',
    paddingBottom: 4,
    scrollbarWidth: 'none',
  },
  gradePillBtn: {
    minWidth: 32,
    height: 34,
    borderRadius: 10,
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
    outline: 'none',
    flexShrink: 0,
    boxSizing: 'border-box',
  },
  topicInputWrapper: {
    width: '100%',
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #D8BEA3',
    borderRadius: 18,
    padding: '4px 14px',
    boxSizing: 'border-box',
  },
  topicTextInput: {
    width: '100%',
    height: 38,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#3D2411',
    fontSize: 14,
    fontWeight: 800,
  },
  topicPresetsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 2,
  },
  topicPresetChip: {
    borderRadius: 999,
    border: '1.5px solid',
    padding: '4px 10px',
    fontSize: 11.5,
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.15s ease',
  },
  photoDropCard: {
    width: '100%',
    borderRadius: 18,
    border: '2px dashed',
    padding: '12px 14px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(120, 80, 40, 0.04)',
  },
  cameraIconImg: {
    width: 38,
    height: 38,
    objectFit: 'contain',
    flexShrink: 0,
  },
  photoDropTexts: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  photoDropTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#3D2411',
  },
  photoDropSub: {
    fontSize: 11,
    color: '#855F3F',
    fontWeight: 600,
  },
  countPillsRow: {
    display: 'flex',
    gap: 10,
  },
  countPillBtn: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 900,
    cursor: 'pointer',
    outline: 'none',
  },
  bottomBarContainer: {
    marginTop: 8,
    paddingTop: 6,
    paddingBottom: 24,
  },
  bottomBarDecorRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  generateBigBtn: {
    width: '100%',
    height: 50,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #FF9126 0%, #F56B00 100%)',
    border: '2.5px solid #FFAF66',
    boxShadow: '0 4px 0 #C95000, 0 8px 18px rgba(245, 107, 0, 0.35)',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    outline: 'none',
    boxSizing: 'border-box',
  },
  searchBarWrapper: {
    width: '100%',
    height: 44,
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #D8BEA3',
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    gap: 8,
    boxSizing: 'border-box',
  },
  searchTextInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    outline: 'none',
    color: '#3D2411',
    fontSize: 13.5,
    fontWeight: 700,
  },
  searchClearBtn: {
    background: 'none',
    border: 'none',
    padding: 2,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipsTrack: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    paddingBottom: 4,
    scrollbarWidth: 'none',
  },
  filterChipBtn: {
    borderRadius: 999,
    border: '1.5px solid',
    padding: '5px 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  quizzesScrollList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 4,
  },
  quizCard: {
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    borderRadius: 20,
    boxShadow: '0 4px 0 #D8BEA3, 0 6px 14px rgba(120, 80, 40, 0.08)',
    padding: '12px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxSizing: 'border-box',
  },
  quizCardIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 3px 6px rgba(0,0,0,0.12)',
  },
  quizCardIconImg: {
    width: 32,
    height: 32,
    objectFit: 'contain',
    display: 'block',
  },
  quizCardInfoCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  quizCardTitleText: {
    fontSize: 14.5,
    fontWeight: 900,
    color: '#3D2411',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  quizCardBadgesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  badgeGrade: {
    backgroundColor: '#E8F8F0',
    border: '1px solid #A7F3D0',
    color: '#10B981',
    borderRadius: 999,
    padding: '2px 7px',
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1,
  },
  badgeCount: {
    backgroundColor: '#F5ECE3',
    color: '#6B4A2F',
    borderRadius: 999,
    padding: '2px 7px',
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1,
  },
  badgeTime: {
    backgroundColor: '#FFF4E6',
    color: '#EA580C',
    borderRadius: 999,
    padding: '2px 7px',
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1,
  },
  quizCardActionsCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  launchQuizGreenBtn: {
    height: 34,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #34D399 0%, #10B981 100%)',
    border: '1.5px solid #6EE7B7',
    boxShadow: '0 3px 0 #059669',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 900,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '0 12px',
    cursor: 'pointer',
    outline: 'none',
  },
  cardMiniActionBtn: {
    background: '#F5ECE3',
    border: '1px solid #E5D2C2',
    borderRadius: 8,
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  },
  emptyCardBox: {
    backgroundColor: '#FFFDF9',
    border: '2px solid #E8CDB2',
    borderRadius: 22,
    padding: '36px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: '#3D2411',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#855F3F',
    lineHeight: 1.4,
    marginBottom: 16,
    maxWidth: 260,
  },
  emptyCreateBtn: {
    height: 40,
    borderRadius: 999,
    background: 'linear-gradient(180deg, #FF9126 0%, #F56B00 100%)',
    border: '2px solid #FFAF66',
    boxShadow: '0 3px 0 #C95000',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 900,
    padding: '0 20px',
    cursor: 'pointer',
    outline: 'none',
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
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTop: '1px solid rgba(255, 255, 255, 0.18)',
    padding: '16px 18px 28px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
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
    maxHeight: 380,
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
