import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home,
  Sprout,
  Crown,
  BarChart2,
  Wrench,
  X,
  Flame,
  Droplets,
  ShieldCheck,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import { authService, UserProfile } from './services/authService';
import { getWebApp } from './services/maxBridge';

// Pages
import ClassGrove from './pages/ClassGrove';
import StudentHome from './pages/StudentHome';
import StudentWaitingLobby from './pages/StudentWaitingLobby';
import StudentLeaderboard from './pages/StudentLeaderboard';
import StudentStats from './pages/StudentStats';
import StudentGameQuestion from './pages/StudentGameQuestion';
import FeedbackStreak from './pages/FeedbackStreak';
import TeacherCreateQuiz from './pages/TeacherCreateQuiz';
import TeacherHomeScreen from './pages/TeacherHomeScreen';
import TeacherLobby from './pages/TeacherLobby';
import TeacherGapReport from './pages/TeacherGapReport';
import TeacherLiveGame from './pages/TeacherLiveGame';
import StudentRoundWait from './pages/StudentRoundWait';
import StudentQuizFinish from './pages/StudentQuizFinish';
import SleepScreen from './pages/SleepScreen';
import TeacherClassManagement from './pages/TeacherClassManagement';
import RoleSelectScreen from './pages/RoleSelectScreen';
import { classApi } from './services/classApi';
import { testHarness } from './services/testHarness';
import { roomApi } from './services/roomApi';
import { haptics } from './services/haptics';
import { socketService } from './services/socketService';
import SoundToggleButton from './components/SoundToggleButton';
import { soundManager } from './services/soundManager';

type TabType = 'home' | 'grove' | 'leaderboard' | 'stats';
type SubScreenType =
  | null
  | 'role_select'
  | 'student_waiting'
  | 'student_game'
  | 'teacher_game'
  | 'feedback_correct'
  | 'feedback_wrong'
  | 'student_round_wait'
  | 'student_quiz_finish'
  | 'student_leaderboard'
  | 'sleep_screen'
  | 'teacher_classes'
  | 'teacher_quizzes'
  | 'teacher_report';

