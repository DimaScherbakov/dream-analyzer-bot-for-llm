import { USER_STATES } from "./constants";
import type { RedisClientType } from 'redis'
import { createClient } from 'redis'
import {Session} from "./types/session.interface";

export default class SessionManager {
  private sessions: Map<string, Session>;
  private redisClient: RedisClientType | null;

  constructor() {
    this.sessions = new Map(); // Fallback для хранения в памяти
    this.redisClient = null;
    this.initRedis();
  }

  // Инициализация Redis (опционально)
  async initRedis(): Promise<void> {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = createClient({
          url: process.env.REDIS_URL
        });
        
        this.redisClient.on('error', (err: Error) => {
          console.log('Redis Client Error:', err);
          this.redisClient = null;
        });

        await this.redisClient.connect();
        console.log('Connected to Redis');
      }
    } catch (error: unknown) {
      console.log('Redis connection failed, using in-memory storage:', (error as Error).message);
      this.redisClient = null;
    }
  }

  // Получить сессию пользователя
  async getSession(userId: number): Promise<Session> {
    try {
      if (this.redisClient) {
        const sessionData = await this.redisClient.get(`session:${userId}`);
        return sessionData ? JSON.parse(sessionData) : this.createNewSession();
      } else {
        return this.sessions.get(`${userId}`) || this.createNewSession();
      }
    } catch (error) {
      console.error('Error getting session:', error);
      return this.createNewSession();
    }
  }

  // Сохранить сессию пользователя
  async setSession(userId: number, sessionData: Session): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.setEx(
          `session:${userId}`, 
          3600 * 24, // TTL 24 часа
          JSON.stringify(sessionData)
        );
      } else {
        this.sessions.set(`${userId}`, sessionData);
      }
    } catch (error) {
      console.error('Error setting session:', error);
      // Fallback to memory storage
      this.sessions.set(`${userId}`, sessionData);
    }
  }

  // Удалить сессию пользователя
  async deleteSession(userId: string): Promise<void> {
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
  createNewSession(): Session {
    return {
      state: USER_STATES.WAITING_INTERPRETER,
      interpreter: undefined,
      dreamText: undefined,
      currentQuestion: 0,
      answers: [],
      createdAt: new Date().toISOString(),
      countAIRequests: 0
    };
  }

  // Обновить состояние сессии
  async updateSessionState(userId: number, updates: Partial<Session>): Promise<Session> {
    const session = await this.getSession(userId);
    const updatedSession = { ...session, ...updates };
    await this.setSession(userId, updatedSession);
    return updatedSession;
  }

  // Добавить ответ на вопрос
  async addAnswer(userId: number, answer: any): Promise<Session> {
    const session = await this.getSession(userId);
    session.answers?.push(answer);
    session.currentQuestion++;
    await this.setSession(userId, session);
    return session;
  }

  // Сбросить сессию
  async resetSession(userId: number): Promise<Session> {
    const newSession = this.createNewSession();
    await this.setSession(userId, newSession);
    return newSession;
  }

  // Закрыть соединение с Redis
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
