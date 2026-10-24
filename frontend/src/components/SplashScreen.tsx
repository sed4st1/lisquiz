import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  onLoaded?: () => void; // Функция, вызываемая после завершения анимации
  autoDismissMs?: number; // Длительность махания хвостом (по умолчанию 2000мс)
};

/**
 * Векторный хвост лисенка Спринта:
 * Прорисован векторный пушистый хвост с шерстинками и белоснежным кончиком.
 * Весит несколько килобайт, идеально рендерится на Retina и 120Hz экранах.
 */
function FoxTailSvg() {
  return (
    <svg
      viewBox="0 0 180 260"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible', filter: 'drop-shadow(-8px 16px 24px rgba(0,0,0,0.22))' }}
    >
      <defs>
        {/* Теплый градиент рыжей шубки */}
        <linearGradient id="tailFurOrange" x1="160" y1="240" x2="30" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C95800" />
          <stop offset="35%" stopColor="#E66A00" />
          <stop offset="70%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#FFA23A" />
        </linearGradient>

        {/* Мягкий градиент белого пушистого кончика */}
        <linearGradient id="tailTipWhite" x1="60" y1="90" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F3F4F6" />
          <stop offset="60%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        {/* Внутренний блик для объема */}
        <linearGradient id="tailHighlight" x1="140" y1="180" x2="50" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Основное пушистое тело хвоста */}
      <path
        d="M175 255 
           C 165 210, 155 170, 130 130
           C 112 102, 85 75, 58 52
           C 42 38, 30 25, 22 15
           C 15 28, 12 48, 14 68
           C 16 92, 26 116, 40 138
           C 58 168, 86 198, 118 222
           C 142 240, 160 250, 175 255 Z"
        fill="url(#tailFurOrange)"
      />

      {/* Пушистые зубчики шерсти на изгибе */}
      <path
        d="M58 52 
           C 50 62, 44 74, 38 88
           L 46 86
           C 34 100, 26 114, 22 130
           L 32 126
           C 22 144, 20 162, 24 178
           L 34 172
           C 30 190, 38 206, 52 220
           C 74 238, 110 250, 140 255
           L 175 255"
        fill="none"
        stroke="#D95F00"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Белый пушистый кончик хвоста с характерными зигзагами */}
      <path
        d="M22 15
           C 30 25, 42 38, 58 52
           C 48 57, 40 65, 48 74
           C 38 78, 32 86, 40 94
           C 28 97, 22 108, 28 116
           C 20 102, 16 86, 14 68
           C 12 48, 15 28, 22 15 Z"
        fill="url(#tailTipWhite)"
      />

      {/* Разделительные пушистые штрихи кончика */}
      <path
        d="M48 74 C 42 77, 36 80, 40 94"
        stroke="#E5E7EB"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M40 94 C 34 97, 28 102, 28 116"
        stroke="#E5E7EB"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Мягкий световой блик по хребту хвоста */}
      <path
        d="M150 230
           C 125 180, 95 130, 60 80
           C 50 66, 38 52, 28 40"
        stroke="url(#tailHighlight)"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

export default function SplashScreen({ onLoaded, autoDismissMs = 2000 }: Props) {
  const [step, setStep] = useState<'wagging' | 'revealing' | 'done'>('wagging');

  useEffect(() => {
    // 1. Через 2 секунды махания хвостом переходим к появлению логотипа
    const wagTimer = setTimeout(() => {
      setStep('revealing');

      // 2. Через 850мс после появления логотипа завершаем сплэш-экран
      const revealTimer = setTimeout(() => {
        setStep('done');
        if (onLoaded) {
          onLoaded();
        }
      }, 850);

      return () => clearTimeout(revealTimer);
    }, autoDismissMs);

    return () => clearTimeout(wagTimer);
  }, [onLoaded, autoDismissMs]);

  if (step === 'done') return null;

  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeInOut' } }}
    >
      {/* Декоративное мягкое свечение в центре */}
      <div className="splash-ambient-glow" />

      {/* Шаг 1: Пушистый рыжий хвостик Спринта машет у правого края экрана */}
      <AnimatePresence>
        {step === 'wagging' && (
          <motion.div
            key="tail"
            className="splash-tail-container"
            initial={{ x: 140, y: 30, opacity: 0, rotate: 15 }}
            animate={{
              x: 0,
              y: 0,
              opacity: 1,
              rotate: [10, -22, 14, -18, 8, -6, 0],
            }}
            exit={{
              x: 180,
              y: 40,
              opacity: 0,
              rotate: 25,
              transition: { duration: 0.4, ease: 'easeIn' },
            }}
            transition={{
              duration: 2.0,
              ease: 'easeInOut',
              times: [0, 0.2, 0.4, 0.6, 0.8, 0.9, 1],
            }}
          >
            <FoxTailSvg />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Шаг 2: Эффектное появление логотипа «ЛисКвиз» по центру */}
      <AnimatePresence>
        {step === 'revealing' && (
          <motion.div
            key="logo"
            className="splash-logo-container"
            initial={{ scale: 0.75, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.05, opacity: 0, transition: { duration: 0.25 } }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 22,
            }}
          >
            {/* Иконка лисенка / лапки над названием */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 18 }}
              className="splash-mascot-icon"
            >
              🦊
            </motion.div>

            <h1 className="splash-logo-text">
              Лис<span>Квиз</span>
            </h1>

            <motion.p
              className="splash-subtitle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              Умные викторины для школы
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
