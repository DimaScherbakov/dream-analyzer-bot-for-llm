import { RedisClientType, createClient } from 'redis';
import { Session } from "../types/session.interface";
import { SessionStorage } from "../types/session-storage.interface";
import {Logger} from "../services/logger";

export class RedisSessionStorage implements SessionStorage {
  private redisClient: RedisClientType | null = null;

  constructor() {
    this.#initRedis();
  }

    async #initRedis(): Promise<void> {
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
      console.log('Redis connection failed:', (error as Error).message);
      this.redisClient = null;
    }
  }

  async getSession(userId: number): Promise<Session> {
    try {
      if (!this.redisClient) {
        throw new Error('Redis client is not available');
      }
      const sessionData = await this.redisClient.get(`session:${userId}`);
      let session = this.createNewSession();
      if (sessionData) {
          session = JSON.parse(sessionData);
      } else {
          Logger.users(userId);
      }
      return session;
    } catch (error) {
      console.error('Error getting session from Redis:', error);
      return this.createNewSession();
    }
  }

  async setSession(userId: number, sessionData: Session): Promise<void> {
    try {
      if (!this.redisClient) {
        throw new Error('Redis client is not available');
      }
      const ttl = await this.redisClient.ttl(`session:${userId}`);
      const dayTtl = 3600 * 24; // TTL 24 часа
      Logger.log('Setting session in Redis:', userId, 'TTL:', ttl);
      await this.redisClient.setEx(
        `session:${userId}`,
        ttl > 0 ? ttl : dayTtl, // если TTL уже установлен, используем его, иначе устанавливаем 24 часа
        JSON.stringify(sessionData),
      );
    } catch (error) {
      console.error('Error setting session in Redis:', error);
      throw error;
    }
  }

  async deleteSession(userId: string): Promise<void> {
    try {
      if (!this.redisClient) {
        throw new Error('Redis client is not available');
      }
      await this.redisClient.del(`session:${userId}`);
    } catch (error) {
      console.error('Error deleting session from Redis:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
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
