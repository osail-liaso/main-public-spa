<template>
  <div class="flex flex-col min-h-screen overflow-hidden">



    <Socket v-show="true" 
    :sessionId="prompt.sessionId" 
    :trigger="prompt.trigger"
    :persona="prompt.persona"
    :systemPrompt="prompt.systemPrompt"
    :userPrompt="prompt.userPrompt"
    :messageHistory="prompt.messageHistory"
    :model="prompt.model"
    :temperature="prompt.temperature"
    >
    </Socket>
    
    <PersonalityFramework/>


  </div>
</template>

<script setup>
import env from "@/env.js";
import { v4 as uuidv4 } from "uuid";
import { ref, onMounted } from "vue";
import { notify } from "notiwind";
import Socket from "@/components/Socket.vue";

import PersonalityFramework from '@/components/PersonalityFramework.vue';

let models = ref([
{  concurrentInstances: 20, provider: 'openAi', maxTokens: 128000, per1kInput: 0.01, per1kOutput: 0.03, model: "gpt-4-1106-preview", name: {en:"OpenAI GPT-4 Turbo (128k)", fr:"OpenAI GPT-4 Turbo (128k)"}  },
{  concurrentInstances: 5, provider: 'anthropic', maxTokens: 200000, per1kInput: 0.008, per1kOutput: 0.024, model: "claude-3-5-sonnet-20240620", name: {en:"Claude 3.5 Sonnet", fr:"Claude 3.5 Sonnet"} }
]);

let prompt = ref({
  sessionId: uuidv4(),
  trigger: false,
  persona: null,
  systemPrompt: "Pretend you're a bird",
  userPrompt: "Write what sound you would make",
  messageHistory: [],
  model: models.value[0],
  temperature: 0.2,
});

onMounted(() => {

});
</script>
