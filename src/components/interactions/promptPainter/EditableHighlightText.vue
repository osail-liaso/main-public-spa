<template>
    <div class="grid">
        <div class="col-12 md:col-8 bg-white">
            <div class="content-wrapper" ref="contentElement" @mouseup="handleMouseUp($event, null)">
                <template v-for="(segment, index) in textSegments" :key="segment.uuid">
                    <template v-if="displayEditorControls && segment.active">
                        <!-- Only show the history buttons if there is a history-->
                        <!-- <template v-if="segment.history?.length"> -->

                        <div class="p-button p-button-secondary p-button-rounded p-0">
                            <div v-if="segment.historyIndex > 0" @click="undoHistory(segment, index)" class="p-button p-button-info p-button-rounded p-2">
                                <i class="pi pi-arrow-circle-left"></i>
                            </div>

                            <span class="p-1"> {{ segment.historyIndex + 1 }} / {{ segment.history.length }} </span>

                            <div v-if="segment.historyIndex < segment.history.length - 1" @click="redoHistory(segment, index)" class="p-button p-button-info p-button-rounded p-2">
                                <i class="pi pi-arrow-circle-right"></i>
                            </div>

                            <template v-if="segment.comments?.length">
                                <div @click="toggleComments(segment, index)" class="p-button p-button-help p-button-rounded p-2">
                                    <i class="pi pi-comment"></i>
                                    {{ segment.comments.length }}
                                </div>
                            </template>
                        </div>

                        <!-- </template> -->
                    </template>

                    <!-- <Button icon="pi pi-bookmark" :label = "index.toString()" severity="secondary" rounded class="mb-2 mr-2" /> -->
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
                        @blur="handleBlur($event, segment.uuid)"
                        >{{ segment.messagePartial ? segment.messagePartial : segment.text }}</span
                    >

                    <!-- Comments -->
                    <template v-if="segment.showComments == true">
                        <template v-for="(comment, cIndex) in segment.comments" :key="'comment' + cIndex + segment.uuid">
                            <span class="w-full bg-purple-100 block m-2 p-2 rounded">
                                <div @click="paintAction('applyComment', comment, cIndex)" class="p-button p-button-success p-button-rounded p-2 mr-2">
                                    <i class="pi pi-check"></i>
                                </div>

                                <div @click="deleteComment(segment, comment, cIndex)" class="p-button p-button-warning p-button-rounded p-2">
                                    <i class="pi pi-times"></i>
                                </div>

                                {{ comment.text }}
                            </span>
                        </template>
                    </template>
                </template>
            </div>

            <slot> </slot>
            Current Segment Selected: {{ currentCursor.segmentIndex }}

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

                <div class="flex">
                    <InputSwitch id="displayTable" v-model="displayTable" />
                    <label for="displayTable" class="p-1"> Display Editor Table </label>
                </div>
                <div class="flex">
                    <InputSwitch id="segmentControls" v-model="displayEditorControls" />
                    <label for="segmentControls" class="p-1"> Display Segment Controls </label>
                </div>

                <div class="button-row">
                    <Button label="Split Segment" @click="splitSelection(null)" class="p-button-success" />
                    <Button label="Add Segment" @click="splitSelection('insert')" class="p-button-success" />
                </div>

                <div class="button-row">
                    <Button @click="paintAction('expand')" label="Expand 2x" class="p-button-success" />
                    <Button @click="paintAction('contract')" label="Contract 1/2" class="p-button-success" />
                </div>

                <div class="button-row">
                    <Button @click="paintAction('critique')" label="Critique" class="p-button-help" />
                    <Button @click="paintAction('applyAllComments')" label="Apply Comments" class="p-button-help" />
                </div>

                <label class="text-lg" for="specialInstructions">Special Instructions</label>

                <InputText id="specialInstructions" v-model="specialInstructions" class="w-full p-inputtext-lg editable-container" autocomplete="off" />

                <div class="button-row">
                    <Button @click="paintAction('refine')" label="Submit" class="p-button-success" />
                </div>

                <label class="text-lg" for="styleBrushes">Style Name</label>

                <div class="button-row">
                    <Button @click="paintAction('captureStyleBrush')" label="Capture Style" class="p-button-info" />
                </div>

                <div class="button-row">
                    <InputText id="styleBrushes" v-model="styleName" class="w-full p-inputtext-lg editable-container" autocomplete="off" />
                    <Button @click="addStyleBrush()" label="Add Style" class="p-button-info" />
                </div>

                <div class="button-row">
                    <MultiSelect id="multiselect" v-model="selectedStyleBrushes" :options="defaultAndCustomBrushes" optionLabel="name" />
                    <!-- <Dropdown id="state" v-model="selectedStyleBrush" :options="props.styleBrushes" optionLabel="name" placeholder="Select One"></Dropdown> -->
                    <Button @click="paintAction('applyStyleBrush')" label="Apply Style" class="p-button-info" />
                </div>

                <div class="button-row">
                    <Button @click="downloadStyleBrushes()" label="Download Brushes" class="p-button-info" />
                    <Button @click="uploadStyleBrushes()" label="Upload Brushes" class="p-button-info" />
                    <input v-show="false" type="file" ref="brushesFileInput" @change="handleUploadStyleBrushes" hidden />
                </div>


                
                <div class="button-row">
                    <MultiSelect id="formatOptions" v-model="selectedFormatBrushes" :options="defaultFormats" optionLabel="name" />
                    <!-- <Dropdown id="state" v-model="selectedStyleBrush" :options="props.styleBrushes" optionLabel="name" placeholder="Select One"></Dropdown> -->
                    <Button @click="paintAction('applyFormatBrush')" label="Apply Format" class="p-button-info" />
                </div>

                <!-- {{ selectedStyleBrush }} -->

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
import { ref, watch, watchEffect, onMounted, nextTick, computed } from 'vue';

