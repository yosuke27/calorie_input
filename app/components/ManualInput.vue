<script setup lang="ts">
import { ref } from 'vue';
import { getGeminiGenerateContentUrl } from '~/utils/constants';

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

  const response = await fetch(getGeminiGenerateContentUrl(apiKey), {
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
  showInputForm.value = false; // 分析開始時にポップアップを閉じる（テキストは保持）
  emit('process-start');
  emit('process-update', '栄養分析中...');

  try {
    const results = await analyzeTextWithGemini(manualInput.value, props.apiKey!);
    emit('process-end', results, '');
    manualInput.value = ''; // 分析成功時に入力内容をクリア
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

const handleInitialClick = () => {
  if (!props.isSettingsValid) {
    emit('require-settings');
  } else {
    toggleInputForm();
  }
};

const resetForm = () => {
  manualInput.value = '';
  showInputForm.value = false;
};

defineExpose({
  resetForm
});
</script>

<template>
  <div class="contents">
    <!-- 入力フォーム表示ボタン -->
    <button 
      @click="handleInitialClick"
      class="w-20 h-20 flex justify-center items-center bg-gray-400 text-white rounded-full shadow-lg hover:bg-gray-500 transition-colors shrink-0"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>

    <!-- 入力フォーム モーダル -->
    <Transition name="fade">
      <div v-if="showInputForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="w-full max-w-xs bg-white rounded-xl shadow-xl p-5 space-y-4">
          <div class="flex justify-between items-center">
            <h2 class="font-bold text-gray-800 text-lg">手動入力</h2>
            <button @click="resetForm" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
          
          <textarea
            v-model="manualInput"
            placeholder="例: サバ100g、ご飯一杯&#10;例: ラーメン一碗、饺子3個"
            class="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="5"
          ></textarea>
          
          <button
            @click="analyzeManualInput"
            :disabled="isProcessing || !manualInput.trim()"
            class="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="!isProcessing">分析する</span>
            <span v-else>処理中...</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>