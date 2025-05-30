import { Session } from "./session.interface";

export interface SessionStorage {
  getSession(userId: number): Promise<Session>;
  setSession(userId: number, sessionData: Session): Promise<void>;
  deleteSession(userId: string): Promise<void>;
  close(): Promise<void>;
} 