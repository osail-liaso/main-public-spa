<template>
    <div class="grid">
        <div class="col-12 md:col-8 bg-white">
            <div class="editable-container">
                <div class="content-wrapper" ref="contentElement" @mouseup="handleMouseUp($event, null)">
                    <template v-for="(segment, index) in textSegments" :key="segment.uuid">
                        <span
                            v-show="segment.active"
                            :data-uuid="segment.uuid"
                            class="text-content"
                            :class="{ highlight: segment.highlighted }"
                            contenteditable="true"
                            @input="handleInput($event, segment.uuid)"
                            @keydown="handleKeyDown($event, segment.uuid)"
                            @keyup="handleKeyUp($event, segment.uuid)"
                            @mouseup="handleMouseUp($event, segment.uuid)"
                            @paste="handlePaste($event, segment.uuid)"
                            >{{ segment.messagePartial ? segment.messagePartial : segment.text }}</span
                        >
                    </template>
                </div>
            </div>

            Current Segment Selected: {{ currentCursor.segmentIndex }}

            <div class="flex">
                <InputSwitch id="displayTable" v-model="displayTable" />
                <label for="displayTable" class="p-1"> Display Editor Table </label>
            </div>

            <DataTable
                v-if="displayTable"
                :value="textSegments"
                editMode="cell"
                @cell-edit-complete="onCellEditComplete"
                :pt="{
                    table: { style: 'min-width: 50rem' },
                    column: {
                        bodycell: ({ state }) => ({
                            class: [{ 'pt-0 pb-0': state['d_editing'] }]
                        })
                    }
                }"
            >
                <Column field="text" header="Text Segment" style="width: 70%">
                    <template #body="{ data }">
                        <Textarea v-if="data?.text?.length" :value="data.text.trim().substring(0, 50) + '...'" rows="1" class="w-full p-inputtext-lg editable-container" />

                        <!-- {{ data.text.substring(0,50)+"..." }} -->
                    </template>
                    <template #editor="{ data }">
                        <Textarea v-model="data.text" class="w-full p-inputtext-lg editable-container" autocomplete="off" rows="auto" @keydown="handleTextareaKeydown($event, data)" />

                        <!-- <textarea v-model="data.text" autofocus /> -->
                    </template>
                </Column>
                <Column field="highlighted" header="Length" style="width: 30%">
                    <template #body="{ data }">
                        {{ data.text.length }}
                    </template>
                    <!-- <template #editor="{ data }">
            <InputSwitch v-model="data.highlighted" />
          </template> -->
                </Column>
                <Column field="active" header="Active" style="width: 30%">
                    <template #body="{ data }">
                        <InputSwitch v-model="data.active" />
                    </template>
                </Column>

                <Column field="processing" header="Processing" style="width: 30%">
                    <template #body="{ data }">
                        {{ data.processing }}
                        <!-- <InputSwitch v-model="data.active" /> -->
                    </template>
                </Column>
            </DataTable>
        </div>

        <div class="col-12 lg:col-4">
            <div class="prompt-painter control-bar p-2 border-round bg-gray-100">
                <span>Prompt Painter</span>

                <div class="button-row">
                    <Button label="Split Segment" @click="splitSelection(null)" />
                    <Button label="Add Segment" @click="splitSelection('insert')" />
                </div>

                <div class="button-row">
                    <Button @click="paintAction('expand')" label="Expand 2x" class="p-button-success" />
                    <Button @click="paintAction('contract')" label="Contract 1/2" class="p-button-success" />
                </div>

                <label class="text-lg" for="specialInstructions">Special Instructions</label>

                <InputText id="specialInstructions" v-model="specialInstructions" class="w-full p-inputtext-lg editable-container" autocomplete="off" />

                <div class="button-row">
                    <Button @click="paintAction('refine')" label="Submit" class="p-button-success" />
                </div>

                <!-- <div class="button-row">
          <Button @click="paintAction('autoEnhance')"
           label="AutoEnhance Document"  class="p-button-success" />
        </div> -->

                <p style="font-weight: 800; padding: 0px; margin: 0px">Instructions</p>
                <ul>
                    <li>Select text and then press Ctrl+Enter to isolate it, or press Split Segment.</li>
                    <li>Press Insert Segment to add a segment at the end of the current segment.</li>
                    <li>Use Tab to move forward between segments, or Ctrl+Tab to move backward</li>
                    <li>'Expand' is pre-programmed to double the length of your text (roughly). It observers the whole document as context.</li>
                    <li>'Contract' is pre-programmed to halve it (roughly) while maintaining intent. It observers the whole document as context.</li>
                    <li>'Submit' executes whatever special instruction you provide. It ignores the whole document.</li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, watchEffect, onMounted, nextTick } from 'vue';

const props = defineProps({
    textSegments: Array,
    cursorSelect: Object
});

