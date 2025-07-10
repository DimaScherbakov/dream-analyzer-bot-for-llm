import {LOG_FOLDER} from "../constants";
import * as fs from "node:fs";
import path from "node:path";

export class Logger {

    public static log(...args: any[]) {
        console.log(...args);
        // Создаем директорию для логов, если она не существует
        if (!fs.existsSync(LOG_FOLDER)) {
            fs.mkdirSync(LOG_FOLDER, { recursive: true });
        }
        // Проверяем существование файла лога для текущей даты
        const logFilePath = path.join(LOG_FOLDER, `${new Date().toISOString().split('T')[0]}.txt`);
        if (!fs.existsSync(logFilePath)) {
            fs.writeFileSync(logFilePath, '', 'utf8');
        }
        const time = new Date().toLocaleTimeString();
        const logData = `[${time}] ${args.join(' ')}\n`;

        fs.appendFileSync(logFilePath, logData, 'utf8');
    }

    public static users(...args: any[]) {
        // Создаем директорию для логов, если она не существует
        if (!fs.existsSync(LOG_FOLDER)) {
            fs.mkdirSync(LOG_FOLDER, { recursive: true });
        }
        // Проверяем существование файла лога для текущей даты
        const usersFilePath = path.join(LOG_FOLDER, `users.txt`);
        if (!fs.existsSync(usersFilePath)) {
            fs.writeFileSync(usersFilePath, '', 'utf8');
        }
        const now = new Date();
        const formatted = `${now.getFullYear()}-${(now.getMonth() + 1)
            .toString()
            .padStart(2, '0')}-${now.getDate()
            .toString()
            .padStart(2, '0')} ${now.getHours()
            .toString()
            .padStart(2, '0')}:${now.getMinutes()
            .toString()
            .padStart(2, '0')}:${now.getSeconds()
            .toString()
            .padStart(2, '0')}`;

        const logData = `[${formatted}] ${args.join(' ')}\n`;

        fs.appendFileSync(usersFilePath, logData, 'utf8');
    }
}
