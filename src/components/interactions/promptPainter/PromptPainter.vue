<template>
    <Socket
        v-if="accomplishmentPrompt.uuid"
        v-show="false"
        :sessionId="accomplishmentPrompt.uuid"
        :trigger="accomplishmentPrompt.trigger"
        :persona="null"
        systemPrompt="Help me to build out this idea"
        :userPrompt="accomplishmentPrompt.text"
        :messageHistory="[]"
        :model="models[0]"
        :temperature="0.2"
        @messageComplete="(payload) => messageCompleteAccomplishment(accomplishmentPrompt, payload)"
        @messagePartial="(payload) => messagePartialAccomplishment(accomplishmentPrompt, payload)"
        @messageError="(payload) => messageErrorAccomplishment(accomplishmentPrompt, payload)"
    >
    </Socket>

    <template v-for="(segment, index) in textSegments" :key="'socket' + segment.uuid">
        <Socket
            v-show="false"
            :sessionId="segment.uuid"
            :trigger="segment.trigger"
            :persona="null"
            :systemPrompt="segment.systemPrompt"
            :userPrompt="segment.userPrompt"
            :messageHistory="[]"
            :model="models[0]"
            :temperature="0.2"
            @messageComplete="(payload) => messageComplete(segment, payload)"
            @messagePartial="(payload) => messagePartial(segment, payload)"
            @messageError="(payload) => messageError(segment, payload)"
        >
        </Socket>
    </template>

    <div class="painter-layout-wrapper">
        <Sidebar v-model:visible="sidebarVisible">
            <!-- Add your sidebar content here -->
        </Sidebar>

        <div class="painter-layout-main">
            <div class="grid">
                <div class="col-12 md:col-8 bg-white" v-show="true" v-if="textSegments.length">
                    <span class="w-full">
                        <label class="text-lg w-full" for="accomplishment">What are we accomplishing today?</label>
                        <Textarea id="accomplishment" v-model="accomplishmentPrompt.text" autoResize rows="auto" class="w-full p-inputtext-lg editable-container" autocomplete="off" />
                    </span>
                    <!-- <span class="w-full">
            <label class="text-lg" for="knowledge"
              >What information can you share to get started?</label
            >
            <Textarea
              id="knowledge"
              v-model="knowledge"
              autoResize
              rows="auto"
              class="w-full p-inputtext-lg editable-container"
              autocomplete="off"
            />
          </span> -->

                    <Button @click="accomplishmentPrompt.trigger = !accomplishmentPrompt.trigger"> Let's Go! </Button>
                </div>
                <div class="col-12 lg:col-12 mb-3 lg:mb-0">
                    <EditableHighlightText
                        v-model:textSegments="textSegments"
                        :cursorSelect="cursorSelect"
                        @update:textSegments="handleTextSegmentsUpdate"
                        @cursorUpdate="handleCursorUpdate"
                        @changeSegmentSelected="changeSegmentSelected"
                        @splitSegment="handleSplitSegment"
                        @updateSegment="updateSegment"
                        @paintAction="handlePaintAction"
                    />
                </div>
                <Button @click="deleteSelectedSegment" class="mr-2"> Delete Selected Segment </Button>
                <Button @click="mergeAllTextSegments"> Merge All Segments </Button>

                <!-- {{ textSegments }} -->
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import Socket from '@/components/common/Socket.vue';

import EditableHighlightText from '@/components/interactions/promptPainter/EditableHighlightText.vue';
import Sidebar from 'primevue/sidebar';

import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Slider from 'primevue/slider';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputSwitch from 'primevue/inputswitch';

const sidebarVisible = ref(false);
const accomplishment = ref('');
const knowledge = ref('');
const editableContent = ref('');
const sliderValue = ref(0);
const autoEnhance = ref(false);
let models = ref([
    {
        concurrentInstances: 20,
        provider: 'openAi',
        maxTokens: 128000,
        per1kInput: 0.01,
        per1kOutput: 0.03,
        model: 'gpt-4-1106-preview',
        name: { en: 'OpenAI GPT-4 Turbo (128k)', fr: 'OpenAI GPT-4 Turbo (128k)' }
    },
    {
        concurrentInstances: 5,
        provider: 'anthropic',
        maxTokens: 200000,
        per1kInput: 0.008,
        per1kOutput: 0.024,
        model: 'claude-3-5-sonnet-20240620',
        name: { en: 'Claude 3.5 Sonnet', fr: 'Claude 3.5 Sonnet' }
    }
]);

