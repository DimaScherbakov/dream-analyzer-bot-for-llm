export class TextFormatter {
    public static  removeEmojis(text: string): string {
        // Регулярное выражение для поиска эмодзи
        return text.replace(
            /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])+/g,
            ''
        ).replace(
            /([\u200D\uFE0F]|\uD83D[\uDC00-\uDE4F]|\uD83C[\uDF00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g,
            ''
        ).trim();
    }
}
