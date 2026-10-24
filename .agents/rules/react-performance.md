---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.tsx"
---
# React & Mobile Sferum Performance (Lisquiz ECC)

## Анимации и рендеринг (60 FPS на смартфонах)
- Анимировать только свойства `transform` (`translate3d`, `scale`) и `opacity`.
- Избегать анимации `width`, `height`, `top`, `left`, вызывающих reflow страницы.
- Использовать `will-change: transform` для тяжелых анимированных слоев дерева и частиц.

## Мемоизация и очистка памяти
- Оборачивать списки игроков и карточек в `React.memo` / `useMemo`, чтобы тики таймера не вызывали ререндер всей страницы.
- В хуках `useEffect` всегда возвращать функцию отписки: очищать `setInterval`, `setTimeout`, `cancelAnimationFrame` и WebSocket event listeners.
- При вызове тактильного отклика использовать `haptics` сервис аккуратно, без спама на каждый кадр.
