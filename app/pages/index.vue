<script setup lang="ts">
import { ref, computed } from 'vue';
import SettingsModal from '~/components/SettingsModal.vue';
import ResultModal from '~/components/ResultModal.vue';
import CameraButton from '~/components/CameraButton.vue';
import ManualInput from '~/components/ManualInput.vue';

// 状態管理
const imagePreview = ref<string | null>(null);
const statusMessage = ref('');
const hasResults = ref(false);
const rawResults = ref<any[]>([]);

// 設定モーダル参照
const settingsModalRef = ref<InstanceType<typeof SettingsModal> | null>(null);
const resultModalRef = ref<InstanceType<typeof ResultModal> | null>(null);

// APIキー変更検知用
const apiKeyVersion = ref(0);

/**
 * 設定保存時のハンドラ
 */
const onSettingsSaved = () => {
  apiKeyVersion.value++;
};

/**
 * 設定からAPIキーを取得 (リアクティブ)
 */
const apiKey = computed(() => {
  void apiKeyVersion.value;
  const savedSettings = localStorage.getItem('calorie-app-settings');
  if (!savedSettings) return null;
  const settings = JSON.parse(savedSettings);
  return settings.geminiApiKey || null;
});

const dataApiEndpoint = computed(() => {
  void apiKeyVersion.value;
  const savedSettings = localStorage.getItem('calorie-app-settings');
  if (!savedSettings) return null;
  const settings = JSON.parse(savedSettings);
  return settings.dataApiEndpoint || null;
});

const isSettingsValid = computed(() => !!apiKey.value && !!dataApiEndpoint.value);

const databaseUrl = computed(() => {
  void apiKeyVersion.value;
  const savedSettings = localStorage.getItem('calorie-app-settings');
  if (!savedSettings) return null;
  const settings = JSON.parse(savedSettings);
  return settings.databaseUrl || null;
});

const notebooklmUrl = computed(() => {
  void apiKeyVersion.value;
  const savedSettings = localStorage.getItem('calorie-app-settings');
  if (!savedSettings) return null;
  const settings = JSON.parse(savedSettings);
  return settings.notebooklmUrl || null;
});

/**
 * カメラ処理のイベントハンドラ
 */
const handleRequireSettings = () => {
  settingsModalRef.value?.openSettings();
  statusMessage.value = 'APIキーまたはデータ登録APIエンドポイントが設定されていません';
};

const handleProcessStart = () => {
  statusMessage.value = '処理を開始します...';
  hasResults.value = false;
  imagePreview.value = null;
};

const handleProcessUpdate = (message: string) => {
  statusMessage.value = message;
};

const handleProcessEnd = (results: any[], previewUrl: string) => {
  statusMessage.value = '栄養分析完了';
  imagePreview.value = previewUrl;
  rawResults.value = results;
  hasResults.value = true;
  resultModalRef.value?.open(results);
};

const handleProcessError = (message: string) => {
  statusMessage.value = message;
};
</script>

<template>
  <div class="min-h-screen flex flex-col items-center p-6 bg-gray-50">
    <!-- 設定ボタン -->
    <button 
      class="fixed top-4 right-4 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
      @click="settingsModalRef?.openSettings()"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>

    <h1 class="text-2xl font-bold mb-8">食事記録カメラ</h1>

    <!-- カメラボタンコンポーネント -->
    <CameraButton 
      :api-key="apiKey"
      :is-settings-valid="isSettingsValid"
      @require-settings="handleRequireSettings"
      @process-start="handleProcessStart"
      @process-update="handleProcessUpdate"
      @process-end="handleProcessEnd"
      @process-error="handleProcessError"
    />

    <!-- 手動入力コンポーネント -->
    <div class="mt-4">
      <ManualInput 
        :api-key="apiKey"
        :is-settings-valid="isSettingsValid"
        @require-settings="handleRequireSettings"
        @process-start="handleProcessStart"
        @process-update="handleProcessUpdate"
        @process-end="handleProcessEnd"
        @process-error="handleProcessError"
      />
    </div>

    <!-- 外部リンクボタン群 -->
    <div v-if="databaseUrl || notebooklmUrl" class="mt-4 w-full max-w-xs flex gap-3">
      <a v-if="databaseUrl" :href="databaseUrl" target="_blank" rel="noopener noreferrer" class="flex-1 bg-green-500 text-white text-center py-3 rounded-xl font-bold shadow-md hover:bg-green-600 transition-colors">
        データベース
      </a>
      <a v-if="notebooklmUrl" :href="notebooklmUrl" target="_blank" rel="noopener noreferrer" class="flex-1 bg-purple-500 text-white text-center py-3 rounded-xl font-bold shadow-md hover:bg-purple-600 transition-colors">
        アドバイザー
      </a>
    </div>

    <p class="mt-4 text-sm text-gray-600">{{ statusMessage }}</p>

    <div v-if="imagePreview" class="mt-8 w-full max-w-xs">
      <img :src="imagePreview" class="w-full rounded-lg shadow-md" alt="Preview" />
      
      <!-- 栄養分析結果を再表示するボタン -->
      <div v-if="hasResults" class="mt-4">
        <button @click="resultModalRef?.open(rawResults)" class="w-full bg-blue-100 text-blue-700 py-3 rounded-xl font-bold shadow hover:bg-blue-200 transition-colors">
          分析結果を確認する
        </button>
      </div>
    </div>

    <!-- 設定オーバーレイ -->
    <SettingsModal ref="settingsModalRef" @settings-saved="onSettingsSaved" />

    <!-- 結果モーダル -->
    <ResultModal ref="resultModalRef" />
  </div>
</template>