<script setup lang="ts">
import { ref, nextTick } from 'vue';
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

const messages = ref<Message[]>([
  { role: 'model', content: 'こんにちは！日々の食事や体重に関する相談に乗ります。何か気になることはありますか？' }
]);
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
  <div class="fixed inset-0 bg-[#8babbf] z-50 flex flex-col h-[100dvh]">
    <!-- ヘッダー -->
    <header class="bg-[#273246] text-white h-14 flex items-center px-4 shrink-0 shadow-sm relative z-10">
      <button @click="emit('close')" class="flex items-center text-white h-full pr-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-lg font-bold flex-1 text-center pr-10">AIアドバイザー</h1>
    </header>

    <!-- チャットエリア -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-for="(msg, index) in messages" :key="index" class="flex w-full" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
        
        <!-- Model (AI) Icon -->
        <div v-if="msg.role === 'model'" class="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mr-2 mt-1">
          AI
        </div>

        <!-- Message Bubble -->
        <div 
          class="max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words"
          :class="msg.role === 'user' ? 'bg-[#85e249] text-gray-800 rounded-tr-sm shadow-sm' : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'"
        >
          {{ msg.content }}
        </div>
      </div>

      <!-- ローディング表示 -->
      <div v-if="isLoading" class="flex w-full justify-start items-center space-x-2 text-white text-xs opacity-70">
        <div class="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold mr-2">AI</div>
        <div class="bg-white text-gray-400 rounded-2xl rounded-tl-sm px-4 py-2 flex space-x-1">
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s;"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s;"></div>
        </div>
      </div>
    </div>

    <!-- 入力エリア -->
    <div class="bg-white p-2 shrink-0 border-t border-gray-200">
      <form @submit.prevent="sendMessage" class="flex items-end gap-2 bg-gray-100 rounded-3xl p-1 pb-1">
        <textarea 
          v-model="inputMessage" 
          @keydown.enter.exact.prevent="sendMessage"
          rows="1"
          class="flex-1 bg-transparent resize-none border-none outline-none py-2 px-4 max-h-32 text-gray-800 text-sm"
          placeholder="メッセージを入力..."
        ></textarea>
        <button 
          type="submit" 
          :disabled="!inputMessage.trim() || isLoading"
          class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
          :class="inputMessage.trim() && !isLoading ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-400 cursor-not-allowed'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
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
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
}
</style>