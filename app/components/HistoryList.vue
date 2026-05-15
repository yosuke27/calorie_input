<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

declare const google: any;

const isLoading = ref(false);
const errorMessage = ref('');
const historyGroups = ref<any[]>([]);
const bodyCompGroups = ref<any[]>([]);

const viewMode = ref<'today' | 'recent' | 'daily' | 'chart' | 'bodyComp'>('today');
const todayGroups = ref<any[]>([]);
const dailyGroups = ref<any[]>([]);
const currentPage = ref(1);
const itemsPerPage = 10;
const chartPeriod = ref<'1w' | '1m' | '3m' | '1y'>('1w');

const targetCalorie = ref<number | undefined>(undefined);
const chartMinWeight = ref<number | undefined>(undefined);
const chartMinBodyFat = ref<number | undefined>(undefined);
const chartMinCalorie = ref<number | undefined>(undefined);

const chartData = computed(() => {
  const now = new Date();
  const pastDate = new Date();
  
  if (chartPeriod.value === '1w') {
    pastDate.setDate(now.getDate() - 7);
  } else if (chartPeriod.value === '1m') {
    pastDate.setMonth(now.getMonth() - 1);
  } else if (chartPeriod.value === '3m') {
    pastDate.setMonth(now.getMonth() - 3);
  } else if (chartPeriod.value === '1y') {
    pastDate.setFullYear(now.getFullYear() - 1);
  }

  // dailyGroupsは新しい順(降順)になっているので、指定期間でフィルタ後、グラフ用に昇順(古い順)に反転
  const filtered = dailyGroups.value.filter(day => {
    return new Date(day.dateKey) >= pastDate;
  });

  const reversed = [...filtered].reverse();

  return {
    labels: reversed.map(d => {
      // 2024/05/15 -> 05/15 のように年を省略
      const parts = d.dateKey.split('/');
      return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d.dateKey;
    }),
    datasets: [
      {
        label: '摂取カロリー (kcal)',
        backgroundColor: '#ea580c',
        borderColor: '#ea580c',
        data: reversed.map(d => d.totalCalorie),
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };
});

const bodyCompChartData = computed(() => {
  const now = new Date();
  const pastDate = new Date();
  
  if (chartPeriod.value === '1w') {
    pastDate.setDate(now.getDate() - 7);
  } else if (chartPeriod.value === '1m') {
    pastDate.setMonth(now.getMonth() - 1);
  } else if (chartPeriod.value === '3m') {
    pastDate.setMonth(now.getMonth() - 3);
  } else if (chartPeriod.value === '1y') {
    pastDate.setFullYear(now.getFullYear() - 1);
  }

  const dateSet = new Set<string>();
  dailyGroups.value.forEach(d => {
    if (new Date(d.dateKey) >= pastDate) dateSet.add(d.dateKey);
  });
  bodyCompGroups.value.forEach(d => {
    if (new Date(d.dateKey) >= pastDate) dateSet.add(d.dateKey);
  });
  
  const sortedDates = Array.from(dateSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  const calorieData: (number | null)[] = [];
  const weightData: (number | null)[] = [];
  const bodyFatData: (number | null)[] = [];
  
  const calMap = new Map(dailyGroups.value.map(d => [d.dateKey, d.totalCalorie]));
  const weightMap = new Map(bodyCompGroups.value.map(d => [d.dateKey, d.weight]));
  const fatMap = new Map(bodyCompGroups.value.map(d => [d.dateKey, d.bodyFat]));
  
  sortedDates.forEach(date => {
    calorieData.push(calMap.has(date) ? calMap.get(date) : null);
    weightData.push(weightMap.has(date) ? weightMap.get(date) : null);
    bodyFatData.push(fatMap.has(date) ? fatMap.get(date) : null);
  });

  return {
    labels: sortedDates.map(d => {
      const parts = d.split('/');
      return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d;
    }),
    datasets: [
      {
        label: '体重 (kg)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: '#3b82f6',
        data: weightData,
        yAxisID: 'y-weight',
        tension: 0.1,
        pointRadius: 4,
        spanGaps: true
      },
      {
        label: '体脂肪率 (%)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: '#10b981',
        data: bodyFatData,
        yAxisID: 'y-fat',
        tension: 0.1,
        pointRadius: 4,
        spanGaps: true
      },
      {
        label: '摂取カロリー (kcal)',
        backgroundColor: 'rgba(234, 88, 12, 0.5)',
        borderColor: '#ea580c',
        data: calorieData,
        yAxisID: 'y-calorie',
        tension: 0.1,
        pointRadius: 4,
        spanGaps: true
      }
    ]
  };
});

const bodyCompChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const
    }
  },
  scales: {
    'y-weight': {
      type: 'linear' as const,
      position: 'left' as const,
      title: { display: true, text: 'kg' },
      min: chartMinWeight.value
    },
    'y-fat': {
      type: 'linear' as const,
      position: 'left' as const,
      title: { display: true, text: '%' },
      grid: { drawOnChartArea: false },
      min: chartMinBodyFat.value
    },
    'y-calorie': {
      type: 'linear' as const,
      position: 'right' as const,
      beginAtZero: chartMinCalorie.value === undefined,
      title: { display: true, text: 'kcal' },
      grid: { drawOnChartArea: false },
      min: chartMinCalorie.value
    }
  }
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
};