let models = ref([
    { concurrentInstances: 20, provider: 'openAi', maxTokens: 128000, per1kInput: 0.01, per1kOutput: 0.03, model: 'gpt-4-1106-preview', name: { en: 'OpenAI GPT-4 Turbo (128k)', fr: 'OpenAI GPT-4 Turbo (128k)' } },
    { concurrentInstances: 5, provider: 'anthropic', maxTokens: 200000, per1kInput: 0.008, per1kOutput: 0.024, model: 'claude-3-5-sonnet-20240620', name: { en: 'Claude 3.5 Sonnet', fr: 'Claude 3.5 Sonnet' } }
]);

const emit = defineEmits(['update:textSegments', 'cursorUpdate', 'splitSegment', 'updateSegment', 'paintAction', 'changeSegmentSelected']);
const contentElement = ref(null);
const specialInstructions = ref(null);
const displayTable = ref(false);

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Slider from 'primevue/slider';

import InputSwitch from 'primevue/inputswitch';

const currentCursor = ref({ node: null, offset: 0, segmentIndex: 0 });
watch(currentCursor, (newCursor, oldCursor) => {
    if (newCursor.segmentIndex !== oldCursor.segmentIndex) {
        // The cursor has moved to a different segment
        // First, set all segments to not be highlighted
        const updatedSegments = props.textSegments.map((segment, index) => ({
            ...segment,
            highlighted: false
        }));

        // Now, set the newly selected segment to be highlighted
        if (newCursor.segmentIndex >= 0 && newCursor.segmentIndex < updatedSegments.length) {
            updatedSegments[newCursor.segmentIndex].highlighted = true;
        }

        // Emit the updated segments with the new highlight statuses
        emit('update:textSegments', updatedSegments);
    }
});

watch(
    () => props.cursorSelect,
    async (newCursor, oldCursor) => {
        // ... rest of your watch logic
        await nextTick();
        console.log('cursorSelect changed', newCursor);

        const spanElement = contentElement.value.querySelector(`span[data-uuid="${newCursor.uuid}"]`);
        if (spanElement) {
            console.log('Span Element');
            spanElement.focus();
            setCursor(spanElement, newCursor.offset);
        }

        console.log('spanElement', spanElement);
    },
    { deep: true }
);

function handleInput(event, uuid) {
    // console.log('Input event:', event.inputType);

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const currentSegment = props.textSegments.find((s) => s.uuid === uuid);
    if (!currentSegment) {
        // No valid segment found, handle error or ignore
        return;
    }

    // Since Enter key is handled in handleKeyDown, we no longer need
    // to check for 'insertParagraph' here. So, this conditional block can be removed.

    // Handle other input types (e.g., text input)
    updateTextAndHighlights();
    updateCursorPosition();
}
function setCursor(node, offset) {
    const range = document.createRange();
    const sel = window.getSelection();

    range.setStart(node, offset);
    range.collapse(true);

    sel.removeAllRanges();
    sel.addRange(range);
}

function handleKeyUp(event, uuid) {
    // The Enter key is handled in handleKeyDown, so we don't need special logic for it here.

    updateCursorPosition();
}

function handleKeyDown(event, uuid) {
    if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault(); // Prevent the default behavior of the enter key
        // Trigger the splitSegment split command
        // console.log("Lets split")
        splitSelection('split');
    } else if (event.key === 'Enter') {
        event.preventDefault(); // Prevent the default behavior of the enter key

        // Find the current segment based on the uuid
        const currentSegment = props.textSegments.find((s) => s.uuid === uuid);
        if (!currentSegment) return;

        // Use the currentCursor.value.offset for the caret position
        const caretPosition = currentCursor.value.offset;

        // Split the text at the caret position to insert a newline
        const beforeCursor = currentSegment.text.substring(0, caretPosition);
        const afterCursor = currentSegment.text.substring(caretPosition);
        const updatedText = beforeCursor + '\n' + afterCursor;

        // Update the current segment text
        const updatedSegments = props.textSegments.map((segment) => (segment.uuid === uuid ? { ...segment, text: updatedText } : segment));

        emit('update:textSegments', updatedSegments); // Emit the updated segments array

        nextTick(() => {
            // Ensure the DOM has been updated
            const spanElement = contentElement.value.querySelector(`span[data-uuid="${uuid}"]`);
            if (spanElement) {
                // Calculate the new cursor position after the newline
                let newCursorPosition = beforeCursor.length + 1; // Adjusted to 'let'

                // Find the correct text node within the span element
                let textNode = spanElement.firstChild;
                while (newCursorPosition > textNode.length && textNode.nextSibling) {
                    newCursorPosition -= textNode.length;
                    textNode = textNode.nextSibling;
                }

                // Set the cursor position after the newline
                setCursor(textNode, newCursorPosition);
                updateTextAndHighlights();
            }
        });
    }
}

