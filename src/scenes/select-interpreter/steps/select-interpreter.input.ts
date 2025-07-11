import {MyContext} from "../../../types/context.interface";
import DreamAnalyzerBot from "../../../bot";
import {DREAM_INTERPRETERS, USER_STATES} from "../../../constants";
import {Interpreter} from "../../../types/prompt-data.interface";
import {Markup} from "telegraf";

export const selectInterpreterInput =  async (ctx: MyContext, bot: DreamAnalyzerBot) =>  {
    console.log('[selectInterpreterInput] step started');
    try {
        await bot.sceneManager.deleteAll(ctx);

        const callbackData = (ctx.callbackQuery as any)?.data;
        const session = await bot.user.getDialogSession();
        if (callbackData === 'interpreter_confirm') {
            await handleInterpreterConfirm(ctx, bot);
            return ctx.scene.enter('userDreamInputScene');
        }

        const interpreterKey = callbackData?.replace('interpreter_', '');

        if (!interpreterKey || !DREAM_INTERPRETERS[interpreterKey]) {
            // const message = ctx.i18n.t("unknownInterpreter");
            // await ctx.answerCbQuery(message);
            await ctx.answerCbQuery('Неизвестный сонник');

            return;
        }

        // Проверяем, не выбран ли уже этот сонник
        if (session.interpreter === interpreterKey) {
            // const message = ctx.i18n.t("interpreterAlreadySelected");
            // await ctx.answerCbQuery(message);
            await ctx.answerCbQuery('Этот сонник уже выбран');
            return;
        }

        // Обновляем сессию
        await bot.user.updateDialogSession({
            state: USER_STATES.WAITING_DREAM,
            interpreter: interpreterKey as Interpreter,
        });

        await ctx.answerCbQuery(`Выбран ${DREAM_INTERPRETERS[interpreterKey].name}`);

        // Обновляем сообщение, показывая выбранный сонник и его описание
        const message = `Выбран сонник: ${DREAM_INTERPRETERS[interpreterKey].name}\n\n${DREAM_INTERPRETERS[interpreterKey].description}\n\nНажмите "Подтвердить" для продолжения или выберите другой сонник.`;
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                ...bot.sceneManager.interpreterButtons,
                [
                    Markup.button.callback('✅ Подтвердить', 'interpreter_confirm')
                ]
            ])
        });

    } catch (error) {
        console.error('Error in handleInterpreterChoice:', error);
        await ctx.answerCbQuery('Произошла ошибка');
        // const message = ctx.i18n.t("interpreterChoiceError");
        // await bot.sceneManager.replyAndStore(ctx, message, Markup.inlineKeyboard([bot.sceneManager.startButton]));
        await bot.sceneManager.replyAndStore(ctx,'Произошла ошибка при выборе сонника. Попробуйте начать заново /start');
    }
}

const handleInterpreterConfirm = async (ctx: MyContext, bot: DreamAnalyzerBot) => {
    const session = await bot.user.getDialogSession();
    if (!session.interpreter) {
        // const message = ctx.i18n.t("interpreterNotSelected");
        // await ctx.answerCbQuery(message);
        await ctx.answerCbQuery('Сначала выберите сонник');
        return;
    }

    const interpreter = DREAM_INTERPRETERS[session.interpreter];
    await ctx.answerCbQuery(`Выбран ${interpreter.name}`);
    await ctx.editMessageText(interpreter.description, {
        parse_mode: 'Markdown'
    });
    bot.sceneManager.store(ctx, ctx.callbackQuery?.message?.message_id || 0);
}
