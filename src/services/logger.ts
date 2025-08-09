import { LOG_FOLDER } from '../constants';
import * as fs from 'node:fs';
import path from 'node:path';

/**
 * Simple logging utility. Writes log entries to a dated file in the
 * user-specific log directory. Both general log messages and user-specific
 * activity can be recorded. This implementation mirrors the original
 * behaviour and is provided for backward compatibility.
 */
export class Logger {
  /**
   * Append a message to the daily log. Ensures the log directory exists
   * before writing.
   */
  public static log(...args: any[]) {
    console.log(...args);
    if (!fs.existsSync(LOG_FOLDER)) {
      fs.mkdirSync(LOG_FOLDER, { recursive: true });
    }
    const logFilePath = path.join(LOG_FOLDER, `${new Date().toISOString().split('T')[0]}.txt`);
    if (!fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '', 'utf8');
    }
    const time = new Date().toLocaleTimeString();
    const logData = `[${time}] ${args.join(' ')}\n`;
    fs.appendFileSync(logFilePath, logData, 'utf8');
  }

  /**
   * Append a user-specific entry to a separate users log. Creates the log
   * directory and file if necessary. The timestamp is formatted to
   * YYYY-MM-DD HH:MM:SS.
   */
  public static users(...args: any[]) {
    if (!fs.existsSync(LOG_FOLDER)) {
      fs.mkdirSync(LOG_FOLDER, { recursive: true });
    }
    const usersFilePath = path.join(LOG_FOLDER, `users.txt`);
    if (!fs.existsSync(usersFilePath)) {
      fs.writeFileSync(usersFilePath, '', 'utf8');
    }
    const now = new Date();
    const formatted = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now
      .getDate()
      .toString()
      .padStart(2, '0')} ${now
      .getHours()
      .toString()
      .padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now
      .getSeconds()
      .toString()
      .padStart(2, '0')}`;
    const logData = `[${formatted}] ${args.join(' ')}\n`;
    fs.appendFileSync(usersFilePath, logData, 'utf8');
  }
}