const defaultTextSegment = {
    uuid: '',
    text: '',
    highlighted: false,
    processing: false,
    history: [], //A history of all the previous texts, in order, and on the date and time the change was made, and by whom (human or AI)
    trigger: false,
    systemPrompt: null,
    userPrompt: null,
    messagePartial: '',
    messageComplete: '',
    messageError: '',
    active: true
};

const textSegments = ref([]);
const textSegmentSelected = ref(null);
const cursorSelect = ref({ segmentIndex: 0, offset: 0 });
const currentCursor = ref({ segmentIndex: 0, offset: 0 });
const accomplishmentPrompt = ref({});
function handleCursorUpdate(cursorInfo) {
    textSegments.value.forEach((segment) => {
        segment.highlighted = false;
    });

    textSegments.value[cursorInfo.segmentIndex].highlighted = true;
    currentCursor.value = cursorInfo;
    // You can perform any additional logic here based on the cursor position
}

onMounted(() => {
    let newSegment = JSON.parse(JSON.stringify(defaultTextSegment));
    newSegment.uuid = uuidv4();
    newSegment.text = '\u200B';
    newSegment.highlighted = true;
    textSegments.value.push(newSegment);

    accomplishmentPrompt.value = JSON.parse(JSON.stringify(defaultTextSegment));
    accomplishmentPrompt.value.uuid = uuidv4();

    //  newSegment = JSON.parse(JSON.stringify(defaultTextSegment))
    // newSegment.uuid = uuidv4();
    // newSegment.text = "\n\nHere is the second section."
    // newSegment.highlighted = false;
    // textSegments.value.push(newSegment)

    // newSegment = JSON.parse(JSON.stringify(defaultTextSegment))
    // newSegment.uuid = uuidv4();
    // newSegment.text = "\n\nHere is the third section."
    // newSegment.highlighted = false;
    // textSegments.value.push(newSegment)
});

//Add a new segment after
//Add a new segment before
//Split a segment into old half, new half, or middle split (divide into 3)
function changeSegmentSelected(index) {
    textSegmentSelected.value = textSegments.value[index];
}

// function handleTextSegmentsUpdate(event) {
//   const { textSegments, index } = event;
//   textSegments.value.splice(index, 1, ...textSegments);
// }

function handleTextSegmentsUpdate(updatedSegments) {
    // console.log("Segment to update", updatedSegments)
    textSegments.value = updatedSegments;
}

function updateSegment({ index, newValue }) {
    console.log(index, newValue);
    console.log(textSegments.value);
    textSegments.value[index].text = newValue;
}

function handleSplitSegment({ uuid, index, cursorIndex, splitType, atEndOfSegment, selectionRange }) {
    const segmentToSplit = textSegments.value[index];
    if (!segmentToSplit) return;

    textSegments.value.forEach((segment) => {
        segment.highlighted = false;
    });

    const isLastSegment = index === textSegments.value.length - 1;
    let newSegments = [...textSegments.value];

    // Helper functions
    const createNewSegment = (text, highlighted = false) => ({
        uuid: uuidv4(),
        text: text,
        highlighted: highlighted,
        active: true,
        processing: false,
        history: [],
        specialInstructions: null,
        messagePartial: null,
        messageComplete: null,
        messageError: null
    });

    const updateCursorSelect = (segment, segmentIndex, offset) => {
        cursorSelect.value = {
            uuid: segment.uuid,
            segmentIndex: segmentIndex,
            offset: offset,
            momentUpdated: new Date()
        };
    };

    // Handle insert operation
    if (splitType === 'insert') {
        const newSegment = createNewSegment('\n\r', true);
        newSegments.splice(index + 1, 0, newSegment);
        updateCursorSelect(newSegment, index + 1, 1);
    } else {
        // Automatic operation based on selectionRange
        if (selectionRange && selectionRange.start !== selectionRange.end) {
            // Isolate operation
            const beforeSelection = segmentToSplit.text.substring(0, selectionRange.start);
            const selectedText = segmentToSplit.text.substring(selectionRange.start, selectionRange.end);
            const afterSelection = segmentToSplit.text.substring(selectionRange.end);

            const newSegmentSelected = createNewSegment(selectedText, true);
            const segmentsToInsert = [beforeSelection ? createNewSegment(beforeSelection) : null, newSegmentSelected, afterSelection ? createNewSegment(afterSelection) : null].filter(Boolean); // Remove null entries if they exist

            newSegments.splice(index, 1, ...segmentsToInsert);
            // Update cursorSelect to the new isolated segment
            const newSegmentIndex = beforeSelection ? index + 1 : index; // Determine the index of the new isolated segment
            updateCursorSelect(newSegmentSelected, newSegmentIndex, 0);
        } else if (!atEndOfSegment) {
            // Split operation
            const beforeCursor = segmentToSplit.text.substring(0, cursorIndex);
            const afterCursor = segmentToSplit.text.substring(cursorIndex);
            const newSegmentAfter = createNewSegment(afterCursor, true);
            newSegments.splice(index, 1, createNewSegment(beforeCursor), newSegmentAfter);
            updateCursorSelect(newSegmentAfter, index + 1, 0);
        } else if (atEndOfSegment && isLastSegment) {
            // Add a new blank segment at the end of the last segment
            const newSegment = createNewSegment('\n\r', true);
            newSegments.push(newSegment);
            updateCursorSelect(newSegment, newSegments.length - 1, 1);
        }
    }

    // Update the text segments with the new array
    textSegments.value = newSegments;
}

