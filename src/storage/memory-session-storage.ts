import { Session } from "../types/session.interface";
import { SessionStorage } from "../types/session-storage.interface";

export class MemorySessionStorage implements SessionStorage {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  async getSession(userId: number): Promise<Session> {
    return this.sessions.get(`${userId}`) || this.createNewSession();
  }

  async setSession(userId: number, sessionData: Session): Promise<void> {
    this.sessions.set(`${userId}`, sessionData);
  }

  async deleteSession(userId: string): Promise<void> {
    this.sessions.delete(userId);
  }

  async close(): Promise<void> {
    // Ничего не делаем, так как это хранилище в памяти
  }

  public createNewSession(): Session {
    return {
      state: "WAITING_INTERPRETER",
      interpreter: undefined,
      dreamText: undefined,
      currentQuestion: 0,
      answers: [],
      createdAt: new Date().toISOString(),
      countAIRequests: 0
    };
  }
} 
