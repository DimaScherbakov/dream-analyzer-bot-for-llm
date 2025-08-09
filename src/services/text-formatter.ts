export class TextFormatter {
  /**
   * Remove emojis from a string. This uses a regular expression to strip
   * various Unicode ranges commonly used for emoji characters. The method
   * mirrors the original implementation and is retained here for
   * completeness, though it is not currently used by the grammY bot.
   */
  public static removeEmojis(text: string): string {
    return text
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])+/g, '')
      .replace(/([\u200D\uFE0F]|\uD83D[\uDC00-\uDE4F]|\uD83C[\uDF00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g, '')
      .trim();
  }

  /**
   * Escape characters that have a special meaning in Markdown formatting. This
   * function replaces dots, underscores and other symbols with their escaped
   * equivalents. Although the grammY implementation does not currently use
   * this helper, it is left here for future reuse.
   */
  public static escapeMarkdown(text: string): string {
    return text
      .replace(/\./g, '\\.')
      .replace(/_/g, '\\_')
      .replace(/\n\*\s/g, '\n')
      .replace(/\*\*/g, '\*')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/`/g, '\\`')
      .replace(/-/g, '\\-')
      .replace(/\+/g, '\\+')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/!/g, '\\!')
      .replace(/#/g, '\\#');
  }

  /**
   * Truncate a string to a maximum length. The function attempts to cut at
   * a word boundary so as not to split words. If the string is shorter
   * than the maximum, it is returned unchanged.
   */
  public static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    const truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > 0) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    return truncated + '...';
  }
}