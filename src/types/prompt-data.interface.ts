/**
 * Structure passed to the Gemini API. The interpreter is a string key
 * referencing which dream interpreter methodology should be applied. The
 * grammY version uses a single interpreter ('miller'), but the type is
 * preserved for future expansion. The answers array contains optional
 * clarifying responses from the user.
 */
export interface PromptData {
  interpreter: string;
  dreamText: string;
  answers: string[];
}