<script setup lang="ts">
import { ref } from 'vue';
import imageCompression from 'browser-image-compression';

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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`, {
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
  <label v-if="!isSettingsValid" class="block w-full max-w-xs bg-orange-500 text-white text-center py-4 rounded-xl shadow-lg cursor-pointer active:bg-orange-600 transition-colors" @click.prevent="onClick">
    <span>設定が必要です</span>
  </label>

  <!-- 設定完了の場合 -->
  <div v-else class="w-full max-w-xs space-y-3">
    <!-- カメラ撮影 -->
    <label class="block bg-blue-600 text-white text-center py-4 rounded-xl shadow-lg cursor-pointer active:bg-blue-700 transition-colors">
      <span v-if="!isProcessing">写真を撮る</span>
      <span v-else>処理中...</span>
      <input type="file" accept="image/*" capture="environment" class="hidden" @change="onFileChange" :disabled="isProcessing" />
    </label>

    <!-- 写真フォルダから選択 -->
    <label class="block bg-gray-500 text-white text-center py-3 rounded-xl shadow-lg cursor-pointer active:bg-gray-600 transition-colors">
      <span v-if="!isProcessing">写真フォルダから選択</span>
      <span v-else>処理中...</span>
      <input type="file" accept="image/*" class="hidden" @change="onFileChange" :disabled="isProcessing" />
    </label>
  </div>
</template>