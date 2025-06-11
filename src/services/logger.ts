import {LOG_FOLDER} from "../constants";
import * as fs from "node:fs";
import path from "node:path";
import * as os from "node:os";

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
}
