import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, HelpCircle, CheckCircle, RotateCw } from 'lucide-react';
import { haptics } from '../services/haptics';
import confetti from 'canvas-confetti';

interface StudentRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  skillId?: string;
  basePoints?: number;
  onPointsRestored: (points: number) => void;
}

export default function StudentRedemptionModal({
  isOpen,
  onClose,
  studentId = 'std_ivan',
  skillId = 'P7.DENS.CALC',
  basePoints = 750,
  onPointsRestored,
}: StudentRedemptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [quest, setQuest] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const createQuest = async () => {
      try {
        setLoading(true);
        setResult(null);
        setSelectedOption(null);

        const res = await fetch('/api/ml2/redemption/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            target_skill_id: skillId,
            base_points: basePoints,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setQuest(data);
        } else {
          // Fallback isomorphic question
          setQuest({
            redemption_id: `redempt_${Date.now()}`,
            target_skill: skillId,
            potential_recovery_points: Math.round(basePoints * 0.6),
            hint: 'Плотность равна массе, деленной на объем: ρ = m / V. Обратите внимание на единицы измерения!',
            isomorphic_item: {
              stem: 'Масса алюминиевого бруска равна 540 г, а его объем — 200 см³. Какова плотность алюминия?',
              options: ['2.7 г/см³', '3.2 г/см³', '1.8 г/см³', '4.5 г/см³'],
              correct_index: 0,
            },
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    createQuest();
  }, [isOpen, studentId, skillId, basePoints]);

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || isSubmitting || !quest) return;
    haptics.impact('medium');
    setIsSubmitting(true);

    const isCorrect = selectedOption === (quest.isomorphic_item?.correct_index ?? 0);
    const potentialPts = quest.potential_recovery_points || Math.round(basePoints * 0.6);

    try {
      const res = await fetch('/api/ml2/redemption/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redemption_id: quest.redemption_id,
          is_correct: isCorrect,
          potential_points: potentialPts,
        }),
      });

      let resData = null;
      if (res.ok) {
        resData = await res.json();
      } else {
        resData = {
          is_recovered: isCorrect,
          points_restored: isCorrect ? potentialPts : 0,
          status_badge: isCorrect ? `Ошибка исправлена! +${potentialPts} очков` : 'Хорошая попытка! Опыт все равно растет',
        };
      }

      setResult(resData);

      if (isCorrect) {
        haptics.notification('success');
        try {
          confetti({
            particleCount: 100,
            spread: 60,
            origin: { y: 0.5 },
            colors: ['#10B981', '#34D399', '#FCD34D', '#FFFFFF'],
          });
        } catch {}
        onPointsRestored(resData.points_restored);
      } else {
        haptics.notification('warning');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const item = quest?.isomorphic_item;
  const potential = quest?.potential_recovery_points || Math.round(basePoints * 0.6);

  return (
    <div style={styles.backdrop}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        style={styles.modalCard}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconCircle}>
              <Sparkles size={18} color="#059669" />
            </div>
            <div>
              <h2 style={styles.title}>Работа над ошибками</h2>
              <span style={styles.badgeBonus}>+{potential} очков (60% возврат)</span>
            </div>
          </div>

          <button onClick={onClose} style={styles.closeBtn} title="Закрыть">
            <X size={20} color="#7D5A3A" />
          </button>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <RotateCw size={24} color="#10B981" className="animate-spin" />
            <span style={styles.loadingText}>Подбираем новую изоморфную задачу...</span>
          </div>
        ) : result ? (
          /* Result Celebration View */
          <div style={styles.resultBox}>
            {result.is_recovered ? (
              <div style={styles.celebrationCol}>
                <div style={styles.successIconCircle}>
                  <CheckCircle size={44} color="#10B981" />
                </div>
                <h3 style={styles.successTitle}>Ошибка повержена!</h3>
                <span style={styles.restoredPointsText}>
                  +{result.points_restored} очков возвращено классу
                </span>
                <p style={styles.resultDesc}>
                  Ты разобрался в теме и не сдался! Роща растет еще быстрее.
                </p>
                <button onClick={onClose} style={styles.actionBtn}>
                  Продолжить игру
                </button>
              </div>
            ) : (
              <div style={styles.celebrationCol}>
                <div style={styles.retryIconCircle}>
                  <HelpCircle size={44} color="#F59E0B" />
                </div>
                <h3 style={styles.retryTitle}>Почти получилось!</h3>
                <p style={styles.resultDesc}>
                  Главное — попытка! Учитель увидит твое старание в отчете урока.
                </p>
                <button onClick={onClose} style={styles.actionBtnSecondary}>
                  Дальше
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Question View */
          <div style={styles.body}>
            {/* Pedagogical Hint from Sprint */}
            <div style={styles.hintCard}>
              <div style={styles.hintHeader}>
                <span style={styles.hintMascot}>Совет от Спринта</span>
              </div>
              <p style={styles.hintText}>{quest?.hint || 'Вспомните базовые формулы и правила!'}</p>
            </div>

            {/* Fresh Isomorphic Problem */}
            <div style={styles.questionCard}>
              <span style={styles.qTitle}>Новая задача с другими числами</span>
              <p style={styles.qStem}>{item?.stem || 'Решите задачу'}</p>

              <div style={styles.optionsList}>
                {item?.options?.map((opt: string, idx: number) => {
                  const isSelected = selectedOption === idx;
                  return (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        haptics.selection();
                        setSelectedOption(idx);
                      }}
                      style={{
                        ...styles.optionBtn,
                        backgroundColor: isSelected ? '#10B981' : '#FFFFFF',
                        border: isSelected ? '2px solid #059669' : '1.5px solid #E5C39E',
                        boxShadow: isSelected ? '0 2px 0 #047857' : '0 2px 0 #EAD7C2',
                      }}
                    >
                      <span
                        style={{
                          ...styles.optLetter,
                          color: isSelected ? '#FFFFFF' : '#8B5A2B',
                        }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span
                        style={{
                          ...styles.optText,
                          color: isSelected ? '#FFFFFF' : '#2B1D0C',
                          fontWeight: isSelected ? 800 : 700,
                        }}
                      >
                        {opt}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              disabled={selectedOption === null || isSubmitting}
              onClick={handleSubmitAnswer}
              style={{
                ...styles.actionBtn,
                opacity: selectedOption === null || isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? 'Проверяем ответ...' : 'Проверить и вернуть очки'}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(43, 29, 12, 0.65)',
    zIndex: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    boxSizing: 'border-box',
    backdropFilter: 'blur(8px)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFDF9',
    border: '2.5px solid #E5C39E',
    boxShadow: '0 8px 32px rgba(74, 46, 24, 0.25)',
    borderRadius: 24,
    padding: 18,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '92vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 900,
    color: '#4A2E18',
    margin: 0,
  },
  badgeBonus: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: 800,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    padding: '30px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#7D5A3A',
    fontWeight: 700,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  hintCard: {
    backgroundColor: '#FEF9C3',
    border: '1.5px solid #FDE047',
    borderRadius: 14,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  hintHeader: {
    display: 'flex',
    alignItems: 'center',
  },
  hintMascot: {
    fontSize: 12,
    fontWeight: 800,
    color: '#B45309',
  },
  hintText: {
    fontSize: 12,
    color: '#713F12',
    lineHeight: 1.4,
    margin: 0,
  },
  questionCard: {
    backgroundColor: '#FAF5EE',
    border: '1.5px solid #E5C39E',
    borderRadius: 16,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  qTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: '#8D5422',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  qStem: {
    fontSize: 14,
    fontWeight: 800,
    color: '#2B1D0C',
    lineHeight: 1.4,
    margin: 0,
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  optionBtn: {
    borderRadius: 14,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  optLetter: {
    fontSize: 13,
    fontWeight: 900,
    width: 16,
  },
  optText: {
    fontSize: 13,
  },
  actionBtn: {
    background: 'linear-gradient(180deg, #34D399 0%, #10B981 100%)',
    border: '2.5px solid #A7F3D0',
    boxShadow: '0 4px 0 #047857, 0 6px 14px rgba(16, 185, 129, 0.25)',
    borderRadius: 999,
    padding: '12px 16px',
    fontSize: 15,
    fontWeight: 900,
    color: '#FFFFFF',
    cursor: 'pointer',
    touchAction: 'manipulation',
    marginTop: 4,
    outline: 'none',
  },
  actionBtnSecondary: {
    backgroundColor: '#FFFDF9',
    border: '2px solid #E5C39E',
    boxShadow: '0 3px 0 #D8BEA3',
    borderRadius: 999,
    padding: '12px 16px',
    fontSize: 15,
    fontWeight: 800,
    color: '#4A2E18',
    cursor: 'pointer',
    touchAction: 'manipulation',
    marginTop: 4,
    outline: 'none',
  },
  resultBox: {
    padding: '20px 10px',
  },
  celebrationCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 10,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryIconCircle: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: '#15803D',
    margin: 0,
  },
  retryTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: '#A16207',
    margin: 0,
  },
  restoredPointsText: {
    fontSize: 16,
    fontWeight: 900,
    color: '#15803D',
  },
  resultDesc: {
    fontSize: 13,
    color: '#6A4A28',
    lineHeight: 1.4,
    maxWidth: 280,
    margin: 0,
    fontWeight: 600,
  },
};
