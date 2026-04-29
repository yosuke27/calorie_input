<script setup lang="ts">
import { ref } from 'vue';

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
const manualInput = ref('');
const showInputForm = ref(false);

/**
 * Gemini APIでテキストから栄養分析
 */
const analyzeTextWithGemini = async (text: string, apiKey: string): Promise<any[]> => {
  const prompt = `以下の食事内容を栄養分析してください。

### 入力:
${text}

### 条件:
1. 入力された食事内容を料理ごとに個別に特定すること。
2. 分量が明示されている場合はその分量、明示されていない場合は一般的な「1人前」として推定を行ってください。
3. 各料理の「カロリー(kcal)」「タンパク質(P)」「脂質(F)」「炭水化物(C)」を推定すること。
4. カロリーを算出した際の基準となった分量や想定量に関する説明文を「comment」として出力すること。
5. 結果は必ず以下のJSON配列形式のみで出力してください。 余計な解説文や Markdown の装飾は一切含めないでください。
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
            { text: prompt }
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
  
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
  
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('栄養分析結果を取得できませんでした');
};

/**
 * 手動入力の解析処理
 */
const analyzeManualInput = async () => {
  if (!manualInput.value.trim()) return;
  
  if (!props.isSettingsValid) {
    emit('require-settings');
    return;
  }

  isProcessing.value = true;
  emit('process-start');
  emit('process-update', '栄養分析中...');

  try {
    const results = await analyzeTextWithGemini(manualInput.value, props.apiKey!);
    emit('process-end', results, '');
  } catch (error: any) {
    console.error(error);
    emit('process-error', error.message || 'エラーが発生しました');
  } finally {
    isProcessing.value = false;
  }
};

const toggleInputForm = () => {
  showInputForm.value = !showInputForm.value;
};
</script>

<template>
  <div class="w-full max-w-xs mt-4">
    <!-- 入力フォーム表示ボタン -->
    <button 
      v-if="!showInputForm"
      @click="toggleInputForm"
      class="w-full max-w-xs block bg-gray-400 text-white text-center py-4 rounded-xl shadow-lg hover:bg-gray-500 transition-colors"
    >
      手動で入力
    </button>

    <!-- 入力フォーム -->
    <div v-if="showInputForm" class="w-full max-w-xs bg-white rounded-xl shadow-lg p-4 space-y-3">
      <div class="flex justify-between items-center">
        <span class="font-bold text-gray-700">手動入力</span>
        <button @click="toggleInputForm" class="text-gray-500 hover:text-gray-700">&times;</button>
      </div>
      
      <textarea
        v-model="manualInput"
        placeholder="例: サバ100g、ご飯一杯&#10;例: ラーメン一碗、饺子3個"
        class="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows="4"
      ></textarea>
      
      <button
        @click="analyzeManualInput"
        :disabled="isProcessing || !manualInput.trim()"
        class="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span v-if="!isProcessing">分析する</span>
        <span v-else>処理中...</span>
      </button>
    </div>
  </div>
</template>