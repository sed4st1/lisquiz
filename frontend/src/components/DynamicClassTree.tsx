import React from 'react';
import { haptics } from '../services/haptics';

export interface DynamicClassTreeProps {
  /**
   * Growth stage of the Class Tree (1 to 6).
   * 1 = Золотой жёлудь
   * 2 = Росток знаний
   * 3 = Молодой дубок
   * 4 = Растущий дуб
   * 5 = Древо Мудрости (Канон)
   * 6 = Цветущее Древо
   * Default: 5
   */
  stage?: number;
  /**
   * Health / water saturation percentage according to Liebig's Law (0 - 100).
   * Default: 95
   */
  health?: number;
  /**
   * Class name label, e.g. "5А класс"
   */
  classNameTitle?: string;
  /**
   * Callback fired when stage changes (e.g. user toggles stages)
   */
  onStageChange?: (newStage: number) => void;
  /**
   * Callback fired when tree is clicked (e.g. navigate to full Class Grove)
   */
  onClick?: () => void;
  style?: React.CSSProperties;
}

const STAGE_NAMES: Record<number, string> = {
  1: 'Золотой жёлудь',
  2: 'Росток знаний',
  3: 'Молодой дубок',
  4: 'Растущий дуб',
  5: 'Древо Мудрости',
  6: 'Цветущее Древо',
};

export const DynamicClassTree: React.FC<DynamicClassTreeProps> = ({
  stage = 5,
  health: _health = 95,
  classNameTitle = '5А класс',
  onStageChange,
  onClick,
  style,
}) => {
  const safeStage = Math.max(1, Math.min(6, stage));
  const treeSrc = `/assets/grove/tree_stage_${safeStage}.png`;
  const stageName = STAGE_NAMES[safeStage] || 'Древо класса';

  const handleClick = () => {
    haptics.impact('light');
    if (onStageChange) {
      const nextStage = safeStage >= 6 ? 1 : safeStage + 1;
      onStageChange(nextStage);
    }
    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute',
        top: 102,
        right: -55,
        width: '72%',
        maxWidth: 330,
        aspectRatio: '1',
        zIndex: 4,
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        pointerEvents: 'auto',
        ...style,
      }}
      title={`Роща класса: ${classNameTitle} — ${stageName} (Нажмите, чтобы переключить стадию)`}
    >
      {/* 1. Deep Core Ground Contact Shadow on Hill Grass */}
      <div
        style={{
          position: 'absolute',
          bottom: '2%',
          left: '12%',
          width: '78%',
          height: '18%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(14, 40, 14, 0.88) 0%, rgba(14, 40, 14, 0.45) 50%, transparent 75%)',
          filter: 'blur(6px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 2. Soft Ambient Grass Occlusion Shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: '-3%',
          left: '6%',
          width: '90%',
          height: '26%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(20, 55, 20, 0.55) 0%, rgba(20, 55, 20, 0.15) 55%, transparent 75%)',
          filter: 'blur(12px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 3. Cliff-Edge Slope Anchor Shadow (under left rocks) */}
      <div
        style={{
          position: 'absolute',
          bottom: '4%',
          left: '10%',
          width: '42%',
          height: '22%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(10, 32, 10, 0.75) 0%, transparent 75%)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 3. Rock-solid static tree image - Native part of the landscape painting */}
      <img
        src={treeSrc}
        alt={`Древо ${classNameTitle} — ${stageName}`}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'bottom center',
          filter: 'drop-shadow(0 4px 10px rgba(18, 45, 18, 0.20))',
          pointerEvents: 'none',
          zIndex: 2,
          transformOrigin: 'bottom center',
        }}
      />
    </div>
  );
};

export default DynamicClassTree;