const paginatedDailyGroups = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return dailyGroups.value.slice(start, end);
});

const totalPages = computed(() => Math.ceil(dailyGroups.value.length / itemsPerPage));

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

watch(viewMode, () => {
  currentPage.value = 1;
});

const total24hCalorie = computed(() => {
  return historyGroups.value.reduce((sum, group) => sum + group.totalCalorie, 0);
});

const totalTodayCalorie = computed(() => {
  return todayGroups.value.reduce((sum, group) => sum + group.totalCalorie, 0);
});

const extractSpreadsheetId = (input: string): string => {
  if (!input) return '';
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match && match[1] ? match[1] : input;
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
  let bodyCompositionSheetIdRaw = '';

  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    clientId = settings.googleClientId || '';
    sheetIdRaw = settings.spreadsheetId || '';
    bodyCompositionSheetIdRaw = settings.bodyCompositionSheetId || '';
    
    if (settings.minWeight !== undefined && settings.minWeight !== '') chartMinWeight.value = Number(settings.minWeight);
    else chartMinWeight.value = undefined;
    
    if (settings.minBodyFat !== undefined && settings.minBodyFat !== '') chartMinBodyFat.value = Number(settings.minBodyFat);
    else chartMinBodyFat.value = undefined;

    if (settings.minCalorie !== undefined && settings.minCalorie !== '') chartMinCalorie.value = Number(settings.minCalorie);
    else chartMinCalorie.value = undefined;

    if (settings.targetCalorie !== undefined && settings.targetCalorie !== '') targetCalorie.value = Number(settings.targetCalorie);
    else targetCalorie.value = undefined;
  }

  const sheetId = extractSpreadsheetId(sheetIdRaw);
  const bodyCompSheetId = extractSpreadsheetId(bodyCompositionSheetIdRaw);

  if (!clientId || !sheetId) {
    errorMessage.value = '設定からGoogle OAuthクライアントIDとスプレッドシートIDを入力してください。';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const cachedToken = getCachedToken();
    if (cachedToken) {
      await fetchSheetData(cachedToken, sheetId, bodyCompSheetId);
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
        await fetchSheetData(response.access_token, sheetId, bodyCompSheetId);
      },
    });

    tokenClient.requestAccessToken();

  } catch (error: any) {
    console.error(error);
    errorMessage.value = 'エラー: ' + error.message;
    isLoading.value = false;
  }
};

