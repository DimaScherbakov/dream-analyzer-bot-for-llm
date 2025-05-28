// Загружаем переменные окружения
import 'dotenv/config';
import Server from './server';

// Проверяем наличие обязательных переменных окружения
function checkEnvironmentVariables(): void {
    const requiredVars = ['BOT_TOKEN', 'GEMINI_API_KEY'];
    const missingVars: string[] = [];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    }

    if (missingVars.length > 0) {
        console.error('❌ Отсутствуют обязательные переменные окружения:');
        missingVars.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('\nСоздайте файл .env на основе .env.example и заполните необходимые значения.');
        process.exit(1);
    }

    console.log('✅ Все обязательные переменные окружения найдены');
}

// Обработчики сигналов для graceful shutdown
function setupGracefulShutdown(server: Server): void {
    const shutdown = async (signal: string): Promise<void> => {
        console.log(`\n📤 Получен сигнал ${signal}. Завершение работы...`);

        try {
            await server.stop();
            console.log('✅ Сервер остановлен корректно');
            process.exit(0);
        } catch (error) {
            console.error('❌ Ошибка при остановке сервера:', error);
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Обработка необработанных исключений
    process.on('uncaughtException', (error: Error) => {
        console.error('❌ Необработанное исключение:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
        console.error('❌ Необработанный отказ промиса:', reason);
        console.error('Promise:', promise);
        process.exit(1);
    });
}

// Главная функция запуска приложения
async function main(): Promise<void> {
    try {
        console.log('🚀 Запуск Dream Analyzer Bot...\n');

        // Проверяем переменные окружения
        checkEnvironmentVariables();

        // Выводим информацию о конфигурации
        console.log('📋 Конфигурация:');
        console.log(`   - Режим: ${process.env.WEBHOOK_URL ? 'Webhook' : 'Polling'}`);
        console.log(`   - Порт: ${process.env.PORT || 3000}`);
        console.log(`   - Redis: ${process.env.REDIS_URL ? 'Включен' : 'Отключен (используется память)'}`);
        if (process.env.WEBHOOK_URL) {
            console.log(`   - Webhook URL: ${process.env.WEBHOOK_URL}`);
        }
        console.log('');

        // Создаем и запускаем сервер
        const server = new Server();

        // Настраиваем graceful shutdown
        setupGracefulShutdown(server);

        // Запускаем сервер
        await server.start();

        console.log('🎉 Dream Analyzer Bot успешно запущен!\n');

    } catch (error) {
        console.error('❌ Ошибка при запуске:', error);
        process.exit(1);
    }
}

// Запускаем приложение
if (require.main === module) {
    main();
}

export { main };
