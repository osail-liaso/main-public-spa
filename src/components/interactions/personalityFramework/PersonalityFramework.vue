<template>
  <div class="personality-framework">
    <h2>AI Personality Framework</h2>

    
    <template
            v-for="(segment, index) in textSegments"
            :key="'socket' + segment.uuid"
          >

            <Socket v-show="true" 
            :sessionId="segment.uuid" 
            :trigger="segment.trigger"
            :persona="null"
            :systemPrompt="segment.systemPrompt"
            :userPrompt="segment.userPrompt"
            :messageHistory="null"
            :model="models[0]"
            :temperature="0.2"
            >
            </Socket>
            

          </template>

    <div class="attributes">
      <h3>Personality Attributes</h3>
      <div
        v-for="attribute in attributes"
        :key="attribute.id"
        class="attribute-slider"
      >
        <label :title="attribute.description">{{ attribute.name }}</label>
        <Slider v-model="attribute.value" :min="1" :max="20" :step="1" />
        <span>{{ attribute.value }}</span>
      </div>
    </div>

    <div class="prompts">
      <h3>Prompts</h3>

      <div class="prompt-input">
        <label>System Prompt</label>
        <Textarea v-model="systemPrompt" rows="4" style="width: 100%" />
      </div>

      <div class="prompt-input">
        <label>User Prompt</label>

        <Textarea v-model="userPrompt" rows="4" style="width: 100%" />
      </div>
    </div>

    <Button  @click="letsGo"  label="Interact with LLM"/>

    <Socket
      v-show="true"
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
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { v4 as uuidv4 } from "uuid";
import Slider from "primevue/slider";
import Textarea from "primevue/textarea";
import Button from "primevue/button";
import Socket from "@/components/common/Socket.vue";


let models = ref([
  {
    concurrentInstances: 20,
    provider: "openAi",
    maxTokens: 128000,
    per1kInput: 0.01,
    per1kOutput: 0.03,
    model: "gpt-4-1106-preview",
    name: { en: "OpenAI GPT-4 Turbo (128k)", fr: "OpenAI GPT-4 Turbo (128k)" },
  },
  {
    concurrentInstances: 5,
    provider: "anthropic",
    maxTokens: 200000,
    per1kInput: 0.008,
    per1kOutput: 0.024,
    model: "claude-3-5-sonnet-20240620",
    name: { en: "Claude 3.5 Sonnet", fr: "Claude 3.5 Sonnet" },
  },
]);

const attributes = ref([
  {
    id: 1,
    name: "Tone of Voice",
    description: "How warm and engaging the AI's voice will be",
    value: 10,
  },
  {
    id: 2,
    name: "Language Style",
    description: "The complexity and sophistication of the language used",
    value: 10,
  },
  {
    id: 3,
    name: "Emotional Expression",
    description: "How positive and empathetic the AI's responses will be",
    value: 10,
  },
  {
    id: 4,
    name: "Pacing and Timing",
    description: "The speed and fluidity of the AI's responses",
    value: 10,
  },
  {
    id: 5,
    name: "Formality",
    description: "The level of politeness and formality in the AI's language",
    value: 10,
  },
  {
    id: 6,
    name: "Directness",
    description: "How straightforward or nuanced the responses are",
    value: 10,
  },
  {
    id: 7,
    name: "Humor and Wit",
    description: "The presence and type of humor incorporated",
    value: 10,
  },
  {
    id: 8,
    name: "Personalization",
    description: "The integration of user context and history into responses",
    value: 10,
  },
  {
    id: 9,
    name: "Engagement",
    description:
      "The level of interactivity and encouragement of user participation",
    value: 10,
  },
  {
    id: 10,
    name: "Cultural Sensitivity",
    description: "The awareness and respect for cultural nuances",
    value: 10,
  },
]);

