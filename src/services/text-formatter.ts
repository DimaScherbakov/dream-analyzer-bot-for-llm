export class TextFormatter {
    public static removeEmojis(text: string): string {
        // Регулярное выражение для поиска эмодзи
        return text.replace(
            /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])+/g,
            ''
        ).replace(
            /([\u200D\uFE0F]|\uD83D[\uDC00-\uDE4F]|\uD83C[\uDF00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g,
            ''
        ).trim();
    }

    public static escapeMarkdown(text: string): string {
        return text
            .replace(/\./g, "\\.")
            .replace(/_/g, "\\_")
            .replace(/\n\*\s/g, "\n")
            .replace(/\*\*/g, "\*")
            .replace(/\[/g, "\\[")
            .replace(/\]/g, "\\]")
            .replace(/`/g, "\\`")
            .replace(/-/g, "\\-")
            .replace(/\+/g, "\\+")
            .replace(/\(/g, "\\(")
            .replace(/\)/g, "\\)")
            .replace(/!/g, "\\!")
            .replace(/#/g, "\\#");
    }

    public static truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) {
            return text;
        }

        // Обрезаем по словам, чтобы не разрывать предложения
        const truncated = text.substring(0, maxLength);
        const lastSpaceIndex = truncated.lastIndexOf(' ');

        if (lastSpaceIndex > 0) {
            return truncated.substring(0, lastSpaceIndex) + '\.\.\.';
        }

        return truncated + '\.\.\.';
    }
}
