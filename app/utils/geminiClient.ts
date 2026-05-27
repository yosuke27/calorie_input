import { getGeminiGenerateContentUrl } from '~/utils/constants';

export interface GeminiRequestOptions {
  contents: any[];
  systemInstruction?: any;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    [key: string]: any;
  };
}

export class GeminiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API Key is required');
    }
    this.apiKey = apiKey;
  }

  async generateContent(options: GeminiRequestOptions): Promise<string> {
    const response = await fetch(getGeminiGenerateContentUrl(this.apiKey), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: options.systemInstruction,
        contents: options.contents,
        generationConfig: options.generationConfig || {
          temperature: 0.4,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      let errorMessage = 'APIリクエストに失敗しました';
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        // JSONのパースに失敗した場合はデフォルトメッセージを使用
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      throw new Error('レスポンスが空でした');
    }

    return text;
  }
}
