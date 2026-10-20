import React, { useState } from 'react'

export default function App() {
  const [role, setRole] = useState<'teacher' | 'student'>('teacher')

  return (
    <div className="app-container">
      <header className="header">
        <div className="brand">
          <span className="mascot-badge">🦊</span>
          <div>
            <h1>Лисквиз</h1>
            <p>Интерактивные викторины в Сферуме (MAX)</p>
          </div>
        </div>
        <div className="role-switch">
          <button 
            className={`btn-role ${role === 'teacher' ? 'active' : ''}`}
            onClick={() => setRole('teacher')}
          >
            Учитель
          </button>
          <button 
            className={`btn-role ${role === 'student' ? 'active' : ''}`}
            onClick={() => setRole('student')}
          >
            Ученик
          </button>
        </div>
      </header>

      <main className="content">
        {role === 'teacher' ? (
          <section className="card">
            <h2>Создание викторины с ИИ</h2>
            <p className="subtitle">Генерация по теме федеральной рабочей программы за 30 секунд</p>
            <div className="form-group">
              <label>Предмет</label>
              <input type="text" defaultValue="Математика" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Класс</label>
                <select defaultValue="5">
                  {[...Array(11)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} класс</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Количество вопросов</label>
                <input type="number" defaultValue="5" min="1" max="15" />
              </div>
            </div>
            <div className="form-group">
              <label>Тема урока</label>
              <input type="text" defaultValue="Обыкновенные дроби" />
            </div>
            <button className="btn-primary">
              ✨ Создать викторину с ИИ
            </button>
          </section>
        ) : (
          <section className="card">
            <h2>Подключение к игре</h2>
            <p className="subtitle">Вход в один клик без отдельной регистрации</p>
            <div className="form-group">
              <label>Код комнаты (PIN)</label>
              <input type="text" placeholder="Например: 482915" maxLength={6} />
            </div>
            <div className="form-group">
              <label>Имя или позывной</label>
              <input type="text" placeholder="Иван К." />
            </div>
            <button className="btn-primary">
              🎮 Войти в комнату
            </button>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Команда «Вабба-Лабба-Дэдлайн» • Всероссийский хакатон «Идея фикс» 2026</p>
      </footer>
    </div>
  )
}