export default function App() {
  const [role, setRole] = useState<'teacher' | 'student'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('role');
      const s = params.get('screen') || params.get('subScreen');
      if (r === 'teacher') return 'teacher';
      if (r === 'student') return 'student';
      const savedRole = (localStorage.getItem('lisquiz_user_role') || sessionStorage.getItem('lisquiz_role')) as 'teacher' | 'student';
      if (savedRole === 'teacher' || savedRole === 'student') return savedRole;
      if (s === 'teacher_quizzes' || s === 'teacher_game' || s === 'teacher_waiting' || s === 'teacher_report' || s === 'stats') return 'teacher';
    } catch {}
    return 'student';
  });
  const [tab, setTab] = useState<TabType>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('screen') || params.get('subScreen') || params.get('tab');
      if (s === 'teacher_report' || s === 'stats') return 'stats';
      if (s === 'grove') return 'grove';
      if (s === 'leaderboard' || s === 'teacher_lobby' || s === 'teacher_waiting' || s === 'lobby') return 'leaderboard';
    } catch {}
    return 'home';
  });
  const [subScreen, setSubScreen] = useState<SubScreenType>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('screen') || params.get('subScreen');
      if (s === 'role_select') return 'role_select';
      if (s === 'teacher_classes' || s === 'classes') return 'teacher_classes';
      if (s === 'teacher_quizzes' || s === 'quizzes') return 'teacher_quizzes';
      if (s === 'teacher_game') return 'teacher_game';
      if (s === 'student_waiting' || s === 'waiting') return 'student_waiting';
      if (s === 'student_game' || s === 'game') return 'student_game';
      if (s === 'student_round_wait' || s === 'wait') return 'student_round_wait';
      if (s === 'student_quiz_finish' || s === 'finish') return 'student_quiz_finish';
      if (s === 'student_leaderboard' || s === 'leaderboard') return 'student_leaderboard';

      // One-time role selection for first-time user:
      const savedRole = localStorage.getItem('lisquiz_user_role') || sessionStorage.getItem('lisquiz_role');
      const r = params.get('role');
      if (!savedRole && !r) {
        return 'role_select';
      }
    } catch {}
    return null;
  });
  const [isMobileDevOpen, setIsMobileDevOpen] = useState(false);

  // App mode: 'user' (production-clean) or 'dev' (tools, shortcuts, mocks)
  type AppMode = 'user' | 'dev';
  const [appMode, setAppMode] = useState<AppMode>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mode');
      if (m === 'dev' || m === 'developer' || params.has('dev')) return 'dev';
      if (m === 'user') return 'user';
      const saved = localStorage.getItem('lisquiz_app_mode') as AppMode;
      if (saved === 'dev' || saved === 'user') return saved;
    } catch {}
    return 'user';
  });

  const handleModeChange = (newMode: AppMode) => {
    haptics.selection();
    setAppMode(newMode);
    try {
      localStorage.setItem('lisquiz_app_mode', newMode);
      const url = new URL(window.location.href);
      if (newMode === 'dev') {
        url.searchParams.set('mode', 'dev');
      } else {
        url.searchParams.delete('mode');
        url.searchParams.delete('dev');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  // Auth & user state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCachedUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  // Live session state
  const [activePin, setActivePin] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('pin') || '';
    } catch {}
    return '';
  });
  const [teacherToken, setTeacherToken] = useState<string>('');
  const [studentPlayerId, setStudentPlayerId] = useState<string>('');
  const [studentName, setStudentName] = useState<string>(() => authService.getCachedUser()?.display_name || 'Иван К');
  const [studentAvatar, setStudentAvatar] = useState<string>(() => authService.getCachedUser()?.avatar || 'fox_smart');
  const [currentQuestionData, setCurrentQuestionData] = useState<any>(null);
  const [personalAnswerResult, setPersonalAnswerResult] = useState<any>(null);
  const [quizFinishData, setQuizFinishData] = useState<any>(null);
  const [quizSubject, setQuizSubject] = useState<string>('Математика');
  const [quizGrade, setQuizGrade] = useState<number>(7);
  const [quizClass, setQuizClass] = useState<string>('7А');
  const [quizClassId, setQuizClassId] = useState<string | undefined>(undefined);
  const [classModalInitialOpen, setClassModalInitialOpen] = useState<boolean>(false);
  const [quizTitle, setQuizTitle] = useState<string>('Викторина по математике');
  const [leaderboardBoostPoints, setLeaderboardBoostPoints] = useState<number | null>(null);
  const [leaderboardBoostRank, setLeaderboardBoostRank] = useState<number | null>(null);
  const [lastFinishedRoomCode, setLastFinishedRoomCode] = useState<string>('');
  const studentQuizStatsRef = useRef<{ correct: number; wrong: number; total: number; score: number }>({ correct: 0, wrong: 0, total: 3, score: 0 });

  // Listen to incoming WebSocket events
  useEffect(() => {
    const handleQuestionStart = (data: any) => {
      setCurrentQuestionData(data);
      setPersonalAnswerResult(null);
      if (data?.subject) setQuizSubject(data.subject);
      if (data?.class_name) setQuizClass(data.class_name);
      if (data?.grade) setQuizGrade(data.grade);
      if (data?.quiz_title) setQuizTitle(data.quiz_title);
      if (data?.question_index === 0) {
        studentQuizStatsRef.current = { correct: 0, wrong: 0, total: data?.total_questions || 3, score: 0 };
      }
      if (role === 'teacher') {
        setSubScreen('teacher_game');
      } else {
        setSubScreen('student_game');
      }
    };

    const handleAnswerResult = (data: any) => {
      setPersonalAnswerResult(data);
      if (data?.is_correct) {
        studentQuizStatsRef.current.correct += 1;
      } else {
        studentQuizStatsRef.current.wrong += 1;
      }
      if (data?.total_score != null) {
        studentQuizStatsRef.current.score = data.total_score;
      } else if (data?.points_awarded != null) {
        studentQuizStatsRef.current.score += data.points_awarded;
      }
    };

    const handleGameFinished = (data: any) => {
      haptics.notification('success');
      if (role === 'teacher') {
        socketService.disconnect();
        setLastFinishedRoomCode(activePin);
        setActivePin('');
        setTeacherToken('');
        setSubScreen(null);
        setTab('stats');
      } else {
        // Ученик: если он всё ещё в лобби ожидания, немедленно выкидываем его из комнаты
        if (subScreen === 'student_waiting' || !subScreen) {
          socketService.disconnect();
          setActivePin('');
          setSubScreen(null);
          setPersonalAnswerResult(null);
          setCurrentQuestionData(null);
          setAuthFeedback('Викторина завершена учителем');
          return;
        }

        // Если ученик играл, сразу разрываем соединение с комнатой, чтобы не висеть в сокетах
        socketService.disconnect();
        setActivePin('');

        const topPlayers = data?.top_players || [];
        const myPlayer = topPlayers.find((p: any) =>
          (studentPlayerId && p.id === studentPlayerId) ||
          (p.name && studentName && String(p.name).trim().toLowerCase() === String(studentName).trim().toLowerCase())
        );
        const myScore = myPlayer?.score ?? (studentQuizStatsRef.current.score > 0 ? studentQuizStatsRef.current.score : (personalAnswerResult?.total_score || 850));
        const myRank = myPlayer?.rank ?? (
          topPlayers.length > 0
            ? topPlayers.filter((p: any) => (p.score ?? 0) > myScore).length + 1
            : 1
        );
        const totalQ = currentQuestionData?.total_questions || studentQuizStatsRef.current.total || 3;
        const correctQ = studentQuizStatsRef.current.correct;
        const wrongQ = Math.max(studentQuizStatsRef.current.wrong, totalQ - correctQ);
        setQuizFinishData({
          top_players: topPlayers,
          myScore: myScore,
          myRank: myRank,
          correctCount: correctQ,
          wrongCount: wrongQ,
          totalQuestions: totalQ,
        });
        setSubScreen('student_quiz_finish');
      }
    };

    const handleStudentKickOrClose = (data: any) => {
      if (role === 'student' && subScreen) {
        socketService.disconnect();
        setActivePin('');
        setSubScreen(null);
        setPersonalAnswerResult(null);
        setCurrentQuestionData(null);
        setAuthFeedback(data?.reason || 'Викторина завершена учителем');
      }
    };

    const handleStudentDisconnect = (_data?: any) => {
      if (role === 'student' && subScreen && subScreen !== 'student_quiz_finish') {
        socketService.disconnect();
        setActivePin('');
        setSubScreen(null);
        setPersonalAnswerResult(null);
        setCurrentQuestionData(null);
        setAuthFeedback('Соединение с викториной закрыто');
      }
    };

    socketService.on('QUESTION_START', handleQuestionStart);
    socketService.on('PERSONAL_ANSWER_RESULT', handleAnswerResult);
    socketService.on('GAME_FINISHED', handleGameFinished);
    socketService.on('DISCONNECT', handleStudentDisconnect);
    socketService.on('KICKED', handleStudentKickOrClose);
    socketService.on('ROOM_CLOSED', handleStudentKickOrClose);
    socketService.on('TEACHER_LEFT', handleStudentKickOrClose);

    return () => {
      socketService.off('QUESTION_START', handleQuestionStart);
      socketService.off('PERSONAL_ANSWER_RESULT', handleAnswerResult);
      socketService.off('GAME_FINISHED', handleGameFinished);
      socketService.off('DISCONNECT', handleStudentDisconnect);
      socketService.off('KICKED', handleStudentKickOrClose);
      socketService.off('ROOM_CLOSED', handleStudentKickOrClose);
      socketService.off('TEACHER_LEFT', handleStudentKickOrClose);
    };
  }, [role, studentName, studentPlayerId]);

  // Handle auth on mount: check URL ticket param, MAX WebApp initData, or verify cached session
  useEffect(() => {
    // 1. MAX WebApp initData
    const webApp = getWebApp();
    if (webApp.initData) {
      setAuthLoading(true);
      authService.exchangeInitData(webApp.initData)
        .then((res) => {
          setCurrentUser(res.user);
          setRole(res.user.role);
          if (res.user.role === 'student' && res.user.display_name) {
            setStudentName(res.user.display_name);
          }
        })
        .catch((e) => console.warn('MAX WebApp initData exchange error:', e))
        .finally(() => setAuthLoading(false));
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);

    // 1.5 Check query param join_class: ?join_class=7A-X9K2
    const joinClassCode = urlParams.get('join_class');
    if (joinClassCode) {
      classApi.joinClass(joinClassCode)
        .then((res) => {
          haptics.notification('success');
          setAuthFeedback(`🎉 Вы успешно привязаны к классу ${res.name}! Ваши результаты теперь идут в общий зачет.`);
        })
        .catch((e) => console.warn('Join class error:', e));
    }

    // 2. Query param ticket: ?ticket=tkt_...
    const ticketParam = urlParams.get('ticket');
    if (ticketParam) {
      setAuthLoading(true);
      authService.exchangeTicket(ticketParam)
        .then((res) => {
          setCurrentUser(res.user);
          setRole(res.user.role);
          if (res.user.role === 'student' && res.user.display_name) {
            setStudentName(res.user.display_name);
          }
          setAuthFeedback(`Успешный вход по тикету бота: ${res.user.display_name}`);
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        })
        .catch((e) => {
          console.error('Ticket exchange error:', e);
          setAuthFeedback('Не удалось обменять тикет бота');
        })
        .finally(() => setAuthLoading(false));
      return;
    }

    // 3. Restore existing session or create dev user
    authService.getMe().then((user) => {
      if (user) {
        setCurrentUser(user);
        setRole(user.role);
        if (user.role === 'student' && user.display_name) {
          setStudentName(user.display_name);
        }
      } else {
        authService.quickLogin('student', 'Иван К', 'fox_smart')
          .then((res) => setCurrentUser(res.user))
          .catch(() => {});
      }
    });
  }, []);

  const handleRoleSwitch = (newRole: 'teacher' | 'student') => {
    haptics.impact('light');
    try {
      soundManager.playTap();
    } catch {}
    setRole(newRole);
    try {
      sessionStorage.setItem('lisquiz_role', newRole);
    } catch {}
    setSubScreen(null);
    setTab('home');

    const name = newRole === 'teacher' ? 'Марья Ивановна' : (studentName || 'Иван К');
    const avatar = newRole === 'teacher' ? 'owl' : (studentAvatar || 'fox_smart');
    authService.quickLogin(newRole, name, avatar)
      .then((res) => setCurrentUser(res.user))
      .catch((err) => console.warn('Role switch quickLogin error:', err));
  };

  const handleSimulateBotStart = async (targetRole: 'teacher' | 'student') => {
    setAuthLoading(true);
    setAuthFeedback(null);
    try {
      const name = targetRole === 'teacher' ? 'Марья Ивановна' : 'Иван К';
      const avatar = targetRole === 'teacher' ? 'owl' : 'fox_smart';
      const botRes = await authService.simulateBotStart('/start', targetRole, name, avatar);
      const exchangeRes = await authService.exchangeTicket(botRes.ticket);
      setCurrentUser(exchangeRes.user);
      setRole(exchangeRes.user.role);
      if (exchangeRes.user.role === 'student' && exchangeRes.user.display_name) {
        setStudentName(exchangeRes.user.display_name);
      }
      setSubScreen(null);
      setTab(exchangeRes.user.role === 'teacher' ? 'home' : 'grove');
      setAuthFeedback(`✅ Успех! Команда /start обработана. Тикет ${botRes.ticket.slice(0, 10)}... обменян на JWT!`);
      haptics.notification('success');
    } catch (e: any) {
      setAuthFeedback(`❌ Ошибка: ${e.message || 'Сбой симуляции'}`);
      haptics.notification('error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickBotGame = async () => {
    haptics.notification('success');
    setRole('teacher');
    try {
      let pin = activePin;
      if (!pin || pin === '482915') {
        const room = await roomApi.createRoom({
          subject: 'Математика',
          grade: 7,
          topic: 'Дроби и проценты',
        });
        pin = room.room_code;
        setActivePin(pin);
        setTeacherToken(room.teacher_token);
      }
      await testHarness.addMockStudents(pin, 4);
      setSubScreen('teacher_game');
    } catch (e: any) {
      console.warn('handleQuickBotGame notice:', e);
      setSubScreen('teacher_game');
    }
  };

  const handleSeedClassAndAnalytics = async () => {
    haptics.notification('success');
    setRole('teacher');
    try {
      await testHarness.seedDemoClass();
      setSubScreen('teacher_classes');
      setAuthFeedback('✅ Демо-класс 7А засеян! Открыт экран долгосрочной аналитики.');
    } catch (e: any) {
      console.warn('handleSeedClassAndAnalytics notice:', e);
      setSubScreen('teacher_classes');
    }
  };

  const handleTabChange = (newTab: TabType) => {
    haptics.selection();
    setSubScreen(null);
    setTab(newTab);
  };

  // Render content according to active Tab & Role
  const renderTabContent = () => {
    if (subScreen === 'role_select') {
      const isFirstLaunch = !localStorage.getItem('lisquiz_user_role');
      return (
        <RoleSelectScreen
          currentRole={role}
          onClose={isFirstLaunch ? undefined : () => setSubScreen(null)}
          onSelectRole={(newRole) => {
            try {
              localStorage.setItem('lisquiz_user_role', newRole);
            } catch {}
            handleRoleSwitch(newRole);
            setSubScreen(null);
            setTab('home');
          }}
        />
      );
    }
    if (subScreen === 'teacher_classes') {
      return (
        <TeacherClassManagement
          initialCreateOpen={classModalInitialOpen}
          onBack={() => {
            setSubScreen(null);
            setClassModalInitialOpen(false);
          }}
          onSelectClassForQuiz={(cls) => {
            setQuizSubject(cls.subject);
            setQuizGrade(cls.grade);
            setQuizClass(cls.name);
            setQuizClassId(cls.id);
            setSubScreen('teacher_quizzes');
          }}
        />
      );
    }
    if (subScreen === 'teacher_quizzes') {
      return (
        <TeacherCreateQuiz
          initialClassId={quizClassId}
          initialClassName={quizClass}
          onBack={() => setSubScreen(null)}
          onQuizCreated={(roomData: any) => {
            if (roomData) {
              setActivePin(roomData.room_code);
              setTeacherToken(roomData.teacher_token);
              if (roomData.class_id) setQuizClassId(roomData.class_id);
              if (roomData.subject) setQuizSubject(roomData.subject);
              if (roomData.grade) {
                setQuizGrade(roomData.grade);
                setQuizClass(`${roomData.grade}А`);
              }
              if (roomData.quiz_title) setQuizTitle(roomData.quiz_title);
            }
            setSubScreen(null);
            setTab('leaderboard');
          }}
        />
      );
    }
    if (subScreen === 'student_waiting') {
      return (
        <StudentWaitingLobby
          roomCode={activePin}
          playerName={studentName}
          playerAvatar={studentAvatar}
          subject={quizSubject}
          grade={quizGrade}
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
      const totalQ = currentQuestionData?.total_questions ?? 3;
      const qObj = currentQuestionData?.question;
      const shapeMap: Record<number, 'triangle' | 'diamond' | 'circle' | 'square'> = {
        0: 'triangle',
        1: 'diamond',
        2: 'circle',
        3: 'square',
      };
      const colorMap: Record<number, 'red' | 'blue' | 'yellow' | 'green'> = {
        0: 'red',
        1: 'blue',
        2: 'yellow',
        3: 'green',
      };
      const normalizeColor = (c: any, idx: number): 'red' | 'blue' | 'yellow' | 'green' => {
        if (c === 'red' || c === 'orange') return 'red';
        if (c === 'blue') return 'blue';
        if (c === 'yellow') return 'yellow';
        if (c === 'green') return 'green';
        return colorMap[idx % 4] || 'blue';
      };
      const normalizeShape = (s: any, idx: number): 'triangle' | 'diamond' | 'circle' | 'square' => {
        if (s === 'triangle') return 'triangle';
        if (s === 'diamond') return 'diamond';
        if (s === 'circle') return 'circle';
        if (s === 'square') return 'square';
        return shapeMap[idx % 4] || 'circle';
      };
      const options = qObj?.options?.map((opt: any, idx: number) => ({
        id: `opt_${opt.id}`,
        text: opt.text,
        color: normalizeColor(opt.color, idx),
        shape: normalizeShape(opt.symbol || opt.shape, idx),
      })) || undefined;

      return (
        <StudentGameQuestion
          key={`q_${qIndex}_${qObj?.id || 0}`}
          questionNumber={qIndex + 1}
          totalQuestions={totalQ}
          subjectTitle={currentQuestionData?.subject || quizSubject}
          classNameTitle={currentQuestionData?.class_name || quizClass}
          questionText={qObj?.text}
          latex={qObj?.latex}
          options={options}
          tier={currentQuestionData?.tier || 2}
          is_boss={currentQuestionData?.is_boss || false}
          timeLimitSec={currentQuestionData?.time_limit_sec || 25}
          answeredCount={currentQuestionData?.answered_count ?? 0}
          totalStudents={currentQuestionData?.total_players ?? 0}
          onBack={() => setSubScreen(null)}
          onGameFinished={(finishData) => {
            haptics.notification('success');
            const topPlayers = finishData?.top_players || [];
            const myPlayer = topPlayers.find((p: any) =>
              (studentPlayerId && p.id === studentPlayerId) ||
              (p.name && p.name.trim().toLowerCase() === studentName.trim().toLowerCase())
            );
            const myScore = myPlayer?.score ?? (studentQuizStatsRef.current.score > 0 ? studentQuizStatsRef.current.score : (personalAnswerResult?.total_score || 850));
            const myRank = myPlayer?.rank ?? (
              topPlayers.length > 0
                ? topPlayers.filter((p: any) => (p.score ?? 0) > myScore).length + 1
                : 1
            );
            setQuizFinishData({
              top_players: topPlayers,
              myScore: myScore,
              myRank: myRank,
              correctCount: studentQuizStatsRef.current.correct,
              wrongCount: studentQuizStatsRef.current.wrong,
              totalQuestions: currentQuestionData?.total_questions || studentQuizStatsRef.current.total || totalQ,
            });
            setSubScreen('student_quiz_finish');
          }}
          onAnswerSubmit={(optionId, _isCorrect, responseTimeMs, tabBlurred) => {
            const parsed = parseInt(optionId.replace('opt_', ''), 10);
            const rawId = isNaN(parsed) ? 0 : parsed;
            if (socketService.isConnected()) {
              socketService.send('SUBMIT_ANSWER', {
                question_id: qObj?.id ?? 1,
                option_id: rawId,
                time_taken_sec: responseTimeMs / 1000,
                tab_blurred: tabBlurred,
              });
            }
            // Transition directly to student_round_wait, keeping in sync with teacher
            setSubScreen('student_round_wait');
          }}
        />
      );
    }
    if (subScreen === 'teacher_game') {
      return (
        <TeacherLiveGame
          roomCode={activePin}
          initialQuestionData={currentQuestionData}
          subject={quizSubject}
          classNameTitle={quizClass}
          onFinishQuiz={() => {
            socketService.disconnect();
            setLastFinishedRoomCode(activePin);
            setActivePin('');
            setTeacherToken('');
            setSubScreen(null);
            setTab('stats');
          }}
        />
      );
    }
    if (subScreen === 'feedback_correct' || subScreen === 'feedback_wrong') {
      return (
        <FeedbackStreak
          isCorrect={subScreen === 'feedback_correct'}
          points={personalAnswerResult?.points_awarded || 750}
          streak={personalAnswerResult?.streak || 1}
          correctAnswer={personalAnswerResult?.correct_option_text}
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
            setPersonalAnswerResult(null);
            setSubScreen('student_game');
          }}
          onGameFinished={(finishData) => {
            haptics.notification('success');
            const topPlayers = finishData?.top_players || [];
            const myPlayer = topPlayers.find((p: any) =>
              (studentPlayerId && p.id === studentPlayerId) ||
              (p.name && p.name.trim().toLowerCase() === studentName.trim().toLowerCase())
            );
            const myScore = myPlayer?.score ?? (studentQuizStatsRef.current.score > 0 ? studentQuizStatsRef.current.score : (personalAnswerResult?.total_score || 850));
            const myRank = myPlayer?.rank ?? (
              topPlayers.length > 0
                ? topPlayers.filter((p: any) => (p.score ?? 0) > myScore).length + 1
                : 1
            );
            setQuizFinishData({
              top_players: topPlayers,
              myScore: myScore,
              myRank: myRank,
              correctCount: studentQuizStatsRef.current.correct,
              wrongCount: studentQuizStatsRef.current.wrong,
              totalQuestions: currentQuestionData?.total_questions || studentQuizStatsRef.current.total || 3,
            });
            setSubScreen('student_quiz_finish');
          }}
        />
      );
    }
    if (subScreen === 'student_quiz_finish') {
      return (
        <StudentQuizFinish
          playerId={studentPlayerId}
          playerName={studentName}
          playerAvatar={studentAvatar}
          topPlayers={quizFinishData?.top_players || []}
          myScore={quizFinishData?.myScore || personalAnswerResult?.total_score || 750}
          myRank={quizFinishData?.myRank}
          correctCount={quizFinishData?.correctCount ?? 4}
          wrongCount={quizFinishData?.wrongCount ?? 1}
          totalQuestions={quizFinishData?.totalQuestions ?? 5}
          onGoToLeaderboard={(earnedPoints, rank) => {
            socketService.disconnect();
            setActivePin('');
            setLeaderboardBoostPoints(earnedPoints || quizFinishData?.myScore || 150);
            setLeaderboardBoostRank(rank || quizFinishData?.myRank || null);
            setSubScreen('student_leaderboard');
          }}
          onBackToHome={() => setSubScreen(null)}
        />
      );
    }
    if (subScreen === 'student_leaderboard') {
      return (
        <StudentLeaderboard
          boostPoints={leaderboardBoostPoints}
          boostRank={leaderboardBoostRank}
          currentStudentName={studentName || 'Артём К'}
          currentStudentAvatar={studentAvatar || 'raccoon'}
          currentScore={quizFinishData?.myScore || 750}
          currentRank={quizFinishData?.myRank || 4}
          onBack={() => setSubScreen('student_quiz_finish')}
          onClearBoost={() => {
            setLeaderboardBoostPoints(null);
            setLeaderboardBoostRank(null);
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
                if (payload.joinData?.player_id) {
                  setStudentPlayerId(payload.joinData.player_id);
                }
                socketService.connect(payload.pin, payload.joinData.session_token)
                  .then(() => {
                    setSubScreen('student_waiting');
                  })
                  .catch((err) => {
                    socketService.disconnect();
                    setSubScreen(null);
                    setAuthFeedback(err?.message || 'Комната не найдена или не отвечает');
                  });
              onGoToGrove={() => handleTabChange('grove')}
              onGoToLeaderboard={() => handleTabChange('leaderboard')}
              onGoToClasses={() => setSubScreen('teacher_classes')}
              onSwitchToTeacher={() => setSubScreen('role_select')}
              appMode={appMode}
            />
          );
        case 'grove':
          return (
            <ClassGrove
              appMode={appMode}
              onBack={() => handleTabChange('home')}
              onStartQuiz={() => setSubScreen('student_game')}
              onOpenLeaderboard={() => handleTabChange('leaderboard')}
              onOpenStats={() => handleTabChange('stats')}
            />
          );
              onOpenLeaderboard={() => handleTabChange('leaderboard')}
              onOpenStats={() => handleTabChange('stats')}
            />
          );
        case 'leaderboard':
          return (
            <StudentLeaderboard
              boostPoints={leaderboardBoostPoints}
              boostRank={leaderboardBoostRank}
              currentStudentName={studentName || 'Артём К'}
              currentStudentAvatar={studentAvatar || 'raccoon'}
              currentScore={quizFinishData?.myScore || 750}
              currentRank={quizFinishData?.myRank || 4}
              onBack={() => handleTabChange('home')}
              onClearBoost={() => {
                setLeaderboardBoostPoints(null);
                setLeaderboardBoostRank(null);
              }}
            />
          );
        case 'stats':
          return <StudentStats onBack={() => handleTabChange('home')} />;
      }
    }

    // Role: TEACHER
    if (role === 'teacher') {
      switch (tab) {
        case 'home':
          return (
            <TeacherHomeScreen
              onCreateQuiz={() => {
                haptics.impact('medium');
                setSubScreen('teacher_quizzes');
              }}
              onOpenClasses={() => {
                haptics.impact('medium');
                setSubScreen('teacher_classes');
              }}
              onOpenQuizzes={() => {
                haptics.impact('medium');
                setSubScreen('teacher_quizzes');
              }}
              onSwitchRole={() => {
                haptics.impact('light');
                setSubScreen('role_select');
              }}
            />
          );
        case 'grove':
          return (
            <ClassGrove
              onBack={() => handleTabChange('home')}
              onStartQuiz={() => handleTabChange('leaderboard')}
              onOpenLeaderboard={() => handleTabChange('leaderboard')}
              onOpenStats={() => handleTabChange('stats')}
            />
          );
        case 'leaderboard':
          return (
            <TeacherLobby
              pin={activePin}
              teacherToken={teacherToken}
              quizTitle={quizTitle}
              subject={quizSubject}
              grade={quizGrade}
              onRoomReady={(pin, token) => {
                setActivePin(pin);
                setTeacherToken(token);
              }}
              onQuizTitleChange={(newTitle) => setQuizTitle(newTitle)}
              onNavigateToCreateQuiz={() => {
                setSubScreen('teacher_quizzes');
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
          return (
            <TeacherGapReport
              roomCode={lastFinishedRoomCode || activePin}
              quizTitle={quizTitle}
              topic={quizSubject}
              grade={quizGrade}
              onBackToLobby={() => {
                socketService.disconnect();
                setActivePin('');
                setTeacherToken('');
                setSubScreen(null);
                setTab('leaderboard');
              }}
            />
          );
      }
    }

    return null;
  };

  const isStatsTab = tab === 'stats' || subScreen === 'teacher_report';

  const activeBg = (tab === 'home' && !subScreen)
    ? "url('/assets/backgrounds/main_menu_clean.png')"
    : (tab === 'grove' && !subScreen)
    ? "url('/assets/backgrounds/grove_bg_clean.png')"
    : isStatsTab
    ? 'radial-gradient(#F5EBD7 1px, transparent 1px)'
    : "url('/assets/backgrounds/quiz_bg_clean.png')";

  const showTopHeader = (tab as string) !== 'home' && (tab as string) !== 'leaderboard' && !isStatsTab && (role as string) !== 'student' && !subScreen;
  const showBottomDock = !subScreen;

  return (
    <div className="desktop-shell-wrapper">
      {/* Top Mode Header: User vs Developer mode switcher & Role selector */}
      <div className="mode-switcher-bar">
        <div style={styles.modeBarBrand}>
          <span style={{ fontSize: 18 }}>🦊</span>
          <span style={styles.modeBarTitle}>Лисквиз</span>
          <span style={styles.modeBarVersion}>v2.2</span>
        </div>

        {/* Central Role Selector: Student vs Teacher */}
        <div style={styles.roleHeaderSwitch}>
          <button
            onClick={() => handleRoleSwitch('student')}
            style={{
              ...styles.roleHeaderBtn,
              backgroundColor: role === 'student' ? 'rgba(16, 185, 129, 0.24)' : 'transparent',
              borderColor: role === 'student' ? '#10B981' : 'transparent',
              color: role === 'student' ? '#34D399' : '#94A3B8',
              fontWeight: role === 'student' ? 800 : 600,
              boxShadow: role === 'student' ? '0 0 12px rgba(16, 185, 129, 0.35)' : 'none',
            }}
            title="Переключиться на версию Ученика"
          >
            <span>🦊 Версия Ученика</span>
          </button>
          <button
            onClick={() => handleRoleSwitch('teacher')}
            style={{
              ...styles.roleHeaderBtn,
              backgroundColor: role === 'teacher' ? 'rgba(255, 122, 0, 0.24)' : 'transparent',
              borderColor: role === 'teacher' ? '#FF7A00' : 'transparent',
              color: role === 'teacher' ? '#FFA726' : '#94A3B8',
              fontWeight: role === 'teacher' ? 800 : 600,
              boxShadow: role === 'teacher' ? '0 0 12px rgba(255, 122, 0, 0.35)' : 'none',
            }}
            title="Переключиться на версию Учителя"
          >
            <span>🦉 Версия Учителя</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SoundToggleButton variant="pill" />
          <div style={styles.modeSwitchTabs}>
            <button
              onClick={() => handleModeChange('user')}
              style={{
                ...styles.modeSwitchBtn,
                backgroundColor: appMode === 'user' ? '#10B981' : 'transparent',
                color: appMode === 'user' ? '#FFFFFF' : '#94A3B8',
                fontWeight: appMode === 'user' ? 800 : 600,
              }}
              title="Пользовательский интерфейс"
            >
              👤 Пользователь
            </button>
            <button
              onClick={() => handleModeChange('dev')}
              style={{
                ...styles.modeSwitchBtn,
                backgroundColor: appMode === 'dev' ? '#FF7A00' : 'transparent',
                color: appMode === 'dev' ? '#FFFFFF' : '#94A3B8',
                fontWeight: appMode === 'dev' ? 800 : 600,
              }}
              title="Панель тестирования разработчика"
            >
              🛠️ Для разработчиков
            </button>
          </div>
        </div>
      </div>

      <div className="desktop-layout">
        {/* ========================================================
            MOBILE PHONE FRAME (Authentic Sferum / MAX experience)
           ======================================================== */}
        <div
        className="app-container"
        style={{
          backgroundColor: isStatsTab ? '#FAF4E8' : '#0B132B',
          backgroundImage: activeBg,
          backgroundPosition: 'center top',
          backgroundSize: isStatsTab ? '24px 24px' : 'cover',
          backgroundRepeat: isStatsTab ? 'repeat' : 'no-repeat',
        }}
      >
        {/* Mobile Top App Bar: Grove Stats + Role Switch (hidden on home, leaderboard, all student screens, and any subscreen) */}
        {showTopHeader && (
          <header style={styles.topHeader}>
          <div style={styles.topStatsGroup}>
            <div style={styles.topStatPill} title="Стрик 5 дней">
              <Flame size={14} color="#FF7A00" />
              <span style={styles.topStatVal}>5</span>
            </div>
            <div style={styles.topStatPill} title="Здоровье Древа 95%">
              <Droplets size={13} color="#34D399" />
              <span style={styles.topStatVal}>95%</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* User Profile / Zero-PII Badge Pill */}
            <button
              onClick={() => {
                haptics.impact('light');
                setAuthModalOpen(true);
              }}
              style={styles.userProfilePill}
              title="Профиль и авторизация Сферум / MAX"
            >
              <span style={{ fontSize: 13 }}>{role === 'teacher' ? '🦉' : '🦊'}</span>
              <span style={styles.userNamePillText}>
                {currentUser?.display_name || (role === 'teacher' ? 'Учитель' : studentName)}
              </span>
              <div style={styles.userOnlineDot} title="В сети" />
            </button>

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
          </div>
        </header>
        )}

        {/* ========================================================
            SFERUM / MAX AUTHENTICATION & ZERO-PII MODAL
           ======================================================== */}
        <AnimatePresence>
          {authModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.authModalBackdrop}
              onClick={() => setAuthModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.92, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 16 }}
                style={styles.authModalCard}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div style={styles.authModalHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={20} color="#10B981" />
                    <span style={styles.authModalTitle}>Сферум / MAX ID</span>
                  </div>
                  <button
                    onClick={() => setAuthModalOpen(false)}
                    style={styles.authModalCloseBtn}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* User Info Card */}
                <div style={styles.authModalProfileCard}>
                  <div style={styles.authAvatarBadge}>
                    {role === 'teacher' ? '🦉' : '🦊'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={styles.authModalName}>
                        {currentUser?.display_name || (role === 'teacher' ? 'Марья Ивановна' : studentName)}
                      </span>
                      <span style={role === 'teacher' ? styles.authRoleBadgeTeacher : styles.authRoleBadgeStudent}>
                        {role === 'teacher' ? 'Учитель' : 'Ученик'}
                      </span>
                    </div>
                    <div style={styles.authZeroPiiId} title="ID пользователя">
                      <span style={{ color: '#9CA3AF' }}>ID:</span>{' '}
                      <code>{currentUser?.pseudonym_id || 'pid_pending'}</code>
                    </div>
                  </div>
                </div>

                {/* Security compliance banner */}
                <div style={styles.authSecurityNote}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#10B981', fontWeight: 700, fontSize: 11, marginBottom: 3 }}>
                    <CheckCircle2 size={13} color="#10B981" />
                    <span>Анонимная защита данных</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 }}>
                    Телефон и персональные данные не сохраняются. Авторизация происходит по защищенному крипто-тикету бота.
                  </p>
                </div>

                {/* Status banner */}
                <div style={styles.authStatusRow}>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>Статус сессии:</span>
                  <span style={{ fontSize: 11, color: '#34D399', fontWeight: 700 }}>
                    🟢 Активна (JWT токен)
                  </span>
                </div>

                {/* Bot Simulation Section */}
                <div style={styles.authSimSection}>
                  <span style={styles.authSimTitle}>🤖 Симуляция /start (Тест без токена)</span>
                  <p style={styles.authSimDesc}>
                    Когда токен бота выдадут — вход будет работать автоматически по команде <code>/start</code> в боте. Сейчас вы можете проверить этот сценарий кнопкой ниже:
                  </p>
                  
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => handleSimulateBotStart(role)}
                      disabled={authLoading}
                      style={styles.authSimBtnPrimary}
                    >
                      <Bot size={15} />
                      <span>{authLoading ? 'Обработка...' : `Симулировать /start (${role === 'teacher' ? 'Учитель' : 'Ученик'})`}</span>
                    </button>
                  </div>
                </div>

                {authFeedback && (
                  <div style={styles.authFeedbackAlert}>
                    {authFeedback}
                  </div>
                )}

                {/* Switch quick roles */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => {
                      handleRoleSwitch('teacher');
                      setAuthFeedback('Переключено на профиль Учителя');
                    }}
                    style={{
                      ...styles.authQuickSwitchBtn,
                      borderColor: role === 'teacher' ? '#3B82F6' : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    🦉 Как Учитель
                  </button>
                  <button
                    onClick={() => {
                      handleRoleSwitch('student');
                      setAuthFeedback('Переключено на профиль Ученика');
                    }}
                    style={{
                      ...styles.authQuickSwitchBtn,
                      borderColor: role === 'student' ? '#10B981' : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    🦊 Как Ученик
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Screen Body */}
        <main
          style={{
            ...styles.mainContent,
            paddingBottom: showBottomDock ? 74 : 0,
          }}
        >
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
            TELEGRAM FLOATING CAPSULE NAVIGATION DOCK (4 Tabs with Role Labels)
            Distinguishes Teacher ("Кабинет", "Роща", "Лобби", "Отчёт")
            and Student ("Главная", "Роща", "Рейтинг", "Достижения")
           ======================================================== */}
        {showBottomDock && (
          <div style={styles.dockWrapper}>
            <nav style={styles.bottomNavDock}>
              {/* Tab 1: Домой / Кабинет */}
              {(() => {
                const isActive = (tab as string) === 'home';
                const label = role === 'teacher' ? 'Кабинет' : 'Главная';
                const accent = role === 'teacher' ? '#FF7A00' : '#10B981';
                const activeBg = role === 'teacher' ? 'rgba(255, 122, 0, 0.16)' : 'rgba(16, 185, 129, 0.14)';
                return (
                  <button
                    onClick={() => handleTabChange('home')}
                    style={styles.navBtn}
                    title={label}
                  >
                    <div
                      style={{
                        ...styles.navIconCircle,
                        backgroundColor: isActive ? activeBg : 'transparent',
                        border: isActive ? `2px solid ${accent}` : '2px solid transparent',
                      }}
                    >
                      <Home size={19} color={isActive ? accent : '#94A3B8'} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span
                      style={{
                        ...styles.navLabel,
                        color: isActive ? accent : '#94A3B8',
                        fontWeight: isActive ? 800 : 600,
                      }}
                    >
                      {label}
                    </span>
                  </button>
                );
              })()}

              {/* Tab 2: Роща */}
              {(() => {
                const isActive = tab === 'grove' && !subScreen;
                const label = 'Роща';
                const accent = role === 'teacher' ? '#FF7A00' : '#10B981';
                const activeBg = role === 'teacher' ? 'rgba(255, 122, 0, 0.16)' : 'rgba(16, 185, 129, 0.14)';
                return (
                  <button
                    onClick={() => handleTabChange('grove')}
                    style={styles.navBtn}
                    title={label}
                  >
                    <div
                      style={{
                        ...styles.navIconCircle,
                        backgroundColor: isActive ? activeBg : 'transparent',
                        border: isActive ? `2px solid ${accent}` : '2px solid transparent',
                      }}
                    >
                      <Sprout size={19} color={isActive ? accent : '#94A3B8'} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span
                      style={{
                        ...styles.navLabel,
                        color: isActive ? accent : '#94A3B8',
                        fontWeight: isActive ? 800 : 600,
                      }}
                    >
                      {label}
                    </span>
                  </button>
                );
              })()}

              {/* Tab 3: Рейтинг / Лобби */}
              {(() => {
                const isActive = tab === 'leaderboard' && !subScreen;
                const label = role === 'teacher' ? 'Лобби' : 'Рейтинг';
                const accent = role === 'teacher' ? '#FF7A00' : '#10B981';
                const activeBg = role === 'teacher' ? 'rgba(255, 122, 0, 0.16)' : 'rgba(16, 185, 129, 0.14)';
                return (
                  <button
                    onClick={() => handleTabChange('leaderboard')}
                    style={styles.navBtn}
                    title={label}
                  >
                    <div
                      style={{
                        ...styles.navIconCircle,
                        backgroundColor: isActive ? activeBg : 'transparent',
                        border: isActive ? `2px solid ${accent}` : '2px solid transparent',
                      }}
                    >
                      <Crown size={19} color={isActive ? accent : '#94A3B8'} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span
                      style={{
                        ...styles.navLabel,
                        color: isActive ? accent : '#94A3B8',
                        fontWeight: isActive ? 800 : 600,
                      }}
                    >
                      {label}
                    </span>
                  </button>
                );
              })()}

              {/* Tab 4: Статистика / Отчёт (Teacher & Student) */}
              {(() => {
                const isActive = (tab as string) === 'stats' && !subScreen;
                const label = role === 'teacher' ? 'Отчёт' : 'Достижения';
                const accent = role === 'teacher' ? '#FF7A00' : '#10B981';
                const activeBg = role === 'teacher' ? 'rgba(255, 122, 0, 0.16)' : 'rgba(16, 185, 129, 0.14)';
                return (
                  <button
                    onClick={() => handleTabChange('stats')}
                    style={styles.navBtn}
                    title={label}
                  >
                    <div
                      style={{
                        ...styles.navIconCircle,
                        backgroundColor: isActive ? activeBg : 'transparent',
                        border: isActive ? `2px solid ${accent}` : '2px solid transparent',
                      }}
                    >
                      <BarChart2 size={19} color={isActive ? accent : '#94A3B8'} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span
                      style={{
                        ...styles.navLabel,
                        color: isActive ? accent : '#94A3B8',
                        fontWeight: isActive ? 800 : 600,
                      }}
                    >
                      {label}
                    </span>
                  </button>
                );
              })()}
            </nav>
          </div>
        )}
      </div>

      {/* ========================================================
          DESKTOP DEV TOOLS SIDEBAR (Outside mobile screen)
          Only rendered in Developer mode
         ======================================================== */}
      {appMode === 'dev' && (
        <aside className="dev-sidebar">
        <div style={styles.devHeader}>
          <Wrench size={16} color="#FF7A00" />
          <span style={styles.devTitle}>Кнопки для разработчиков</span>
        </div>
        <p style={styles.devSub}>Быстрый переход к экранам и мокам:</p>

        <div style={styles.devList}>
          {/* Section 1: Teacher */}
          <div style={{ padding: '4px 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase' }}>
              🦉 Для Учителя
            </span>
          </div>

          <button
            onClick={() => {
              setRole('teacher');
              setTab('home');
              setSubScreen(null);
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(255, 122, 0, 0.4)', color: '#FDBA74' }}
          >
            🏠 Кабинет учителя
          </button>

          <button
            onClick={() => {
              setRole('teacher');
              setTab('leaderboard');
              setSubScreen(null);
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(245, 158, 11, 0.4)', color: '#FDE68A' }}
          >
            👥 Лобби викторины (PIN)
          </button>

          <button
            onClick={handleQuickBotGame}
            style={{ ...styles.devBtn, borderColor: 'rgba(16, 185, 129, 0.4)', color: '#6EE7B7' }}
          >
            🎮 Запустить игру с 4 ботами
          </button>

          <button
            onClick={() => {
              setRole('teacher');
              setSubScreen('teacher_classes');
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#93C5FD' }}
          >
            🏫 Мои классы и рейтинг
          </button>

          <button
            onClick={() => {
              setRole('teacher');
              setSubScreen('teacher_quizzes');
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(16, 185, 129, 0.4)', color: '#6EE7B7' }}
          >
            📝 Конструктор викторин
          </button>

          <button
            onClick={() => {
              setRole('teacher');
              setSubScreen('teacher_game');
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#93C5FD' }}
          >
            📺 Проектор: Игра Live
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
            onClick={handleSeedClassAndAnalytics}
            style={{ ...styles.devBtn, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#93C5FD' }}
          >
            🏫 Засеять класс 7А (аналитика)
          </button>

          <button
            onClick={() => {
              setRole('teacher');
              setTab('leaderboard');
              setSubScreen(null);
              setTimeout(() => testHarness.addMockStudents(activePin, 5), 300);
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(245, 158, 11, 0.4)', color: '#FDE68A' }}
          >
            🤖 +5 ботов в лобби
          </button>

          <div style={styles.devDivider} />

          {/* Section 2: Student */}
          <div style={{ padding: '4px 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>
              🦊 Для Ученика
            </span>
          </div>

          <button
            onClick={() => {
              setRole('student');
              setTab('home');
              setSubScreen(null);
            }}
            style={{ ...styles.devBtn, borderColor: 'rgba(16, 185, 129, 0.4)', color: '#6EE7B7' }}
          >
            🔑 Домой: Вход по PIN (Ученик)
          </button>

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
              setQuizFinishData({
                top_players: [
                  { rank: 1, id: 's1', name: 'Иван К', avatar: 'fox_smart', score: 980 },
                  { rank: 2, id: 's2', name: 'Аня Смирнова', avatar: 'owl', score: 870 },
                  { rank: 3, id: 's3', name: 'Максим Петров', avatar: 'bear', score: 760 },
                  { rank: 4, id: 's4', name: 'Лена Морозова', avatar: 'bunny', score: 620 },
                ],
                myScore: 980,
                correctCount: 3,
                wrongCount: 0,
                totalQuestions: 3,
              });
              setSubScreen('student_quiz_finish');
            }}
            style={styles.devBtn}
          >
            🥇 Итоги викторины (Пьедестал)
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

          {/* Section 3: General */}
          <div style={{ padding: '4px 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#A78BFA', textTransform: 'uppercase' }}>
              ⚙️ Общие инструменты
            </span>
          </div>

          <button
            onClick={() => {
              setSubScreen('role_select');
            }}
            style={{ ...styles.devBtn, borderColor: '#F59E0B', color: '#FDE68A' }}
          >
            🎭 Экран выбора роли
          </button>

          <button
            onClick={() => setAuthModalOpen(true)}
            style={{ ...styles.devBtn, borderColor: 'rgba(16, 185, 129, 0.4)', color: '#6EE7B7' }}
          >
            🔐 Авторизация Сферум / MAX
          </button>

          <button
            onClick={() => handleSimulateBotStart(role)}
            style={{ ...styles.devBtn, borderColor: 'rgba(168, 85, 247, 0.4)', color: '#D8B4FE' }}
          >
            🤖 Симулировать /start в боте
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
      )}

      {/* Floating Toggle for Dev tools on small mobile screens */}
      {appMode === 'dev' && (
        <button
          className="mobile-dev-toggle"
          onClick={() => setIsMobileDevOpen((prev) => !prev)}
          title="Кнопки для разработчиков"
        >
          <Wrench size={18} color="#FFFFFF" />
        </button>
      )}

      {/* Mobile Dev Drawer */}
      {appMode === 'dev' && isMobileDevOpen && (
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
          {/* Quick QA Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            <button
              onClick={() => {
                handleQuickBotGame();
                setIsMobileDevOpen(false);
              }}
              style={{ ...styles.mobileDevBtn, backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981', color: '#6EE7B7' }}
            >
              🎮 Игра с ботами
            </button>
            <button
              onClick={() => {
                handleSeedClassAndAnalytics();
                setIsMobileDevOpen(false);
              }}
              style={{ ...styles.mobileDevBtn, backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3B82F6', color: '#93C5FD' }}
            >
              🏫 Засеять 7А
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
            <button
              onClick={() => {
                setRole('teacher');
                setSubScreen('teacher_classes');
                setIsMobileDevOpen(false);
              }}
              style={{ ...styles.mobileDevBtn, color: '#93C5FD' }}
            >
              🏫 Классы
            </button>
            <button
              onClick={() => {
                setSubScreen('role_select');
                setIsMobileDevOpen(false);
              }}
              style={{ ...styles.mobileDevBtn, color: '#FDE68A' }}
            >
              🎭 Выбор роли
            </button>
            <button
              onClick={() => {
                setAuthModalOpen(true);
                setIsMobileDevOpen(false);
              }}
              style={{ ...styles.mobileDevBtn, color: '#6EE7B7' }}
            >
              🔐 Сферум ID
            </button>
            <button
              onClick={() => {
                handleSimulateBotStart(role);
                setIsMobileDevOpen(false);
              }}
              style={{ ...styles.mobileDevBtn, color: '#D8B4FE' }}
            >
              🤖 Бот /start
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modeBarBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  modeBarTitle: {
    fontFamily: "'Comfortaa', 'Nunito', cursive, sans-serif",
    fontSize: 15,
    fontWeight: 900,
    color: '#F8FAFC',
    letterSpacing: '-0.3px',
  },
  modeBarVersion: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 10,
    fontWeight: 800,
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    padding: '1px 6px',
  },
  modeSwitchTabs: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 3,
    borderRadius: 9999,
  },
  roleHeaderSwitch: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    padding: 3,
    borderRadius: 9999,
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  roleHeaderBtn: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 12,
    borderRadius: 9999,
    padding: '5px 12px',
    border: '1.5px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  modeSwitchBtn: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 11.5,
    borderRadius: 9999,
    padding: '5px 12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
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
    height: '100%',
    flex: 1,
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
    display: 'flex',
    justifyContent: 'center',
  },
  bottomNavDock: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 58,
    width: '100%',
    maxWidth: 310,
    backgroundColor: '#FFFDF2',
    border: '2px solid #F3EEDB',
    borderBottom: '4px solid #E5DBC7',
    borderRadius: 9999,
    padding: '2px 8px',
    boxShadow: '0 10px 24px rgba(45, 30, 10, 0.16)',
    pointerEvents: 'auto',
  },
  navBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 0',
    transition: 'all 0.18s ease',
  },
  navIconCircle: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.18s ease',
  },
  navLabel: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 10,
    letterSpacing: '0.1px',
    lineHeight: 1,
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
  userProfilePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 999,
    padding: '4px 8px',
    cursor: 'pointer',
    color: '#FFFFFF',
  },
  userNamePillText: {
    fontSize: 11,
    fontWeight: 700,
    maxWidth: 68,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 6px #10B981',
  },
  authModalBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 100,
  },
  authModalCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    padding: '18px 16px',
    width: '100%',
    maxWidth: 380,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
  },
  authModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  authModalTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  authModalCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
  },
  authModalProfileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  authAvatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    flexShrink: 0,
  },
  authModalName: {
    fontSize: 14,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  authRoleBadgeTeacher: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 999,
    border: '1px solid rgba(59, 130, 246, 0.35)',
  },
  authRoleBadgeStudent: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 999,
    border: '1px solid rgba(16, 185, 129, 0.35)',
  },
  authZeroPiiId: {
    fontSize: 11,
    marginTop: 4,
  },
  authSecurityNote: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.22)',
    borderRadius: 10,
    padding: '8px 10px',
    marginBottom: 10,
  },
  authStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: '6px 10px',
    marginBottom: 12,
  },
  authSimSection: {
    backgroundColor: 'rgba(255, 122, 0, 0.08)',
    border: '1px solid rgba(255, 122, 0, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  authSimTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: '#FF7A00',
    display: 'block',
    marginBottom: 4,
  },
  authSimDesc: {
    margin: 0,
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 1.4,
  },
  authSimBtnPrimary: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF7A00',
    border: 'none',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: 12,
    padding: '9px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(255, 122, 0, 0.3)',
  },
  authFeedbackAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    color: '#34D399',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 600,
    marginTop: 8,
    textAlign: 'center',
  },
  authQuickSwitchBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid',
    borderRadius: 10,
    padding: '8px',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
  },
};
