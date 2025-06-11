import { USER_STATES } from "../constants";
import { Session } from "../types/session.interface";
import { SessionStorage } from "../types/session-storage.interface";
import { RedisSessionStorage } from "../storage/redis-session-storage";
import { MemorySessionStorage } from "../storage/memory-session-storage";

export class SessionManager {
  private storage: SessionStorage;

  constructor() {
    // Пытаемся использовать Redis, если не получится - используем память
    this.storage = process.env.REDIS_URL ? new RedisSessionStorage() : new MemorySessionStorage();
  }

  // Получить сессию пользователя
  async getSession(userId: number): Promise<Session> {
    return this.storage.getSession(userId);
  }

  // Сохранить сессию пользователя
  async setSession(userId: number, sessionData: Session): Promise<void> {
    await this.storage.setSession(userId, sessionData);
  }

  // Удалить сессию пользователя
  async deleteSession(userId: string): Promise<void> {
    await this.storage.deleteSession(userId);
  }

  // Обновить состояние сессии
  async updateSessionState(userId: number, updates: Partial<Session>): Promise<Session> {
    const session = await this.getSession(userId);
    const updatedSession = { ...session, ...updates };
    await this.setSession(userId, updatedSession);
    return updatedSession;
  }

  // Добавить ответ на вопрос
  async addAnswer(userId: number, answer: string): Promise<Session> {
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

  // Закрыть соединение с хранилищем
  async close(): Promise<void> {
    await this.storage.close();
  }

  private createNewSession(): Session {
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
}
