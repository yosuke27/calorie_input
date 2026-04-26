<script setup lang="ts">
import { ref } from 'vue';

// ローカルストレージのキー
const STORAGE_KEY = 'calorie-app-settings';

// イベント定義
const emit = defineEmits<{
  (e: 'settings-saved'): void;
}>();

// トースト
const showToast = ref(false);
const toastMessage = ref('');

// 設定モーダル
const showSettings = ref(false);
const geminiApiKey = ref('');
const dataApiEndpoint = ref('');
const databaseUrl = ref('');
const notebooklmUrl = ref('');

// ローカルストレージから読み込み
const loadSettings = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    geminiApiKey.value = data.geminiApiKey || '';
    dataApiEndpoint.value = data.dataApiEndpoint || '';
    databaseUrl.value = data.databaseUrl || '';
    notebooklmUrl.value = data.notebooklmUrl || '';
  }
};

// ローカルストレージに保存
const saveSettings = () => {
  const data = {
    geminiApiKey: geminiApiKey.value,
    dataApiEndpoint: dataApiEndpoint.value,
    databaseUrl: databaseUrl.value,
    notebooklmUrl: notebooklmUrl.value
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  
  // 親に通知
  emit('settings-saved');
  
  // トースト表示
  toastMessage.value = '設定を保存しました';
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
  
  closeSettings();
};

const openSettings = () => {
  loadSettings();
  showSettings.value = true;
};

const closeSettings = () => {
  showSettings.value = false;
};

// 親コンポーネントに公開
defineExpose({
  openSettings
});
</script>

<template>
  <!-- 設定オーバーレイ（背景：フェードイン） -->
  <Transition name="fade">
    <div v-if="showSettings" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <!-- モーダルコンテンツ（スライドイン） -->
      <Transition name="modal-slide">
        <div v-if="showSettings" class="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
          <!-- ヘッダー -->
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold">設定</h2>
            <button @click="closeSettings" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>

          <!-- 項目1: Gemini APIキー -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Gemini APIキー</label>
            <input 
              v-model="geminiApiKey"
              type="text" 
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="APIキーを入力"
            />
          </div>

          <!-- 項目2: データ登録APIエンドポイント -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">データ登録APIエンドポイント</label>
            <input 
              v-model="dataApiEndpoint"
              type="text" 
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="エンドポイントURLを入力"
            />
          </div>

          <!-- 項目3: データベースURL -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">データベースURL</label>
            <input 
              v-model="databaseUrl"
              type="text" 
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="データベースURLを入力"
            />
          </div>

          <!-- 項目4: Notebooklm URL -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">Notebooklm URL</label>
            <input 
              v-model="notebooklmUrl"
              type="text" 
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notebooklm URLを入力"
            />
          </div>

          <!-- 登録ボタン -->
          <button 
            class="w-full bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-700 transition-colors"
            @click="saveSettings"
          >
            登録
          </button>
        </div>
      </Transition>
    </div>
  </Transition>

  <!-- トースト通知 -->
  <Transition name="toast-slide">
    <div 
      v-if="showToast" 
      class="fixed top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50"
    >
      {{ toastMessage }}
    </div>
  </Transition>
</template>

<style scoped>
/* 背景のフェードイン・アウト */
.fade-enter-active {
  transition: opacity 0.3s ease-out;
}

.fade-leave-active {
  transition: opacity 0.3s ease-in;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* モーダルのプルンアニメーション */
.modal-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-slide-enter-from {
  transform: translateY(-120%);
  opacity: 0;
}

.modal-slide-leave-to {
  transform: translateY(-120%);
  opacity: 0;
}

/* トーストのプルンアニメーション */
.toast-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-slide-enter-from {
  transform: translate(-50%, -120%);
  opacity: 0;
}

.toast-slide-leave-to {
  transform: translate(-50%, -120%);
  opacity: 0;
}
</style>