function handlePaintAction({ action, prompt }) {
    if (currentCursor?.value) {
        let segment = textSegments.value[currentCursor.value.segmentIndex];

        if (action == 'expand') {
            segment.systemPrompt = `
    You are an editor who expands on concepts.
        #
        One of your most important jobs is to Keep things brief
    Estimate the total number of words in the text content.  
    In your response. !Important!: Only increase the length and detail by a maximum of 200%, or double the words of what is provided in the text. Never more.

    Do not reference the whole document JSON
    Never respond in JSON
    If there is a header or title, recreate it, otherwise do not provide a header in your response.
    Never address the user, always stricktly just expand on the content

    `;
        }

        if (action == 'contract') {
            segment.systemPrompt = `
    You are an editor who summarizes or shrinks existing concepts.
        #
        You attempt cut the number of words in half, while retaining all the key concepts

    Do not reference the whole document JSON
    Never respond in JSON
    If there is a header or title, recreate it, otherwise do not provide a header in your response.
    Never address the user, always stricktly just expand on the content

    `;
        }

        if (action == 'refine') {
            segment.systemPrompt = `
    Rewrite the passage of text provided following the special instructions. Ensure you consider and follow each step provided. 
    Never respond in JSON
    If there is a header or title, recreate it, otherwise do not provide a header in your response.
    Never address the user, always stricktly just modify  the content based on the special instructions.
    `;
        }

        if (action == 'autoEnhance') {
            segment.systemPrompt = `
    Rewrite the text provided following the special instructions. Ensure you consider and follow each step provided. 

    Do not reference the whole document JSON
    Never respond in JSON
    If there is a header or title, recreate it, otherwise do not provide a header in your response.
    Never address the user, always stricktly just expand on the content
    `;

            prompt = `Evaluate this text and present a better alternative: ${segment.text}
      
          ##Here is the entire text as context. DO not reference anything other than the Text to rewrite:
    "${JSON.stringify({
        text: textSegments.value[currentCursor.value.segmentIndex].text
    })}`;
        }

        segment.userPrompt = prompt;
        segment.processing = true;
        segment.trigger = !segment.trigger;

        // console.log("segment to trigger", segment);
    }

    if (action == 'autoEnhance') {
        autoEnhance.value = !autoEnhance.value;
    }
}

function messagePartial(segment, payload) {
    if (payload?.message?.length) {
        segment.messagePartial = payload.message;
        segment.processing = true;
    }
}