//Primevue Imports
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Slider from 'primevue/slider';

import InputSwitch from 'primevue/inputswitch';

import defaultBrushes from '@/assets/defaultBrushes.json';
import defaultFormats from '@/assets/defaultFormats.json';

//Variables
const props = defineProps({ textSegments: Array, cursorSelect: Object, styleBrushes: { type: Array, default: [] } });
const emit = defineEmits([
    'update:textSegments',
    'cursorUpdate',
    'splitSegment',
    'updateSegment',
    'paintAction',
    'changeSegmentSelected',
    'undoHistory',
    'redoHistory',
    'toggleComments',
    'deleteComments',
    'blurUpdate',
    'addStyleBrush',
    'uploadedBrushes'
]);
const contentElement = ref(null);
const specialInstructions = ref(null);
const displayTable = ref(false);
const displayEditorControls = ref(true);
const currentCursor = ref({ node: null, offset: 0, segmentIndex: 0 });

const styleName = ref(null);
const selectedStyleBrush = ref(null);
const selectedStyleBrushes = ref([]);


const selectedFormatBrushes = ref([]);


const brushesFileInput = ref(null);

//Merge the default brushes with the custom brushes
const defaultAndCustomBrushes = computed(() => {
    return [...defaultBrushes, ...props.styleBrushes];
});
const styleTemplate = `{
  "styleGuide": {
    "targetIndividual": {
      "name": "",
      "role": "",
      "biographicalContext": "",
      "instructions": "If provided, capture the name, role, and a brief context of the individual whose style is to be mimicked."
    },
    "styleAttributes": {
      "languageUse": {
        "vocabulary": [],
        "sentenceStructure": [],
        "rhetoricalDevices": [],
        "instructions": "List 5-10 specific vocabulary, sentence structures, and rhetorical devices characteristic of the individual's style."
      },
      "tone": {
        "overallTone": "",
        "emotionalRange": [],
        "intendedEffect": "",
        "instructions": "Describe the overall tone, 1-5 range of emotions, and the effect the individual's style is intended to have on the audience."
      },
      "themes": [],
      "instructions": "Identify central themes the individual often explores in their communication.",
      "dialogue": {
        "characterization": "",
        "interactionStyle": "",
        "instructions": "Describe any notable features of how the individual's characters speak (if applicable) and their general style of interaction."
      },
      "narrativeTechniques": {
        "perspective": "",
        "structuralChoices": [],
        "instructions": "Detail the narrative perspective and any structural choices the individual commonly employs in their communication."
      }
    },
    "textualExamples": [
      {
        "text": "",
        "attribute": "",
        "instructions": "Provide examples of text that illustrate the individual's style, along with an explanation of the attribute demonstrated."
      }
    ],
    "styleProfile": "",
    "instructions": "Write a narrative synthesis of the individual's style, providing an overview and detailed description of key style elements.",
    "evaluationCriteria": [
      {
        "name": "",
        "description": "",
        "instructions": "Define criteria for evaluating the effectiveness of the individual's style, providing a name and description for each."
      }
    ]
  }
}`;

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
            console.log('Span Element', spanElement);
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
// function setCursor(node, offset) {
//     try
//     {

//     const range = document.createRange();
//     const sel = window.getSelection();

//     range.setStart(node, offset);
//     range.collapse(true);