const fetchSheetData = async (accessToken: string, spreadsheetId: string, bodyCompSheetId: string) => {
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
    } else {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const todayStart = new Date(now);
      todayStart.setHours(3, 0, 0, 0);
      if (now.getHours() < 3) {
        todayStart.setDate(todayStart.getDate() - 1);
      }

      // 日毎の集計
      const dailyGrouped = rows.reduce((acc: Record<string, any>, row: any[]) => {
        if (!row[0]) return acc;
        const dateObj = new Date(row[0]);
        if (isNaN(dateObj.getTime())) return acc;
        
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateKey = `${year}/${month}/${day}`;

        if (!acc[dateKey]) {
          acc[dateKey] = {
            dateKey,
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

        acc[dateKey].totalCalorie += cal;
        acc[dateKey].totalProtein += p;
        acc[dateKey].totalFat += f;
        acc[dateKey].totalCarb += c;

        return acc;
      }, {} as Record<string, any>);

      dailyGroups.value = Object.values(dailyGrouped).sort((a: any, b: any) => {
        return new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime();
      });
      
      const recentRows = rows.filter((row: any) => {
        if (!row[0]) return false;
        const rowDate = new Date(row[0]);
        // 直近24時間以内のデータのみをフィルタリング
        return rowDate >= oneDayAgo && rowDate <= now;
      });

      const todayRows = rows.filter((row: any) => {
        if (!row[0]) return false;
        const rowDate = new Date(row[0]);
        // 本日のデータ（3時起点）のみをフィルタリング
        return rowDate >= todayStart && rowDate <= now;
      });

      const groupRows = (targetRows: any[]) => {
        const grouped = targetRows.reduce((acc: Record<string, any>, row: any[]) => {
          const timeKey = row[0];
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
        
        return Object.values(grouped).sort((a: any, b: any) => {
          return new Date(b.timeKey).getTime() - new Date(a.timeKey).getTime();
        });
      };

      historyGroups.value = groupRows(recentRows);
      todayGroups.value = groupRows(todayRows);
    }

    if (bodyCompSheetId) {
      try {
        const bcUrl = `https://sheets.googleapis.com/v4/spreadsheets/${bodyCompSheetId}/values/体重と体脂肪!A:C`;
        const bcRes = await fetch(bcUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (bcRes.ok) {
          const bcData = await bcRes.json();
          const bcRows = bcData.values || [];
          const bcDailyGrouped = bcRows.reduce((acc: Record<string, any>, row: any[]) => {
            if (!row[0] || row[0] === '日時') return acc;
            const dateObj = new Date(row[0]);
            if (isNaN(dateObj.getTime())) return acc;
            
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const dateKey = `${year}/${month}/${day}`;

            const weight = parseFloat(row[1]) || 0;
            const bodyFat = parseFloat(row[2]) || 0;
            
            if (weight > 0) {
              acc[dateKey] = { dateKey, weight, bodyFat };
            }
            return acc;
          }, {} as Record<string, any>);
          
          bodyCompGroups.value = Object.values(bcDailyGrouped).sort((a: any, b: any) => {
            return new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime();
          });
        }
      } catch (e) {
        console.error('体組織データの取得に失敗しました', e);
      }
    } else {
      bodyCompGroups.value = [];
    }

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
  <div class="w-full max-w-xs mt-8 flex flex-col flex-1 min-h-0">
    <div class="flex justify-between items-center mb-4 shrink-0">
      <div class="flex items-center gap-2 flex-wrap">
        <div class="relative flex items-center">
          <select v-model="viewMode" class="text-xl font-bold text-gray-800 bg-transparent border-none outline-none cursor-pointer appearance-none pr-6 z-10 relative">
            <option value="today">本日の食事</option>
            <option value="recent">直近24時間の食事</option>
            <option value="daily">日毎の合計カロリー</option>
            <option value="chart">グラフ</option>
            <option value="bodyComp">体組織グラフ</option>
          </select>
          <div class="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mt-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
        <template v-if="viewMode === 'today'">
          <span class="text-sm font-medium text-gray-600 whitespace-nowrap" v-if="totalTodayCalorie > 0">{{ totalTodayCalorie }} kcal</span>
          <span v-if="targetCalorie" class="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap" :class="targetCalorie - totalTodayCalorie >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
            {{ targetCalorie - totalTodayCalorie >= 0 ? '不足' : '超過' }}: {{ Math.abs(targetCalorie - totalTodayCalorie) }} kcal
          </span>
        </template>
        <span class="text-sm font-medium text-gray-600 whitespace-nowrap" v-else-if="viewMode === 'recent' && total24hCalorie > 0">{{ total24hCalorie }} kcal</span>
        
        <!-- ページネーション（dailyモード時） -->
        <div v-if="viewMode === 'daily' && totalPages > 1" class="flex items-center gap-2 text-gray-600">
          <button @click="prevPage" :disabled="currentPage === 1" class="flex items-center justify-center w-6 h-6 hover:bg-gray-200 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors">◀</button>
          <span class="text-sm font-bold">{{ currentPage }}</span>
          <button @click="nextPage" :disabled="currentPage === totalPages" class="flex items-center justify-center w-6 h-6 hover:bg-gray-200 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors">▶</button>
        </div>

        <!-- グラフ期間選択（chart, bodyCompモード時） -->
        <div v-if="viewMode === 'chart' || viewMode === 'bodyComp'" class="flex items-center text-gray-600">
          <div class="relative flex items-center">
            <select v-model="chartPeriod" class="bg-gray-100 text-sm font-medium text-gray-700 rounded-lg pl-3 pr-8 py-1.5 outline-none cursor-pointer appearance-none border border-gray-200">
              <option value="1w">1週間</option>
              <option value="1m">1ヶ月</option>
              <option value="3m">3ヶ月</option>
              <option value="1y">1年</option>
            </select>
            <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
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

    <div v-if="errorMessage" class="text-red-500 text-sm mb-4 shrink-0">
      {{ errorMessage }}
    </div>
    
    <div v-if="viewMode === 'recent' && historyGroups.length === 0 && !isLoading" class="text-gray-500 text-center py-4 bg-gray-100 rounded-xl shrink-0">
      直近24時間の記録はありません
    </div>
    <div v-if="viewMode === 'daily' && dailyGroups.length === 0 && !isLoading" class="text-gray-500 text-center py-4 bg-gray-100 rounded-xl shrink-0">
      記録はありません
    </div>

    <div class="space-y-4 overflow-y-auto flex-1 min-h-0 pb-4 pr-2">
      <!-- 最近の履歴 -->
      <template v-if="viewMode === 'recent'">
        <div v-for="group in historyGroups" :key="group.timeKey" class="bg-white p-4 rounded-2xl shadow border border-gray-100 shrink-0">
          <!-- ヘッダー部分 -->
          <div class="flex justify-between items-baseline mb-2">
            <span class="font-bold text-gray-800">{{ formatTimeAgo(group.timeKey) }}</span>
            <span class="text-xs text-gray-500">({{ formatDate(group.timeKey) }})</span>
          </div>
          
          <!-- 料理名のリスト（シンプルにカンマ区切りなどで表示） -->
          <div class="text-sm text-gray-600 mb-3 line-clamp-2">
            {{ group.items.map((i: any) => i.dish_name).join('、') }}
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
      </template>

      <!-- 日毎の合計 -->
      <template v-else-if="viewMode === 'daily'">
        <div v-for="day in paginatedDailyGroups" :key="day.dateKey" class="bg-white p-4 rounded-2xl shadow border border-gray-100 shrink-0">
          <!-- ヘッダー部分 -->
          <div class="flex justify-between items-baseline mb-2">
            <span class="font-bold text-gray-800">{{ day.dateKey }}</span>
          </div>
          
          <!-- 合計カロリー -->
          <div class="mb-2 text-gray-800">
            <span class="text-sm">合計カロリー：</span>
            <span class="font-bold text-xl text-orange-600">{{ day.totalCalorie }} <span class="text-sm">kcal</span></span>
          </div>
          
          <!-- PFCバランス -->
          <div class="flex gap-4 text-sm font-medium text-gray-600">
            <div>F <span class="text-gray-800">{{ day.totalFat.toFixed(1) }}</span> g</div>
            <div>P <span class="text-gray-800">{{ day.totalProtein.toFixed(1) }}</span> g</div>
            <div>C <span class="text-gray-800">{{ day.totalCarb.toFixed(1) }}</span> g</div>
          </div>
        </div>
      </template>

      <!-- グラフ -->
      <template v-else-if="viewMode === 'chart'">
        <div class="bg-white p-4 rounded-2xl shadow border border-gray-100 shrink-0 min-h-[300px] flex flex-col justify-center">
          <div v-if="chartData.labels.length === 0" class="text-gray-500 text-center">
            該当期間のデータがありません
          </div>
          <Line v-else :data="chartData" :options="chartOptions" class="w-full h-full" />
        </div>
      </template>

      <!-- 体組織グラフ -->
      <template v-else-if="viewMode === 'bodyComp'">
        <div class="bg-white p-4 rounded-2xl shadow border border-gray-100 shrink-0 min-h-[300px] flex flex-col justify-center">
          <div v-if="bodyCompChartData.labels.length === 0" class="text-gray-500 text-center text-sm">
            該当期間のデータがありません。設定から体組織DBのシートIDを確認してください。
          </div>
          <Line v-else :data="bodyCompChartData" :options="bodyCompChartOptions" class="w-full h-full" />
        </div>
      </template>
    </div>
  </div>
</template>
