<template>
  <div class="w-full">
    <!-- Main Container -->
    <div
      class="p-1 bg-white border border-gray-200 rounded-lg shadow md:flex-row hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 relative"
    >
      <!-- Persona Template -->
      <template v-if="props?.persona">
        <div class="flex row">
          <div class="flex-col">
            <img
              v-if="props.persona.url"
              class="object-cover w-full rounded-t-lg md:h-24 md:w-24 rounded"
              :src="props.persona.url"
              alt=""
            />
          </div>
          <div class="flex-col leading-normal pl-3 pr-2 pt-3">
            <h5
              class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white whitespace-wordwrap"
            >
              {{ props.persona.name }}
            </h5>
            <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">
              {{ props.persona.description.en }}.
            </p>
          </div>
        </div>
      </template>

      <slot> </slot>

      <!-- Interim and final message section -->
      <div
        v-if="partialMessage && !messageHistory.length"
        v-html="partialMessageMarkdown"
        class="border w-full transition duration-300 preserve-whitespace-pre-line p-4 pt-10 rounded-md"
      ></div>

      <div v-if="completedMessage && !messageHistory.length" class="relative">
  
        <EditContent
          class="w-full p-4 pt-10"
          v-model:content="sessions[sessionId].completedMessage"
        />
      </div>

      <div v-if="editPersona">
        <EditContent
          v-if="props.persona && editPersona"
          class="w-full"
          v-model:content="props.persona.basePrompt"
        />
      </div>
 
    </div>

    <div
      v-if="
        sessions?.[sessionId]?.completedMessage?.length &&
        (sessions[sessionId].completedMessage.includes('# Slide') ||
          sessions[sessionId].completedMessage.includes('# Diapositive'))
      "
      class="w-full h-96 pointer-events-none"
      aria-hidden="true"
    >
      <MarkdownReveal :markdownContent="sessions[sessionId].completedMessage" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { v4 as uuidv4 } from "uuid";
import MarkdownIt from "markdown-it";

//Helper Functions
import { extractData } from "@/utils/extractJsonAndCode.js";

//Components
import EditContent from "@/components/common/EditContent.vue";
import MarkdownReveal from "@/components/common/MarkdownReveal.vue";

//Composables
import { useRealTime } from "@/composables/useRealTime.js";

 const {
  wsUuid,
  sessions,
  registerSession,
  unregisterSession,
  sendToServer,
} = useRealTime();

//Props
const props = defineProps({
  sessionId: { type: String, default: () => uuidv4() },
  trigger: { type: Boolean, default: false },
  persona: { type: Object },
  systemPrompt: { type: String, default: "" },
  userPrompt: { type: String, default: "" },
  messageHistory: { type: Array, default: [] },
  model: { type: Object, default: null },
  temperature: { type: Number, default: 0.5 },
});


let editPersona = ref(false);
let processing = ref(false);

const sessionId = computed(() => props.sessionId);
const trigger = computed(() => props.trigger);
const persona = computed(() => props.persona);
const systemPrompt = computed(() => props.systemPrompt);
const userPrompt = computed(() => props.userPrompt);
const messageHistory = computed(() => props.messageHistory);
const model = computed(() => props.model); // includes provider and model name for various LLM APIs
const temperature = computed(() => props.temperature);

const emit = defineEmits([
  "edit",
  "close",
  "addSocket",
  "removeSocket",
  "messageComplete",
  "messagePartial",
  "messageError",
]);

const partialMessage = computed(() => {
  if (sessions?.value) {
    const session = sessions.value[sessionId.value]; // Use the sessionId prop to access the correct session
    return session ? session?.partialMessage : "";
  } else return "";
});

const completedMessage = computed(() => {
  if (sessions?.value) {
    const session = sessions.value[sessionId.value]; // Use the sessionId prop to access the correct session
    return session ? session?.completedMessage : "";
  } else return "";
});