function handleTextareaKeydown(event, data) {
    if (event.key === 'Enter' && event.shiftKey) {
        // Prevent the default behavior and stop the event from propagating
        event.preventDefault();
        event.stopPropagation();

        // Insert a newline at the cursor position
        const textarea = event.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end);

        // Set the new value with the inserted newline
        data.text = before + '\n' + after;

        // Update the cursor position
        textarea.selectionStart = textarea.selectionEnd = start + 1;
    }
}

function handleMouseUp(event, uuid) {
    updateCursorPosition();
}

function getCurrentSegmentIndex(node) {
    while (node && node.parentNode !== contentElement.value) {
        node = node.parentNode;
    }
    if (node && node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        const uuid = node.getAttribute('data-uuid');
        return props.textSegments.findIndex((s) => s.uuid === uuid);
    }
    return -1;
}

function updateTextAndHighlights() {
    if (contentElement.value) {
        const spanElements = contentElement.value.querySelectorAll('span.text-content');
        const newSegments = Array.from(spanElements)
            .map((span) => {
                const uuid = span.getAttribute('data-uuid');
                const originalSegment = props.textSegments.find((s) => s.uuid === uuid);
                if (!originalSegment) {
                    console.error(`No segment found with uuid: ${uuid}`);
                    return null;
                }
                return {
                    uuid: uuid,
                    text: span.textContent,
                    highlighted: span.classList.contains('highlight'),
                    active: originalSegment.active,
                    processing: originalSegment.processing,
                    history: originalSegment.history,
                    trigger: originalSegment.trigger,
                    systemPrompt: originalSegment.systemPrompt,
                    userPrompt: originalSegment.userPrompt,
                    messagePending: originalSegment.messagePending,
                    messageComplete: originalSegment.messageComplete,
                    messageError: originalSegment.messageError
                };
            })
            .filter((segment) => segment !== null); // Remove any null entries due to errors

        // Emit the updated segments array
        emit('update:textSegments', newSegments);
    }
}

function updateCursorPosition() {
    if (!contentElement.value) {
        console.warn('contentElement is null in updateCursorPosition');
        return;
    }

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let currentNode = range.startContainer;
        let offset = range.startOffset;

        // If the current node is the content element, adjust to the last child
        if (currentNode === contentElement.value && contentElement.value.childNodes.length > 0) {
            currentNode = contentElement.value.childNodes[contentElement.value.childNodes.length - 1];
            offset = currentNode.textContent.length;
        }

        // Find the parent span if we're in a text node or a non-span element
        while (currentNode && (currentNode.nodeType !== Node.ELEMENT_NODE || currentNode.tagName !== 'SPAN')) {
            currentNode = currentNode.parentNode;
        }

        // Only proceed if currentNode is a span element
        if (currentNode && currentNode.tagName === 'SPAN') {
            // Retrieve the uuid from the data-uuid attribute of the span element
            const uuid = currentNode.getAttribute('data-uuid');

            // Find the index of the segment with the same uuid
            const segmentIndex = props.textSegments.findIndex((s) => s.uuid === uuid);
            if (segmentIndex === -1) {
                console.warn('Failed to find the segment with UUID:', uuid);
                return;
            }

            // Update the currentCursor ref with the new position
            currentCursor.value = { node: currentNode, offset, segmentIndex };

            // Emit the cursorUpdate event with the updated cursor information
            emit('cursorUpdate', currentCursor.value);
        }
    }
}

// EditableHighlightTextV2.vue
function handlePaste(event) {
    event.preventDefault();
    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text/plain');

    // Normalize new lines in the pasted text
    const normalizedText = normalizeNewLines(pastedText);

    // Insert the normalized text into the contenteditable element
    document.execCommand('insertText', false, normalizedText);

    // document.execCommand("insertText", false, text);
    nextTick(() => {
        // Update cursor position to the end of the pasted text
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const currentSegmentIndex = getCurrentSegmentIndex(range.startContainer);
            updateCursorPosition();
        }
    });
}

function normalizeNewLines(text) {
    // Replace carriage returns and line feeds with a single newline character
    const normalized = text.replace(/(\r\n|\r|\n)/g, '\n');
    return normalized;
}

function highlightSelection() {
    // Implement highlight selection logic
}

function enhanceSelection() {
    // Implement enhance selection logic
}

function getSelectionRangeWithinSegment(segment) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const { startOffset, endOffset } = range;
        if (range.commonAncestorContainer.parentNode.getAttribute('data-uuid') === segment.uuid) {
            return { start: startOffset, end: endOffset };
        }
    }
    return null;
}