function messageComplete(segment, payload) {
    if (payload?.message?.length) {
        segment.text = payload.message + '\n';
        segment.messagePartial = null;
        segment.processing = false;
    }

    if (autoEnhance.value) {
        textSegments.value.forEach((thisSegment) => {
            let countProcessing = textSegments.value.filter((segment) => segment.processing).length;
            if (countProcessing < models.value[0].concurrentInstances) {
                if (thisSegment.uuid !== segment.uuid) {
                    thisSegment.systemPrompt = `You are an editor, evaluating and enhancing sections of a document.
       Do not reference the whole document JSON
        Never respond in JSON

        Always preserve header numbers.
        If there is a header or title, recreate it, otherwise do not provide a header in your response.
        Never address the user, always stricktly just expand on the content
      `;

                    //User Prompt
                    thisSegment.userPrompt = `Evaluate this text and present a better alternative if one exists. Maintain its structure, but expand in the text as much as you can. Take into consideration all other parts of the document.: ${
                        thisSegment.text
                    }
      
          ##Here is the entire text as context. DO not reference anything other than the Text to rewrite:
    "${JSON.stringify({
        text: textSegments.value[currentCursor.value.segmentIndex].text
    })}`;

                    // thisSegment.autoEnhancedCount += 1;
                    thisSegment.processing = 'pending';
                }
            }
        });
    }

    textSegments.value.forEach((thisSegment) => {
        if (thisSegment.uuid !== segment.uuid && thisSegment.processing == 'pending') {
            thisSegment.processing = true;
            thisSegment.trigger = !thisSegment.trigger;
        }
    });
}

function messageError(segment, payload) {
    console.log('Error', payload);
}

function messagePartialAccomplishment(segment, payload) {
    if (payload?.message?.length) {
        textSegments.value[0].messagePartial = payload.message;
        textSegments.value[0].processing = true;
    }
}

function messageCompleteAccomplishment(segment, payload) {
    if (payload?.message?.length) {
        textSegments.value[0].text = payload.message + '\n';
        textSegments.value[0].messagePartial = null;
        textSegments.value[0].processing = false;
    }
}

function messageErrorAccomplishment(segment, payload) {
    console.log('Error', payload);
}

function mergeAllTextSegments() {
    // Concatenate all the text fields from the textSegments array
    const mergedText = textSegments.value.map((segment) => segment.text).join('');

    // Create a new object with the merged text, highlighted set to true, and an empty history array
    const mergedSegment = {
        uuid: uuidv4(),
        text: mergedText,
        highlighted: true,
        active: true,
        processing: false,
        history: [],
        specialInstructions: null,
        messagePartial: null,
        messageComplete: null,
        messageError: null
    };

    // Reset the textSegments ref to an array containing just the merged segment
    textSegments.value = [mergedSegment];

    cursorSelect.value = {
                uuid:mergedSegment.uuid,
                segmentIndex:0,
                offset:mergedSegment.text.length,
                momentUpdated:new Date()
            }

}

function deleteSelectedSegment() {
    if (currentCursor?.value?.segmentIndex != null && currentCursor.value.segmentIndex >= 0) {
        // Use splice to remove the item at the specified index

        textSegments.value.splice(currentCursor.value.segmentIndex, 1);
        if (!textSegments.value.length) {
            const newSegment = {
                uuid: uuidv4(),
                text: 'A new segment...',
                highlighted: true,
                active: true,
                processing: false,
                history: [],
                specialInstructions: null,
                messagePartial: null,
                messageComplete: null,
                messageError: null
            };
            textSegments.value.push(newSegment);

            cursorSelect.value = {
                uuid:newSegment.uuid,
                segmentIndex:0,
                offset:newSegment.text.length,
                momentUpdated:new Date()
            }

        }

        nextTick(() => {
            if (currentCursor.value.segmentIndex > 0 && textSegments.value.length) {
                cursorSelect.value = JSON.parse(
                    JSON.stringify({
                        uuid: textSegments.value[currentCursor.value.segmentIndex - 1].uuid,
                        segmentIndex: currentCursor.value.segmentIndex - 1,
                        offset: textSegments.value[currentCursor.value.segmentIndex - 1].text.length,
                        momentUpdated: new Date()
                    })
                );
            }
        });
    }
}
</script>

<style scoped>
.painter-layout-wrapper {
    display: flex;
    min-height: 100vh;
    /* padding-top: 20px; */
}

.painter-layout-main {
    flex: 1;
    padding: 1rem;
}

.editable-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
    background-color: #ffffff;
    border-radius: 8px;
    border: 2px solid #e0e0e0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    padding: 24px;
    /* margin: 16px; */
    transition: all 0.1s ease-in-out;
    min-height: 80px;
}

.editable-container:hover {
    border-color: #3b82f6; /* You can replace this with your primary color */
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    /* transform: scale(1.01); */
}

.editable-container:focus {
    border-color: #3b82f6; /* You can replace this with your primary color */
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    /* transform: scale(1.01); */
}
</style>