const errorMessage = computed(() => {
  if (sessions?.value) {
    const session = sessions.value[sessionId.value]; // Use the sessionId prop to access the correct session
    return session ? session?.errorMessage : "";
  } else return "";
});


watch(trigger, (newValue, oldValue) => {
  //Execute this socket
  sendMessage();
});

watch(completedMessage, (newValue, oldValue) => {
  if (!oldValue.length && newValue.length) {
    processing.value = false;
    emit("messageComplete", { message: newValue, sessionId: sessionId.value });
  }
});

watch(partialMessage, (newValue, oldValue) => {
  emit("messagePartial", { message: newValue, sessionId: sessionId.value });
});

watch(errorMessage, (newValue, oldValue) => {

  if (!oldValue?.length && newValue?.length) {
    console.log("Socket Error", errorMessage)
    emit("messageError");
    sessions.value[sessionId.value].errorMessage = "";
    processing.value = false;
  }
});

onMounted(() => {
  registerSession(sessionId.value, props.persona);
  emit("addSocket", {
    persona: props.persona,
    sessionId: sessionId.value,
  });
});

onBeforeUnmount(() => {
  unregisterSession(sessionId.value);
  emit("removeSocket", {
    persona: props.persona,
    sessionId: sessionId.value,
  });
});

function sendMessage() {
  if (wsUuid?.value) {
    if (!processing.value) {
      if (sessions?.value?.[sessionId?.value])
        sessions.value[sessionId.value].completedMessage = "";
      var sysPrompt = props?.persona?.basePrompt || systemPrompt.value || "";
      // console.log(sysPrompt)
      //Format is always : uuid, session, model, temperature, systemPrompt, userPrompt, knowledgeProfileUuids, type
      
      console.log("sysPrompt", sysPrompt)
      console.log("userPrompt.value", userPrompt.value)
      
      sendToServer(
        wsUuid.value, //Websocket connection
        sessionId.value, //UUID for the Socket
        model.value.provider || "openAi", //Model provider
        model.value.model || "gpt-4", //Model name
        temperature.value, //Tempoerature
        sysPrompt, //System prompt
        userPrompt.value, //The user prompt
        messageHistory.value, //A longer message history, if a chat function
        "prompt"
      );
      processing.value = true;
    }
  }
}

function clear() {
  if (sessions?.value?.[sessionId?.value])
    sessions.value[sessionId.value].completedMessage = "";
}

const onCloseClick = () => {
  emit("close", null);
};

const onEditClick = () => {
  editPersona.value = !editPersona.value;
};

const partialMessageMarkdown = computed(() => {
  const md = new MarkdownIt();
  return md.render(partialMessage.value);
});

const md = new MarkdownIt();

const completedMessageMarkdown = computed(() => {
  return md.render(completedMessage.value);
});

async function copyToClipboard(text) {
  if (typeof text == "object") text = JSON.stringify(text);
  try {
    await navigator.clipboard.writeText(text);
   } catch (err) {
    console.log("Error copying", err)
   }
}

function stripHtmlTags(htmlString) {
  const temporaryDiv = document.createElement("div");
  temporaryDiv.innerHTML = htmlString;
  return temporaryDiv.textContent || temporaryDiv.innerText || "";
}
</script>

<style scoped>
.card {
  display: flex;
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
}

.left-section,
.center-section,
.right-section {
  display: flex;
  align-items: center;
}

.left-section {
  flex: 1;
  margin-right: 10px;
}

.center-section {
  flex: 3;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-right: 10px;
  /* Adjust margin as necessary */
}

.right-section {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.rounded-image {
  border-radius: 50%;
  width: 50px;
  height: 50px;
}

.title {
  margin: 0;
}

.subtitle {
  margin: 0;
}

.icon-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #eee;
  margin: 0 5px;
}

.status-icon {
  background-color: green;
  /* Adjust based on the status */
}
</style>
<!-- 
<style src="reveal.js/dist/reveal.css"></style>
<style src="reveal.js/dist/theme/black.css"></style> -->