function splitSelection(splitType) {
    const currentSegment = props.textSegments[currentCursor.value.segmentIndex];
    if (!currentSegment) return;

    const caretPosition = currentCursor.value.offset;
    const atEndOfSegment = caretPosition === currentSegment.text.length;

    let selectionRange = null;

    if (splitType !== 'insert') {
        selectionRange = getSelectionRangeWithinSegment(currentSegment);
        if (!selectionRange || selectionRange.start === selectionRange.end) {
            // No selection or empty selection, do nothing
            // return;
        }
    }

    // Emit the event with the uuid, index, cursor index, split type, and atEndOfSegment
    emit('splitSegment', {
        uuid: currentSegment.uuid,
        index: currentCursor.value.segmentIndex,
        cursorIndex: caretPosition,
        splitType: splitType,
        atEndOfSegment: atEndOfSegment,
        selectionRange: selectionRange
    });
}

function onCellEditComplete(event) {
    const { data, newValue, field } = event;

    //emit to the parent for the edit
    const index = props.textSegments.findIndex((segment) => segment === data);
    if (index !== -1) {
        emit('updateSegment', { index, newValue });

        // textSegments.value[index][field] = newValue;
    }
}

//Emit the kind of action being selected
function paintAction(action) {
    console.log('action', action);
    let prompt = '';

    if (action == 'expand') {
        prompt = `

    ##Special Instructions (if any)
    ${specialInstructions.value}


    ##Text Content to Expand
    "${JSON.stringify({
        text: props.textSegments[currentCursor.value.segmentIndex].text
    })}"

    This is an extract from the larger document we are working on. 
    Here is the whole document to provide context
    
    ## Whole document:
    ${props.textSegments.map((segment) => {
        return JSON.stringify({ text: segment.text });
    })}
    `;
    }

    if (action == 'contract') {
        prompt = `

    ##Special Instructions (if any)
    ${specialInstructions.value}


    ##Text Content to Contract / Minimize
    "${JSON.stringify({
        text: props.textSegments[currentCursor.value.segmentIndex].text
    })}"

    
    `;
    }

    if (action == 'refine') {
        prompt = `

    ##Rewrite this text following these instructions
    ${specialInstructions.value}


    ##Text to rewrite
    "${JSON.stringify({
        text: props.textSegments[currentCursor.value.segmentIndex].text
    })}"

    
    ##Here is the entire text as context. DO not reference anything other than the Text to rewrite
    "${JSON.stringify({
        text: props.textSegments[currentCursor.value.segmentIndex].text
    })}"


    `;
    }

    emit('paintAction', { action: action, prompt: prompt });
}
</script>
<style scoped>
.container {
    /* padding: 20px; */
    /* margin: 20px; */
    font-family: 'Roboto', sans-serif;
    max-width: 80%;
    margin: 20px auto;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.content-wrapper {
    position: relative;
}

.text-content {
    /* min-height: 150px; */
    /* padding: 20px; */
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    font-size: 18px;
    line-height: 1.6;
    color: #333;
    outline: 1.5px solid rgba(100, 100, 100, 0); /* Thinner and more transparent outline */
    outline-offset: 0; /* Increase the distance of the outline from the text */
    /* background-color: rgba(200, 200, 200, 0.3); */
}

.highlight {
    background-color: rgba(0, 255, 0, 0.1);
}

.text-content:focus {
    outline: 0.5px solid rgba(100, 100, 100, 0.2); /* Thinner and more transparent outline */
    outline-offset: 0; /* Increase the distance of the outline from the text */
    outline-style: dotted;

    /* background-color: rgba(200, 200, 200, 0.3); */
    background-color: rgba(0, 200, 0, 0.1);
}

/* Ensure the Editor takes full height */
/* :deep(.p-editor-container) {
  display: flex;
  flex-direction: column;
  height: 100%;
} */

/* :deep(.p-editor-content) {
  flex: 1;
} */

/* :deep(.p-inputtext) {
  padding: 0.75rem 1rem; 
  padding-top: 20px;
} */

.control-bar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.button-row {
    display: grid;
    gap: 0.5rem;
    width: 100%;
}

/* This will create equal width columns based on the number of children */
.button-row {
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
}
/*   
  :deep(.button-row .p-button),
  :deep(.button-row .p-inputtext) {
    width: 100%;
    margin: 0;
  }
  
  :deep(.button-row .p-button) {
    justify-content: center;
  }
  
  :deep(.button-row .p-button .p-button-label) {
    flex: 1 1 auto;
    text-align: center;
  } */

/* Responsive adjustment for smaller screens */
/* @media (max-width: 768px) {
    .button-row {
      grid-template-columns: 1fr;
    }
  } */

.prompt-painter {
    position: fixed; /* Fixed positioning relative to the viewport */
    top: 100px; /* Align to the top of the viewport */
    right: 0; /* Align to the right side (adjust as needed) */
    width: 25%;
    z-index: 1000; /* Ensure it stays above other content */
}
</style>
