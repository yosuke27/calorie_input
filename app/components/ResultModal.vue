<script setup lang="ts">
import { ref } from 'vue';

const showModal = ref(false);
const nutritionResults = ref<any[]>([]);
const isSubmitting = ref(false);
const submitMessage = ref('');
const registeredAt = ref('');

const getCurrentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${date}T${hours}:${minutes}`;
};

// 外部からモーダルを開くための関数
const open = (results: any[]) => {
  // 初期値として scale を 1.0 に設定してコピー
  nutritionResults.value = results.map(item => ({ ...item, scale: 1.0 }));
  submitMessage.value = '';
  registeredAt.value = getCurrentDateTime();
  showModal.value = true;
};

const submitData = async () => {
  const savedSettings = localStorage.getItem('calorie-app-settings');
  let endpoint = '';
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    endpoint = settings.dataApiEndpoint || '';
  }

  if (!endpoint) {
    submitMessage.value = '設定からデータ登録APIエンドポイントを入力してください。';
    return;
  }

  isSubmitting.value = true;
  submitMessage.value = '送信中...';

  try {
    // GAS側で受け付ける形式に合わせて、係数(scale)を反映した数値を算出
    const payload = nutritionResults.value.map(item => ({
      registeredAt: registeredAt.value,
      dish_name: item.dish_name,
      comment: item.comment,
      calorie: Math.round(item.calorie * (item.scale || 0)),
      protein: Number((item.protein * (item.scale || 0)).toFixed(1)),
      fat: Number((item.fat * (item.scale || 0)).toFixed(1)),
      carbohydrate: Number((item.carbohydrate * (item.scale || 0)).toFixed(1)),
      confidence: item.confidence || 0
    }));

    await fetch(endpoint, {
      method: 'POST',
      // GASへのCORSエラー（プリフライト OPTIONS）回避のため text/plain を使用
      headers: { 'Content-Type': 'text/plain' }, 
      body: JSON.stringify(payload)
    });

    submitMessage.value = 'スプレッドシートに登録しました！';
    setTimeout(() => { close(); }, 1500);
  } catch (error: any) {
    console.error(error);
    submitMessage.value = '登録に失敗しました: ' + error.message;
  } finally {
    isSubmitting.value = false;
  }
};

const close = () => {
  showModal.value = false;
};

// 係数の増減処理（計算誤差を防ぐため10倍して四捨五入し、0未満にならないようにする）
const adjustScale = (item: any, amount: number) => {
  const newScale = Math.round((item.scale + amount) * 10) / 10;
  item.scale = Math.max(0, newScale);
};

const deleteItem = (index: number) => {
  if (confirm(`「${nutritionResults.value[index].dish_name}」を削除してもよろしいですか？`)) {
    nutritionResults.value.splice(index, 1);
  }
};

// 親コンポーネントからアクセスできるように公開
defineExpose({
  open,
  close
});
</script>

<template>
  <Transition name="fade">
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 relative">
        <button @click="close" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
        <h2 class="text-xl font-bold mb-6">分析結果</h2>
        
        <!-- 登録日時の編集 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-1">登録日時</label>
          <input 
            type="datetime-local" 
            v-model="registeredAt" 
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div v-for="(item, index) in nutritionResults" :key="index" class="mb-6 pb-6 border-b border-gray-200 last:border-0 last:pb-0 last:mb-0">
          <!-- 料理名と分量係数 -->
          <div class="flex justify-between items-center mb-1">
            <div class="font-bold text-lg text-gray-800">{{ item.dish_name }}</div>
            <div class="flex items-center gap-1">
              <span class="text-sm text-gray-600 mr-1">×</span>
              <button @click="adjustScale(item, -0.1)" class="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 rounded-md font-bold text-lg hover:bg-gray-300 active:bg-gray-400">
                -
              </button>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                v-model.number="item.scale" 
                class="w-16 border border-gray-300 rounded-md px-1 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
              <button @click="adjustScale(item, 0.1)" class="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 rounded-md font-bold text-lg hover:bg-gray-300 active:bg-gray-400">
                +
              </button>
              <button @click="deleteItem(index)" class="w-8 h-8 ml-2 flex items-center justify-center bg-red-100 text-red-600 rounded-md hover:bg-red-200 active:bg-red-300 transition-colors" title="削除">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- コメント（算出基準）の表示 -->
          <div class="text-xs text-gray-500 mb-3">
            算出基準: {{ item.comment || '不明' }}
          </div>
          
          <!-- PFC表示 -->
          <div class="flex gap-4 text-sm mb-3 text-gray-700 font-medium">
            <div><span class="text-gray-500 mr-1">P</span>{{ (item.protein * (item.scale || 0)).toFixed(1) }} g</div>
            <div><span class="text-gray-500 mr-1">F</span>{{ (item.fat * (item.scale || 0)).toFixed(1) }} g</div>
            <div><span class="text-gray-500 mr-1">C</span>{{ (item.carbohydrate * (item.scale || 0)).toFixed(1) }} g</div>
          </div>
          
          <!-- カロリー表示 -->
          <div class="text-right">
            <span class="text-sm text-gray-500 mr-2">カロリー</span>
            <span class="font-bold text-xl text-orange-600">{{ Math.round(item.calorie * (item.scale || 0)) }} kcal</span>
          </div>
        </div>

        <!-- メッセージ表示 -->
        <div v-if="submitMessage" class="mt-4 text-center text-sm font-bold" :class="submitMessage.includes('失敗') || submitMessage.includes('設定') ? 'text-red-600' : 'text-blue-600'">
          {{ submitMessage }}
        </div>

        <div class="flex gap-3 mt-6">
          <button @click="close" class="w-1/3 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors" :disabled="isSubmitting">
            閉じる
          </button>
          <button @click="submitData" class="w-2/3 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-blue-400" :disabled="isSubmitting || nutritionResults.length === 0">
            {{ isSubmitting ? '送信中...' : 'この内容で登録する' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
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