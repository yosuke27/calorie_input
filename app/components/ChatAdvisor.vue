<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue';
import { getGeminiGenerateContentUrl } from '~/utils/constants';

const props = defineProps<{
  apiKey: string | null;
  isSettingsValid: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'require-settings'): void;
}>();

interface Message {
  role: 'user' | 'model';
  content: string;
}

const CHAT_STORAGE_KEY = 'calorie-app-chat-history';

const messages = ref<Message[]>([
  { role: 'model', content: 'こんにちは！日々の食事や体重に関する相談に乗ります。何か気になることはありますか？' }
]);

onMounted(() => {
  const saved = localStorage.getItem(CHAT_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        messages.value = parsed;
      }
    } catch (e) {
      console.error('Failed to parse chat history', e);
    }
  }
  scrollToBottom();
});

watch(messages, (newVal) => {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(newVal));
}, { deep: true });

const inputMessage = ref('');
const isLoading = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return;

  if (!props.isSettingsValid || !props.apiKey) {
    emit('require-settings');
    return;
  }

  const userText = inputMessage.value.trim();
  messages.value.push({ role: 'user', content: userText });
  inputMessage.value = '';
  isLoading.value = true;
  await scrollToBottom();

  try {
    // API用のメッセージ履歴を構築
    const apiContents = messages.value.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(getGeminiGenerateContentUrl(props.apiKey), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: apiContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'APIリクエストに失敗しました');
    }

    const result = await response.json();
    const modelText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (modelText) {
      messages.value.push({ role: 'model', content: modelText });
    } else {
      throw new Error('レスポンスが空でした');
    }
  } catch (error: any) {
    console.error(error);
    messages.value.push({ role: 'model', content: `エラーが発生しました: ${error.message}` });
  } finally {
    isLoading.value = false;
    await scrollToBottom();
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-gray-50 z-50 flex flex-col h-full">
    <!-- ヘッダー -->
    <header class="bg-white/80 backdrop-blur-md text-gray-800 h-14 flex items-center px-4 shrink-0 border-b border-gray-200 relative z-10">
      <button @click="emit('close')" class="flex items-center text-gray-500 hover:text-gray-800 h-full pr-4 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="flex-1 flex flex-col items-center justify-center">
        <h1 class="text-base font-bold text-gray-800">AIアドバイザー</h1>
        <span class="text-[10px] text-green-500 font-medium">● オンライン</span>
      </div>
      <button @click="clearChat" class="flex items-center text-gray-400 hover:text-gray-600 h-full pl-4 text-xs font-medium transition-colors">
        クリア
      </button>
    </header>

    <!-- チャットエリア -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
      <TransitionGroup name="msg" tag="div" class="space-y-6">
        <div v-for="(msg, index) in messages" :key="index" class="flex w-full" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
          
          <!-- Model (AI) Icon -->
          <div v-if="msg.role === 'model'" class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mr-3 mt-1 shadow-sm">
            AI
          </div>

          <!-- Message Bubble -->
          <div 
            class="max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm"
            :class="msg.role === 'user' 
              ? 'bg-blue-500 text-white rounded-2xl rounded-tr-sm' 
              : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'"
          >
            {{ msg.content }}
          </div>
        </div>

        <!-- ローディング表示 -->
        <div v-if="isLoading" key="loading" class="flex w-full justify-start items-center">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3 mt-1 shadow-sm shrink-0">
            <svg class="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div class="bg-white text-gray-500 rounded-2xl rounded-tl-sm px-4 py-3 flex space-x-1.5 border border-gray-100 shadow-sm">
            <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s;"></div>
            <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
            <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s;"></div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- 入力エリア -->
    <div class="bg-white px-4 py-3 shrink-0 border-t border-gray-200 safe-area-bottom">
      <form @submit.prevent="sendMessage" class="flex items-end gap-2 max-w-4xl mx-auto">
        <div class="flex-1 bg-gray-100 rounded-3xl flex items-end relative border border-gray-200 overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <textarea 
            v-model="inputMessage" 
            @keydown.enter.exact.prevent="sendMessage"
            rows="1"
            class="flex-1 bg-transparent resize-none border-none outline-none py-3 px-4 max-h-32 text-gray-800 text-sm"
            placeholder="メッセージを入力..."
          ></textarea>
        </div>
        <button 
          type="submit" 
          :disabled="!inputMessage.trim() || isLoading"
          class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
          :class="inputMessage.trim() && !isLoading ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* スクロールバーのカスタマイズ (WebKit用) */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 10px;
}
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 12px);
}

/* メッセージ追加時のアニメーション */
.msg-enter-active,
.msg-leave-active {
  transition: all 0.3s ease;
}
.msg-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.msg-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>