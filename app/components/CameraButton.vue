<script setup lang="ts">
import { ref } from 'vue';
import imageCompression from 'browser-image-compression';
import { GeminiClient } from '~/utils/geminiClient';

const props = defineProps<{
  apiKey: string | null;
  isSettingsValid: boolean;
}>();

const emit = defineEmits<{
  (e: 'require-settings'): void;
  (e: 'process-start'): void;
  (e: 'process-update', message: string): void;
  (e: 'process-end', results: any[], imagePreview: string): void;
  (e: 'process-error', message: string): void;
}>();

const isProcessing = ref(false);

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const analyzeWithGemini = async (base64Image: string, apiKey: string): Promise<any[]> => {
  const prompt = `添付された画像からすべての料理を識別し、以下の条件に従って栄養分析を行ってください。

### 条件:
1. 画像内の各料理を個別に特定すること。
2. 画像だけでは分量が正確に判別できない場合は、一般的な「1人前」の分量として推定を行ってください。
3. 各料理の「カロリー(kcal)」「タンパク質(P)」「脂質(F)」「炭水化物(C)」を推定すること。
4. カロリーを算出した際の基準となった分量や想定量（1人前、個数、グラム、mlなど）に関する説明文を「comment」として出力すること。
5. 結果は必ず以下のJSON配列形式のみで出力してください。余計な解説文や Markdown の装飾は一切含めないでください。
6. 数値はすべて数値型（number）として扱い、単位（gやkcal）は含めないでください。

### 出力フォーマット (JSON Array):
[
  {
    "dish_name": "料理名",
    "comment": "1人前（約200g）として算出など",
    "calorie": 0,
    "protein": 0,
    "fat": 0,
    "carbohydrate": 0,
    "confidence": 0.0
  }
]`;

  const response = await fetch(getGeminiGenerateContentUrl(apiKey), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image.split(',')[1] // data:image/jpeg;base64, を除去
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      }
    })
  });

  const result = await response.json();
  
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('栄養分析結果を取得できませんでした');
};

const onFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!props.isSettingsValid || !props.apiKey) {
    target.value = '';
    emit('require-settings');
    return;
  }

  isProcessing.value = true;
  emit('process-start');
  emit('process-update', '画像を圧縮中...');

  try {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true
    };

    const compressedFile = await imageCompression(file, options);
    const imagePreview = URL.createObjectURL(compressedFile);
    const base64 = await convertToBase64(compressedFile);
    
    emit('process-update', '栄養分析中...');
    const results = await analyzeWithGemini(base64, props.apiKey);
    
    emit('process-end', results, imagePreview);
  } catch (error: any) {
    console.error(error);
    emit('process-error', error.message || 'エラーが発生しました');
  } finally {
    isProcessing.value = false;
    target.value = ''; // 次回同じファイルを選べるようにリセット
  }
};

const onClick = () => {
  if (!props.isSettingsValid) {
    emit('require-settings');
  }
};
</script>

<template>
  <!-- 設定未完了の場合 -->
  <label v-if="!isSettingsValid" class="w-full flex justify-center items-center bg-orange-500 text-white font-bold h-16 rounded-xl shadow-lg cursor-pointer active:bg-orange-600 transition-colors" @click.prevent="onClick">
    <span>設定が必要です</span>
  </label>

  <!-- 設定完了の場合 -->
  <div v-else class="contents">
    <!-- カメラ撮影 -->
    <label class="w-20 h-20 flex justify-center items-center bg-blue-600 text-white rounded-full shadow-lg cursor-pointer active:bg-blue-700 transition-colors shrink-0">
      <div v-if="!isProcessing" class="flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <div v-else class="flex flex-col items-center">
        <svg class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <input type="file" accept="image/*" capture="environment" class="hidden" @change="onFileChange" :disabled="isProcessing" />
    </label>

    <!-- 写真フォルダから選択 -->
    <label class="w-20 h-20 flex justify-center items-center bg-gray-500 text-white rounded-full shadow-lg cursor-pointer active:bg-gray-600 transition-colors shrink-0">
      <div v-if="!isProcessing" class="flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
      <div v-else class="flex flex-col items-center">
        <svg class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <input type="file" accept="image/*" class="hidden" @change="onFileChange" :disabled="isProcessing" />
    </label>
  </div>
</template>