//     sel.removeAllRanges();
//     sel.addRange(range);
//     }
//     catch(error)
//     {
//         console.log("setCursor error", error)
//     }
// }

function setCursor(node, offset) {
    try {
        // Ensure that we have a valid text node. If not, find the text node within the element.
        if (node.nodeType !== Node.TEXT_NODE) {
            // If the node has child nodes, find the first text node.
            if (node.childNodes.length > 0) {
                for (let i = 0; i < node.childNodes.length; i++) {
                    if (node.childNodes[i].nodeType === Node.TEXT_NODE) {
                        node = node.childNodes[i];
                        break;
                    }
                }
            } else {
                // If there are no child nodes, create a text node and append it to the element.
                node = document.createTextNode('');
                node.appendChild(node);
            }
        }

        // Ensure the offset is not greater than the text length
        offset = Math.min(offset, node.textContent.length);

        const range = document.createRange();
        const sel = window.getSelection();

        // Set the start position of the range to the specified character offset within the text node
        range.setStart(node, offset);
        range.collapse(true);

        // Clear any existing selections and add the new range
        sel.removeAllRanges();
        sel.addRange(range);
    } catch (error) {
        console.log('setCursor error', error);
    }

    updateCursorPosition();
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

                    history: originalSegment.history,
                    historyIndex: originalSegment.historyIndex,

                    comments: originalSegment.comments,
                    showComments: originalSegment.showComments,

                    action: originalSegment.action, //last action
                    trigger: originalSegment.trigger,
                    systemPrompt: originalSegment.systemPrompt,
                    userPrompt: originalSegment.userPrompt,
                    specialInstructions: originalSegment.specialInstructions,
                    messagePending: originalSegment.messagePending,
                    messageComplete: originalSegment.messageComplete,
                    messageError: originalSegment.messageError,
                    processing: originalSegment.processing,
                    active: originalSegment.active
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
                // console.warn('Failed to find the segment with UUID:', uuid);
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

function handleBlur(event, uuid) {
    //Edit type is human
    // console.log("handleBlur event", event)
    // console.log("handleBlur uuid", uuid)
    emit('blurUpdate', uuid);
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
function paintAction(action, comment = null, cIndex = null) {
    let prompt = '';

    let segment = props.textSegments[currentCursor.value.segmentIndex];

    if (action == 'expand') {
        prompt = `

    ##Special Instructions (if any)
    ${specialInstructions.value}


    ##Text Content to Expand
    "${JSON.stringify({
        text: segment.text
    })}"

    This is an extract from the larger document we are working on. 
    Here is the whole document to provide context
    
    ## Whole document:
    ${props.textSegments.map((seg) => {
        return JSON.stringify({ text: seg.text });
    })}
    `;
    }

    if (action == 'contract') {
        prompt = `

    ##Special Instructions (if any)
    ${specialInstructions.value}


    ##Text Content to Contract / Minimize
    "${JSON.stringify({
        text: segment.text
    })}"

    
    `;
    }

    if (action == 'refine') {
        prompt = `

        # Rewrite this passage of text following the special instructions below
        "${JSON.stringify({
            text: segment.text
        })}"


        # Special Instructions
        ## In your rewrite, ensure you follow these special instructions very closely.
        ${specialInstructions.value}

        
        ## Here is the entire text as context. DO not reference anything other than the passage of text above to rewrite
            ${props.textSegments.map((seg) => {
                return JSON.stringify({ text: seg.text });
            })}

    `;
    }

    if (action == 'critique') {
        prompt = `

        # Instructions
        Evaluate this passage of text in context of the whole document and provide a series of critques and recommendations on how to make the passage better. Do not comment on the other sections in the whole document, just this identified text.
        Each critique must be less than 50 words long. It should capture briefly the issue and the recommendation 

        # Identified Text to Evaluate 
        "${JSON.stringify({
            text: segment.text
        })}"

        # Whole text
        Here is the entire text as context. Do not reference anything other than the passage of text above to critique
            ${props.textSegments.map((seg) => {
                return JSON.stringify({ text: seg.text });
            })}

        #Format Instructions
        Always response in a JSON array of objects. Do not respond with any other text other than the json array
        Here is an example of the correct format.
        [{"role":"system", "text": "The critique and any recommended actions"}]
    `;
    }

    if (action == 'applyComment' && comment) {
        prompt = `

        # Instructions
        Edit this passage and apply the attached comment

        # Here is the text to modify 
        "${JSON.stringify({
            text: segment.text
        })}"

        # Here are the comment you must consider when you are modifying the text 
        "${JSON.stringify({
            text: segment.comments[cIndex]
        })}"
        `;

        //Delete the comment once it is actioned
        deleteComment(segment, comment, cIndex);
    }

    if (action == 'applyAllComments') {
        prompt = `

        # Instructions
        Edit this passage and apply the attached comments

        # Here is the text to modify 
        "${JSON.stringify({
            text: segment.text
        })}"

        # Here are the comments you must consider when you are modifying the text 
        "${JSON.stringify({
            text: segment.comments
        })}"

       

        `;
    }

    if (action == 'captureStyleBrush') {
        prompt = `
        Evaluate this text and fully complete the style mimicry template below.

        # Here is the text to evaluate 
        "${JSON.stringify({
            text: segment.text
        })}"

        # Here is the style template
        "${JSON.stringify(styleTemplate)}"

        In your answer, always omit the instructions keys

       
        `;
    }

    if (action == 'applyStyleBrush') {
        prompt = `
        Transform the selected text by applying the style guide(s) below. Mimic the same use of linguistic structures, narrative styles, tones, themes, and techniques provided

        # Here is the text to transform 
        "${JSON.stringify({
            text: segment.text
        })}"

        # Here are 1 or more of style guides to apply.
        "${JSON.stringify(
            selectedStyleBrushes.value.map((style) => {
                return style.style;
            })
        )}"

        Only respond with the modified text. Do not describe what the style guide would do, only strictly return the modified text with the style guide applied to it.
        Play close attention to the requirements in the styleProfile section and avoid any stylystic devices which are identified as negatives. 
       
        `;
    }
    
    if (action == 'applyFormatBrush') {
        prompt = `
        Transform the text using the attached format specification below.

        The format is 
        
        # Here is the text to transform 
        "${JSON.stringify({
            text: segment.text
        })}"

        # Here is the format to apply.
        "${JSON.stringify(
            selectedFormatBrushes.value.map((format) => {
                return {format:format.prompt, name:format.name};
            })
        )}"

        Do not modify the content, simply cast it into the specified format identified.
       
        `;
    }

    emit('paintAction', { action: action, prompt: prompt });
}

function deleteComment(segment, comment, cIndex) {
    emit('deleteComments', [{ segment, comment, cIndex }]);
}

//Emit undo and redo functions to update the text
function undoHistory(segment, index) {
    emit('undoHistory', segment.uuid);
}

function redoHistory(segment, index) {
    emit('redoHistory', segment.uuid);
}

function toggleComments(segment, index) {
    emit('toggleComments', segment.uuid);
}

function addStyleBrush() {
    let segment = props.textSegments[currentCursor.value.segmentIndex];
    emit('addStyleBrush', { name: styleName.value, segment });
}

function downloadStyleBrushes() {
    try {
        const blob = new Blob([JSON.stringify(props.styleBrushes)], {
            type: 'application/json'
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'customStyleBrushes.json';
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.log(error);
        emit('error', error);
    }
}

const uploadStyleBrushes = () => {
    if (brushesFileInput.value) {
        brushesFileInput.value.click(); // Trigger the file input click event
    }
};

function handleUploadStyleBrushes(event) {
    const files = event.target.files;
    if (files.length === 0) {
        return;
    }

    const file = files[0];
    console.log('Selected file', file)
    if (props.format === 'json' || file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                const array = Array.isArray(json) ? json : [json]; // Convert to array if not already
                emit('uploadedBrushes', array); // Emit the array to the parent
            } catch (error) {
                console.log('Error on file upload', error);
            }
        };
        reader.onerror = (error) => {
            console.log('Error on file upload', error);
        };
        reader.readAsText(file); // Read the file as text
    } else {
        console.log('Error - Unsupported file type');
    }
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

    border-radius: 8px;
    border: 2px solid #e0e0e0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

    padding: 20px;
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
    row-gap: 1rem; /* Vertical spacing */
    column-gap: 0.5rem; /* Horizontal spacing */
    width: 100%;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
}

.prompt-painter {
    right: 0;
    z-index: 1000; /* Ensure it stays above other content */
}

/* Desktop styles */
@media (min-width: 992px) {
    /* Adjust the min-width as needed for your desktop breakpoint */
    .prompt-painter {
        top: 100px;
        position: fixed; /* Fixed positioning relative to the viewport */
        width: 25%;
    }
}

/* Mobile styles */
@media (max-width: 991px) {
    /* Adjust the max-width as needed for your mobile breakpoint */
    .prompt-painter {
        position: relative; /* Relative positioning */
        width: 100%;
        order: -1; /* To ensure it is shown above the 'what are we trying to accomplish today' section */
    }
}
</style>
