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
const showClientIdHelp = ref(false);
const geminiApiKey = ref('');
const googleClientId = ref('');
const spreadsheetId = ref('');
const bodyCompositionSheetId = ref('');
const databaseUrl = ref('');
const notebooklmUrl = ref('');

// ローカルストレージから読み込み
const loadSettings = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    geminiApiKey.value = data.geminiApiKey || '';
    googleClientId.value = data.googleClientId || '';
    spreadsheetId.value = data.spreadsheetId || '';
    bodyCompositionSheetId.value = data.bodyCompositionSheetId || '';
    databaseUrl.value = data.databaseUrl || '';
    notebooklmUrl.value = data.notebooklmUrl || '';
  }
};

// ローカルストレージに保存
const saveSettings = () => {
  const data = {
    geminiApiKey: geminiApiKey.value,
    googleClientId: googleClientId.value,
    spreadsheetId: spreadsheetId.value,
    bodyCompositionSheetId: bodyCompositionSheetId.value,
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

          <!-- 項目2: Google クライアントID -->
          <div class="mb-4">
            <div class="flex items-center mb-1">
              <label class="block text-sm font-medium text-gray-700">Google OAuth クライアントID</label>
              <button @click="showClientIdHelp = true" class="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none" title="取得方法を見る">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            <input 
              v-model="googleClientId"
              type="text" 
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Google Client IDを入力"
            />
          </div>

          <!-- 項目3: スプレッドシートID -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">スプレッドシートID</label>
            <input 
              v-model="spreadsheetId"
              type="text" 
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="スプレッドシートIDを入力"
            />
          </div>

          <!-- 体組織DBのシートID -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">体組織DBのシートID (任意)</label>
            <input 
              v-model="bodyCompositionSheetId"
              type="text" 
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="体組織DBのシートIDを入力"
            />
          </div>

          <!-- 項目4: データベースURL -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">データベースURL (任意)</label>
            <input 
              v-model="databaseUrl"
              type="text" 
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="データベースURLを入力"
            />
          </div>

          <!-- 項目5: Notebooklm URL -->
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

  <!-- クライアントID取得方法のヘルプモーダル -->
  <Transition name="fade">
    <div v-if="showClientIdHelp" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <Transition name="modal-slide">
        <div v-if="showClientIdHelp" class="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6 relative">
          <button @click="showClientIdHelp = false" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          <h3 class="text-lg font-bold mb-4">Google OAuth クライアントIDの取得方法</h3>
          
          <div class="space-y-4 text-sm text-gray-700">
            <p>
              <strong>1. Google Cloud Consoleにアクセス</strong><br>
              <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">Google Cloud Console</a> にアクセスし、新しいプロジェクトを作成します。
            </p>
            <p>
              <strong>2. Google Sheets APIを有効化</strong><br>
              「APIとサービス」 > 「ライブラリ」から「Google Sheets API」を検索し、有効にします。
            </p>
            <p>
              <strong>3. OAuth 同意画面の設定</strong><br>
              「APIとサービス」 > 「OAuth 同意画面」へ進み、User Typeを「外部（または内部）」にしてアプリ名などを登録します。
            </p>
            <p>
              <strong>4. 認証情報の作成</strong><br>
              「認証情報」タブ > 「+ 認証情報を作成」 > 「OAuth クライアント ID」を選択します。<br>
              ・アプリケーションの種類: <strong>ウェブ アプリケーション</strong><br>
              ・承認済みの JavaScript オリジン: <strong>このアプリのURL（例: http://localhost:3000）</strong><br>
              を追加して作成します。
            </p>
            <p>
              <strong>5. IDをコピー</strong><br>
              作成されたクライアントID（〇〇.apps.googleusercontent.com）をコピーし、設定画面に貼り付けてください。
            </p>
          </div>
          
          <button @click="showClientIdHelp = false" class="mt-6 w-full bg-gray-200 text-gray-800 py-2 rounded-md font-bold hover:bg-gray-300 transition-colors">
            閉じる
          </button>
        </div>
      </Transition>
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