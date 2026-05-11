<script setup lang="ts">
import { ref, onMounted } from 'vue';

declare const google: any;

const isLoading = ref(false);
const errorMessage = ref('');
const historyGroups = ref<any[]>([]);

const extractSpreadsheetId = (input: string) => {
  if (!input) return '';
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input;
};

const getCachedToken = () => {
  const data = localStorage.getItem('google_access_token_data');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Date.now() < parsed.expirationTime) {
        return parsed.token;
      }
    } catch (e) {}
  }
  return null;
};

const saveTokenToCache = (token: string, expiresInSec: number) => {
  const expiryMs = (expiresInSec ? expiresInSec - 300 : 3000) * 1000;
  localStorage.setItem('google_access_token_data', JSON.stringify({
    token,
    expirationTime: Date.now() + expiryMs
  }));
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}分前`;
  }
  return `${diffHours}時間前`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};

const loadHistory = async () => {
  const savedSettings = localStorage.getItem('calorie-app-settings');
  let clientId = '';
  let sheetIdRaw = '';

  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    clientId = settings.googleClientId || '';
    sheetIdRaw = settings.spreadsheetId || '';
  }

  const sheetId = extractSpreadsheetId(sheetIdRaw);

  if (!clientId || !sheetId) {
    errorMessage.value = '設定からGoogle OAuthクライアントIDとスプレッドシートIDを入力してください。';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const cachedToken = getCachedToken();
    if (cachedToken) {
      await fetchSheetData(cachedToken, sheetId);
      return;
    }

    if (typeof google === 'undefined') {
      throw new Error('Google Identity Services が読み込まれていません。ページをリロードしてください。');
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      callback: async (response: any) => {
        if (response.error !== undefined) {
          errorMessage.value = '認証に失敗しました: ' + response.error;
          isLoading.value = false;
          return;
        }
        
        saveTokenToCache(response.access_token, response.expires_in);
        await fetchSheetData(response.access_token, sheetId);
      },
    });

    tokenClient.requestAccessToken();

  } catch (error: any) {
    console.error(error);
    errorMessage.value = 'エラー: ' + error.message;
    isLoading.value = false;
  }
};

const fetchSheetData = async (accessToken: string, spreadsheetId: string) => {
  try {
    // ひとまず最新の行からデータを取得するため、シート全体を取得します
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:H`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || 'データの取得に失敗しました');
    }

    const data = await res.json();
    const rows = data.values || [];
    
    if (rows.length === 0) {
      historyGroups.value = [];
      return;
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentRows = rows.filter(row => {
      if (!row[0]) return false;
      const rowDate = new Date(row[0]);
      // 直近24時間以内のデータのみをフィルタリング
      return rowDate >= oneDayAgo && rowDate <= now;
    });

    // 登録日時でグループ化
    const grouped = recentRows.reduce((acc, row) => {
      const timeKey = row[0]; // A列: 登録日時
      if (!acc[timeKey]) {
        acc[timeKey] = {
          timeKey,
          items: [],
          totalCalorie: 0,
          totalProtein: 0,
          totalFat: 0,
          totalCarb: 0
        };
      }
      
      const p = parseFloat(row[4]) || 0;
      const f = parseFloat(row[5]) || 0;
      const c = parseFloat(row[6]) || 0;
      const cal = parseInt(row[3]) || 0;
      
      acc[timeKey].items.push({
        dish_name: row[1],
        calorie: cal,
        p, f, c
      });
      
      acc[timeKey].totalCalorie += cal;
      acc[timeKey].totalProtein += p;
      acc[timeKey].totalFat += f;
      acc[timeKey].totalCarb += c;
      
      return acc;
    }, {} as Record<string, any>);
    
    // 配列に変換して降順（新しい順）にソート
    historyGroups.value = Object.values(grouped).sort((a, b) => {
      return new Date(b.timeKey).getTime() - new Date(a.timeKey).getTime();
    });

  } catch (error: any) {
    console.error(error);
    errorMessage.value = '取得に失敗しました: ' + error.message;
  } finally {
    isLoading.value = false;
  }
};

defineExpose({
  loadHistory
});
</script>

<template>
  <div class="w-full max-w-xs mt-8">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">直近24時間の食事</h2>
      <button @click="loadHistory" class="text-blue-600 hover:text-blue-800 transition-colors" :disabled="isLoading">
        <svg v-if="!isLoading" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <svg v-else class="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </button>
    </div>

    <div v-if="errorMessage" class="text-red-500 text-sm mb-4">
      {{ errorMessage }}
    </div>
    
    <div v-if="historyGroups.length === 0 && !isLoading" class="text-gray-500 text-center py-4 bg-gray-100 rounded-xl">
      直近24時間の記録はありません
    </div>

    <div class="space-y-4">
      <div v-for="group in historyGroups" :key="group.timeKey" class="bg-white p-4 rounded-2xl shadow border border-gray-100">
        <!-- ヘッダー部分 -->
        <div class="flex justify-between items-baseline mb-2">
          <span class="font-bold text-gray-800">{{ formatTimeAgo(group.timeKey) }}</span>
          <span class="text-xs text-gray-500">({{ formatDate(group.timeKey) }})</span>
        </div>
        
        <!-- 料理名のリスト（シンプルにカンマ区切りなどで表示） -->
        <div class="text-sm text-gray-600 mb-3 line-clamp-2">
          {{ group.items.map(i => i.dish_name).join('、') }}
        </div>
        
        <!-- 合計カロリー -->
        <div class="mb-2 text-gray-800">
          <span class="text-sm">合計カロリー：</span>
          <span class="font-bold text-xl text-orange-600">{{ group.totalCalorie }} <span class="text-sm">kcal</span></span>
        </div>
        
        <!-- PFCバランス -->
        <div class="flex gap-4 text-sm font-medium text-gray-600">
          <div>F <span class="text-gray-800">{{ group.totalFat.toFixed(1) }}</span> g</div>
          <div>P <span class="text-gray-800">{{ group.totalProtein.toFixed(1) }}</span> g</div>
          <div>C <span class="text-gray-800">{{ group.totalCarb.toFixed(1) }}</span> g</div>
        </div>
      </div>
    </div>
  </div>
</template>
