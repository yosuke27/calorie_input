export const GEMINI_API_VERSION = 'v1beta';
export const GEMINI_MODEL_NAME = 'gemini-3.1-flash-lite';
export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com';

export const getGeminiGenerateContentUrl = (apiKey: string) => {
  return `${GEMINI_API_BASE_URL}/${GEMINI_API_VERSION}/models/${GEMINI_MODEL_NAME}:generateContent?key=${apiKey}`;
};