let personalityFrameworkDescriptions = ref({
  personalityFramework: [
    {
      id: 1,
      name: "Tone of Voice",
      ranges: [
        { min: 0, max: 3, description: "Very cold and distant" },
        { min: 4, max: 6, description: "Neutral, slightly impersonal" },
        { min: 7, max: 9, description: "Neutral with minimal warmth" },
        { min: 10, max: 12, description: "Balanced and moderately warm" },
        { min: 13, max: 15, description: "Warm and friendly" },
        { min: 16, max: 18, description: "Very warm and engaging" },
        {
          min: 19,
          max: 20,
          description: "Extremely warm, enthusiastic, and inviting",
        },
      ],
    },
    {
      id: 2,
      name: "Language Style",
      ranges: [
        {
          min: 0,
          max: 3,
          description: "Very simple, basic language, short sentences",
        },
        {
          min: 4,
          max: 6,
          description: "Simple language, mostly short sentences",
        },
        {
          min: 7,
          max: 9,
          description: "Moderately simple language, varied sentence length",
        },
        {
          min: 10,
          max: 12,
          description: "Balanced language, mix of simple and slightly complex",
        },
        {
          min: 13,
          max: 15,
          description: "Moderately complex language, good vocabulary mix",
        },
        {
          min: 16,
          max: 18,
          description:
            "Complex language, sophisticated vocabulary, varied structure",
        },
        {
          min: 19,
          max: 20,
          description:
            "Very complex language, advanced vocabulary, intricate structure",
        },
      ],
    },
    {
      id: 3,
      name: "Emotional Expression",
      ranges: [
        { min: 0, max: 3, description: "Very unemotional and detached" },
        { min: 4, max: 6, description: "Slightly detached, minimal emotion" },
        { min: 7, max: 9, description: "Neutral emotional tone" },
        { min: 10, max: 12, description: "Balanced emotional expression" },
        {
          min: 13,
          max: 15,
          description: "Moderately emotional and empathetic",
        },
        { min: 16, max: 18, description: "Highly emotional and empathetic" },
        {
          min: 19,
          max: 20,
          description: "Extremely emotional and deeply empathetic",
        },
      ],
    },
    {
      id: 4,
      name: "Pacing and Timing",
      ranges: [
        { min: 0, max: 3, description: "Very slow and deliberate" },
        { min: 4, max: 6, description: "Slow-paced" },
        { min: 7, max: 9, description: "Moderately slow" },
        { min: 10, max: 12, description: "Balanced pace" },
        { min: 13, max: 15, description: "Moderately fast" },
        { min: 16, max: 18, description: "Fast-paced" },
        { min: 19, max: 20, description: "Very fast and fluid" },
      ],
    },
    {
      id: 5,
      name: "Formality",
      ranges: [
        { min: 0, max: 3, description: "Very informal and casual" },
        { min: 4, max: 6, description: "Informal" },
        { min: 7, max: 9, description: "Slightly informal" },
        { min: 10, max: 12, description: "Balanced formality" },
        { min: 13, max: 15, description: "Slightly formal" },
        { min: 16, max: 18, description: "Formal" },
        { min: 19, max: 20, description: "Very formal and polite" },
      ],
    },
    {
      id: 6,
      name: "Directness",
      ranges: [
        { min: 0, max: 3, description: "Very indirect and nuanced" },
        { min: 4, max: 6, description: "Indirect" },
        { min: 7, max: 9, description: "Slightly indirect" },
        { min: 10, max: 12, description: "Balanced directness" },
        { min: 13, max: 15, description: "Moderately direct" },
        { min: 16, max: 18, description: "Very direct" },
        {
          min: 19,
          max: 20,
          description: "Extremely direct and straightforward",
        },
      ],
    },
    {
      id: 7,
      name: "Humor and Wit",
      ranges: [
        { min: 0, max: 3, description: "No humor" },
        { min: 4, max: 6, description: "Minimal humor" },
        { min: 7, max: 9, description: "Occasional light humor" },
        { min: 10, max: 12, description: "Balanced humor" },
        { min: 13, max: 15, description: "Frequent humor" },
        { min: 16, max: 18, description: "Very humorous and witty" },
        { min: 19, max: 20, description: "Extremely humorous, constant wit" },
      ],
    },
    {
      id: 8,
      name: "Personalization",
      ranges: [
        { min: 0, max: 3, description: "No personalization" },
        { min: 4, max: 6, description: "Minimal personalization" },
        { min: 7, max: 9, description: "Slight personalization" },
        { min: 10, max: 12, description: "Moderate personalization" },
        { min: 13, max: 15, description: "High personalization" },
        { min: 16, max: 18, description: "Very high personalization" },
        {
          min: 19,
          max: 20,
          description: "Extremely personalized and context-aware",
        },
      ],
    },
    {
      id: 9,
      name: "Engagement",
      ranges: [
        { min: 0, max: 3, description: "Very low engagement" },
        { min: 4, max: 6, description: "Low engagement" },
        { min: 7, max: 9, description: "Moderate engagement" },
        { min: 10, max: 12, description: "Balanced engagement" },
        { min: 13, max: 15, description: "High engagement" },
        { min: 16, max: 18, description: "Very high engagement" },
        { min: 19, max: 20, description: "Extremely engaging and interactive" },
      ],
    },
    {
      id: 10,
      name: "Cultural Sensitivity",
      ranges: [
        { min: 0, max: 3, description: "No cultural awareness" },
        { min: 4, max: 6, description: "Minimal cultural awareness" },
        { min: 7, max: 9, description: "Some cultural awareness" },
        { min: 10, max: 12, description: "Moderate cultural sensitivity" },
        { min: 13, max: 15, description: "High cultural sensitivity" },
        { min: 16, max: 18, description: "Very high cultural sensitivity" },
        {
          min: 19,
          max: 20,
          description: "Extremely culturally sensitive and aware",
        },
      ],
    },
  ],
});

const userPrompt = computed(() => {
  let prompt = `
    Generate a character named JP. 
    JP is a wizard who lives in the mythical land of Awatto. 
    Generate a personality persona for him based on the attributes provided below.
    ${JSON.stringify(attributes.value)}

    Based on the scores provided in the following JSON, return the corresponding description in the personality framework.
 ${JSON.stringify(personalityFrameworkDescriptions.value)}

    `;

  return prompt;
});

const systemPrompt = ref(`

You are a persona generator. 
You reference the attached attributes which range from 1-20. 
Use these characteristics to generate a personality and provide a proposed backstory and set of motivations for this character.

`);

let prompt = ref({
  sessionId: uuidv4(),
  trigger: false,
  persona: null,
  systemPrompt: null,
  userPrompt: null,
  messageHistory: [],
  model: models.value[0],
  temperature: 0.2,
});

const letsGo = () => {
  prompt.value.userPrompt = userPrompt.value;
  prompt.value.systemPrompt = systemPrompt.value;
  prompt.value.trigger = !prompt.value.trigger;
};
</script>

<style scoped>
.personality-framework {
  max-width: 600px;
  margin: 0 auto;
}

.attribute-slider {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.attribute-slider label {
  width: 150px;
  cursor: help;
}

.attribute-slider .p-slider {
  flex-grow: 1;
  margin: 0 1rem;
}

.prompt-input {
  margin-bottom: 1rem;
}

.prompt-input label {
  display: block;
  margin-bottom: 0.5rem;
}
</style>
