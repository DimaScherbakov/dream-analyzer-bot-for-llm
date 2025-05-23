const redis = require('redis');
const { USER_STATES } = require('./constants');

class SessionManager {
  constructor() {
    this.sessions = new Map(); // Fallback для хранения в памяти
    this.redisClient = null;
    this.initRedis();
  }

  // Инициализация Redis (опционально)
  async initRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL
        });
        
        this.redisClient.on('error', (err) => {
          console.log('Redis Client Error:', err);
          this.redisClient = null;
        });

        await this.redisClient.connect();
        console.log('Connected to Redis');
      }
    } catch (error) {
      console.log('Redis connection failed, using in-memory storage:', error.message);
      this.redisClient = null;
    }
  }

  // Получить сессию пользователя
  async getSession(userId) {
    try {
      if (this.redisClient) {
        const sessionData = await this.redisClient.get(`session:${userId}`);
        return sessionData ? JSON.parse(sessionData) : this.createNewSession();
      } else {
        return this.sessions.get(userId) || this.createNewSession();
      }
    } catch (error) {
      console.error('Error getting session:', error);
      return this.createNewSession();
    }
  }

  // Сохранить сессию пользователя
  async setSession(userId, sessionData) {
    try {
      if (this.redisClient) {
        await this.redisClient.setEx(
          `session:${userId}`, 
          3600, // TTL 1 час
          JSON.stringify(sessionData)
        );
      } else {
        this.sessions.set(userId, sessionData);
      }
    } catch (error) {
      console.error('Error setting session:', error);
      // Fallback to memory storage
      this.sessions.set(userId, sessionData);
    }
  }

  // Удалить сессию пользователя
  async deleteSession(userId) {
    try {
      if (this.redisClient) {
        await this.redisClient.del(`session:${userId}`);
      } else {
        this.sessions.delete(userId);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      this.sessions.delete(userId);
    }
  }

  // Создать новую сессию
  createNewSession() {
    return {
      state: USER_STATES.WAITING_INTERPRETER,
      interpreter: null,
      dreamText: null,
      currentQuestion: 0,
      answers: [],
      createdAt: new Date().toISOString()
    };
  }

  // Обновить состояние сессии
  async updateSessionState(userId, updates) {
    const session = await this.getSession(userId);
    const updatedSession = { ...session, ...updates };
    await this.setSession(userId, updatedSession);
    return updatedSession;
  }

  // Добавить ответ на вопрос
  async addAnswer(userId, answer) {
    const session = await this.getSession(userId);
    session.answers.push(answer);
    session.currentQuestion++;
    await this.setSession(userId, session);
    return session;
  }

  // Сбросить сессию
  async resetSession(userId) {
    const newSession = this.createNewSession();
    await this.setSession(userId, newSession);
    return newSession;
  }

  // Закрыть соединение с Redis
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

module.exports = SessionManager;