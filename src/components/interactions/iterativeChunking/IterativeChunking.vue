<template>
    <!-- The starting socket, separated from the textSegments -->
    <Socket
        v-if="initialPrompt.uuid"
        v-show="true"
        :sessionId="initialPrompt.uuid"
        :trigger="initialPrompt.trigger"
        :persona="null"
        :systemPrompt="initialSystemPrompt"
        :userPrompt="initialPrompt.text"
        :messageHistory="[]"
        :model="selectedModel"
        :temperature="0.2"
        @messageComplete="(payload) => messageCompleteInitial(initialPrompt, payload)"
        @messagePartial="(payload) => messagePartialInitial(initialPrompt, payload)"
        @messageError="(payload) => messageErrorInitial(initialPrompt, payload)"
    />

    <div class="layout-wrapper">
        <Sidebar v-model:visible="sidebarVisible">
            <!-- Add your sidebar content here -->
        </Sidebar>

        <div class="layout-main">
            <div class="grid">
                <div class="col-12 md:col-12 bg-white" v-show="true" v-if="textSegments.length">
                    <span class="w-full">
                        <label class="text-lg w-full" for="accomplishment">What document are we chunking today?</label>
                        <Textarea id="accomplishment" v-model="initialPrompt.text" autoResize rows="auto" class="w-full p-inputtext-lg editable-container" autocomplete="off" />
                    </span>

                    <span class="w-full">
                        <Dropdown id="modelSelect" v-model="selectedModel" :options="adminModels" optionLabel="name.en" placeholder="Select a Model"></Dropdown> </span
                    ><br />

                    <Button @click="initialPrompt.trigger = !initialPrompt.trigger" class="mt-1"> Let's Go! </Button>
                </div>
            </div>
        </div>

        <!-- {{ textSegments?.[0]?.json }} -->
        1
    </div>
</template>

<script setup>
//Vue and other libraries
import { ref, computed, onMounted, nextTick } from 'vue';
import { v4 as uuidv4 } from 'uuid';

//Primevue components
import Sidebar from 'primevue/sidebar';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

import { useModels } from '@/composables/useModels.js';
const { adminModels, selectedModel } = useModels();

//Helper Functions
import { extractData } from '@/utils/extractJsonAndCode.js';

//Custom OSAIL components
import Socket from '@/components/common/Socket.vue';

const toast = useToast();
const sidebarVisible = ref(false);

const textSegments = ref([]);
const textSegmentSelected = ref(null);
const cursorSelect = ref({ segmentIndex: 0, offset: 0 });
const currentCursor = ref({ segmentIndex: 0, offset: 0 });

const initialPrompt = ref({});
const initialSystemPrompt = ref(`
 Evaluate the attached text and identify the first 20 characters of any area which represents a change in topic or structure. 
 We are seeking areas of semantic difference, where the meaning of the subject of the text changes. 
 This may occur with a header, like a number or a specific title ('Chapter', 'Section', 'Subject', 'Clause') or it may not be indicated at all but contain text which is semantically different from whatever cames before or comes after it. 
 Return the results in a JSON format, where each string within the results array contains the first 30-50 characters of the string verbatim (capturing the entire header of first sentence, if possible). 
 Be as comprehensive as possible; ensure that all semantic changes are highlighted in the document. Maximize the use of response tokens, and never return placeholder text
 {"results":[]}
 `);

onMounted(() => {
    //Create the new segments to start off the app
    textSegments.value.push(createNewSegment('\u200B', true));
    addHistory(textSegments.value[textSegments.value.length - 1], 'user');
    initialPrompt.value = createNewSegment('', false);
});

// Helper functions - Create new segment with all the standard attributes
function createNewSegment(text = '', highlighted = false) {
    return {
        //Segment controls
        uuid: uuidv4(),
        text: text,
        highlighted: highlighted,

        //History
        history: [],
        historyIndex: -1, //No history, so temporary negative index

        //Comments
        comments: [], //User or auto generated comments in this format {role:"user", text:'comment 1'}, {role:"system",text:'comment 2'}
        showComments: true, //Whether to the comments are being rendered or not

        //Socket Controls
        action: null, //Track the last action used
        trigger: false,
        systemPrompt: null,
        userPrompt: null,
        specialInstructions: null,
        messagePartial: null,
        messageComplete: null,
        messageError: null,

        //Status of the segment
        processing: false,
        active: true,
        startCursor: -1, //The location of the cursor from the original body of text.
        endCursor: -1 //The location of the end cursor from the original body of text.
    };
}

function getIndexesFromMatchStrings(matchArray) {
    let matchedPositions = [];
    matchArray.forEach((str) => {
        let thisIndex = initialPrompt.value.text.indexOf(str);
        if (thisIndex > -1) matchedPositions.push(thisIndex);
    });

    if (matchPositions.length < matchArray.length) console.log('Error, at least one of the strings not found in the text. ', { matchArray, matchedPositions });
    else console.log("Matched positions in the original string", matchedPositions)
    return matchedPositions;
}

function getSegmentFromUuid(uuid) {
    if (uuid) {
        const currentSegment = textSegments.value.find((s) => s.uuid === uuid);
        if (currentSegment) return currentSegment;
        else return null;
    }
}

//Add a new segment after
//Add a new segment before
//Split a segment into old half, new half, or middle split (divide into 3)
function changeSegmentSelected(index) {
    textSegmentSelected.value = textSegments.value[index];
}

function updateSegment({ index, newValue }) {
    console.log(index, newValue);
    console.log(textSegments.value);
    textSegments.value[index].text = newValue;
}

function handleTextSegmentsUpdate(updatedSegments) {
    // console.log("Segment to update", updatedSegments)
    textSegments.value = updatedSegments;
}

function handleCursorUpdate(cursorInfo) {
    textSegments.value.forEach((segment) => {
        segment.highlighted = false;
    });

    textSegments.value[cursorInfo.segmentIndex].highlighted = true;
    currentCursor.value = cursorInfo;
}

function handleSplitSegment({ uuid, index, cursorIndex, splitType, atEndOfSegment, selectionRange }) {
    const segmentToSplit = textSegments.value[index];
    if (!segmentToSplit) return;

    textSegments.value.forEach((segment) => {
        segment.highlighted = false;
    });

    const isLastSegment = index === textSegments.value.length - 1;
    let newSegments = [...textSegments.value];

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

            //new segments
            const newSegmentSelected = createNewSegment(selectedText, true);
            const segmentsToInsert = [beforeSelection ? createNewSegment(beforeSelection) : null, newSegmentSelected, afterSelection ? createNewSegment(afterSelection) : null].filter(Boolean); // Remove null entries if they exist

            //Add histories for created items
            segmentsToInsert.forEach((segment) => {
                addHistory(segment, 'user');
            });

            newSegments.splice(index, 1, ...segmentsToInsert);
            // Update cursorSelect to the new isolated segment
            const newSegmentIndex = beforeSelection ? index + 1 : index; // Determine the index of the new isolated segment
            updateCursorSelect(newSegmentSelected, newSegmentIndex, 0);
        } else if (!atEndOfSegment) {
            // Split operation
            const beforeCursor = segmentToSplit.text.substring(0, cursorIndex);
            const afterCursor = segmentToSplit.text.substring(cursorIndex);

            //Create 2 segments
            const newSegmentAfter = createNewSegment(afterCursor, true);
            addHistory(newSegmentAfter, 'user');

            const newSegmentBefore = createNewSegment(beforeCursor);
            addHistory(newSegmentBefore, 'user');

            newSegments.splice(index, 1, newSegmentBefore, newSegmentAfter);
            updateCursorSelect(newSegmentAfter, index + 1, 0);
        } else if (atEndOfSegment && isLastSegment) {
            // Add a new blank segment at the end of the last segment
            const newSegment = createNewSegment('\n\r', true);
            addHistory(newSegment, 'user');

            newSegments.push(newSegment);
            updateCursorSelect(newSegment, newSegments.length - 1, 1);
        }
    }

    // Update the text segments with the new array
    textSegments.value = newSegments;
}

function handleAction({ action, prompt }) {
    let socketAction = true;
    if (currentCursor?.value) {
        let segment = textSegments.value[currentCursor.value.segmentIndex];

        //Add history for the item.
        addHistory(segment, 'system');

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

        if (action == 'critique') {
            toast.add({ severity: 'success', summary: 'Critique being generated', detail: 'Please wait approximately 5-8 seconds', life: 5000 });

            segment.systemPrompt = `
                Rewrite the text provided following instructions in the prompt. 
                Do not repeat other elements of the whole document; this is just for context.
                If there is a header or title, recreate it, otherwise do not provide a header in your response.
                Never address the user, always stricktly just critique the text provided in the format specified.
            `;
        }

        if (action == 'applyComment') {
            segment.systemPrompt = `
                Attempt to integrate  the comment provided.
                Rewrite the text provided to make it the best version possible based on the comment.
                Never address the user, always stricktly just critique the text provided in the format specified.
            `;
        }

        if (action == 'applyAllComments') {
            segment.systemPrompt = `
                
                Attempt to integrate all the comments in the comments JSON completely.
                Rewrite the text provided to make it the best version possible with each comment integrated.
                Never address the user, always stricktly just critique the text provided in the format specified.
            `;

            //Reset the comments
            segment.comments = [];
        }

        if (action == 'captureStyleBrush') {
            segment.systemPrompt = `
                
                Complete the provided JSON style template
                Fully capture all style indicators and provide detailed analysis.
                Never address the user, always stricktly complete the JSON style template provided.
            `;

            //Reset the comments
            segment.comments = [];
        }

        if (action == 'applyStyleBrush') {
            segment.systemPrompt = `
                
                Transform the text with the style guide.
                Use the style guide and adapt the specific linguistic and narrative and descriptive methods used.
                Maintain the overall structure of the provided text while transforming
            `;

            //Reset the comments
            segment.comments = [];
        }

        //Maybe some actions don't trigger a socket
        //Future use
        if (socketAction) {
            segment.userPrompt = prompt;
            segment.processing = true;
            segment.action = action;
            segment.trigger = !segment.trigger;
        }

        console.log('segment to trigger', segment);
    }

    if (action == 'autoEnhance') {
        autoEnhance.value = !autoEnhance.value;
    }
}

//Updates

function addHistory(segment, role) {
    //Add to the history of the segment
    //Don't create a history
    if (segment.historyIndex == -1 || segment.text != segment.history[segment.historyIndex].text) {
        segment.history.push({
            role: role,
            comments: JSON.parse(JSON.stringify(segment.comments)),
            text: segment.text,
            momentUpdated: new Date()
        });
        segment.historyIndex = segment.history.length - 1;
    }
}

function handleUndoHistory(segmentUuid) {
    let segment = getSegmentFromUuid(segmentUuid);
    //Can go backward
    if (segment?.historyIndex > 0) {
        segment.historyIndex--;
        segment.text = segment.history[segment.historyIndex].text;
        segment.comments = segment.history[segment.historyIndex].comments;
    }
}

function handleRedoHistory(segmentUuid) {
    let segment = getSegmentFromUuid(segmentUuid);
    //Can go forward
    if (segment?.historyIndex < segment.history.length - 1) {
        segment.historyIndex++;
        segment.text = segment.history[segment.historyIndex].text;
        segment.comments = segment.history[segment.historyIndex].comments;
    }
}

function handleToggleComments(segmentUuid) {
    let segment = getSegmentFromUuid(segmentUuid);
    segment.showComments = !segment.showComments;
}

function handleBlurUpdate(segmentUuid) {
    let segment = getSegmentFromUuid(segmentUuid);
    if (segment) {
        //Initialize the array
        if (segment?.history?.legnth === 0 || segment.historyIndex == -1) {
            addHistory(segment, 'user');
        } else {
            //Only add if the text is different
            if (segment.text !== segment.history[segment.historyIndex].text) {
                addHistory(segment, 'user');
            }
            //Compare the text in the selected history and then if there is a difference
            // if (segment.text !== segment.history[segment.historyIndex].text) {
            // console.log('dont add new!', segment.historyIndex)
            // segment.history[segment.historyIndex].text = segment.text;
            // segment.momentUpdated = new Date();
            // }
        }
    }
}

function handleDeleteComments(commentsArray) {
    //Delete out the segments
    commentsArray.forEach((item) => {
        let segment = getSegmentFromUuid(item.segment.uuid);
        segment.comments = segment.comments.filter((comment) => {
            return comment.uuid != item.comment.uuid;
        });
    });
}

function handleAddStyleBrush({ name, segment }) {
    styleBrushes.value.push({ name, style: segment.text });
}

function handleUploadedBrushes(brushesArray) {
    //Merge the brushes back in
    styleBrushes.value = [...styleBrushes.value, ...brushesArray];
}

function messagePartial(segment, payload) {
    if (payload?.message?.length) {
        let messageTextActions = ['expand', 'contract', 'refine', 'applyComment', 'applyAllComments', 'captureStyleBrush', 'applyStyleBrush'];
        if (messageTextActions.includes(segment.action)) {
            segment.messagePartial = payload.message;
            segment.processing = true;
        }
    }
}

function messageComplete(segment, payload) {
    console.log(payload);
    if (payload?.message?.length) {
        //Commit the current segment to history

        //Depending on the types of actions, update different parts of the text segment
        let messageTextActions = ['expand', 'contract', 'refine', 'applyComment', 'applyAllComments', 'captureStyleBrush', 'applyStyleBrush'];
        let messageCommentActions = ['critique'];

        if (messageTextActions.includes(segment.action)) {
            //Now overwrite the text
            segment.text = payload.message + '\n';
            segment.messagePartial = null;
            segment.processing = false;
            addHistory(segment, 'system');
        }

        if (messageCommentActions.includes(segment.action)) {
            //Now overwrite the comments if return a JSON
            segment.processing = false;

            //Overwrite comments
            let json = extractData(payload.message);
            console.log('JSON returned', json);

            if (json?.json?.[0]?.length) {
                json.json[0].forEach((comment) => {
                    comment.uuid = uuidv4();
                }); //give each a unique identifier
                segment.comments = json.json[0];
            }
        }
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

function messagePartialInitial(segment, payload) {
    if (currentCursor?.value.segmentIndex < textSegments.value.length) {
        if (payload?.message?.length) {
            textSegments.value[currentCursor.value.segmentIndex].messagePartial = payload.message;
            textSegments.value[currentCursor.value.segmentIndex].processing = true;
        }
    }
}

function messageCompleteInitial(segment, payload) {
    //Make sure the currentCursor is accurate
    if (currentCursor?.value.segmentIndex < textSegments.value.length) {
        if (payload?.message?.length) {
            textSegments.value[currentCursor.value.segmentIndex].text = payload.message + '\n';
            textSegments.value[currentCursor.value.segmentIndex].messagePartial = null;
            textSegments.value[currentCursor.value.segmentIndex].processing = false;

            //Update the history for the subject
            addHistory(textSegments.value[currentCursor.value.segmentIndex], 'system');

            let thisJson = extractData(textSegments.value[currentCursor.value.segmentIndex].text);
            if (thisJson?.json?.length) {
                textSegments.value[currentCursor.value.segmentIndex].json = thisJson;
                getIndexesFromMatchStrings(thisJson.json[0].results);
            }
        }
    }
}

function messageErrorInitial(segment, payload) {
    console.log('Error', payload);
}

async function copyAllTextSegments() {
    let allText = textSegments.value.map((seg) => {
        return seg.text;
    });

    try {
        await navigator.clipboard.writeText(allText);
        toast.add({ severity: 'success', summary: 'All segments copied', detail: textSegments.value.length + ' segments copied to the clipboard.', life: 3000 });
    } catch (err) {
        console.log('Error copying', err);
    }
}

function mergeAllTextSegments() {
    // Concatenate all the text fields from the textSegments array
    const mergedText = textSegments.value.map((segment) => segment.text).join('');

    // Create a new object with the merged text, highlighted set to true, and an empty history array

    let mergedSegment = createNewSegment(mergedText, true);
    addHistory(mergedSegment, 'user');

    // Reset the textSegments ref to an array containing just the merged segment
    textSegments.value = [mergedSegment];

    cursorSelect.value = {
        uuid: mergedSegment.uuid,
        segmentIndex: 0,
        offset: mergedSegment.text.length,
        momentUpdated: new Date()
    };
}

function deleteSelectedSegment() {
    if (currentCursor?.value?.segmentIndex != null && currentCursor.value.segmentIndex >= 0) {
        // Use splice to remove the item at the specified index

        textSegments.value.splice(currentCursor.value.segmentIndex, 1);
        if (!textSegments.value.length) {
            const newSegment = createNewSegment(' ', true);
            // const newSegment = {
            //     uuid: uuidv4(),
            //     text: 'A new segment...',
            //     highlighted: true,
            //     active: true,
            //     processing: false,
            //     history: [],
            //     specialInstructions: null,
            //     messagePartial: null,
            //     messageComplete: null,
            //     messageError: null
            // };
            textSegments.value.push(newSegment);

            cursorSelect.value = {
                uuid: newSegment.uuid,
                segmentIndex: 0,
                offset: newSegment.text.length,
                momentUpdated: new Date()
            };
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

.layout-main {
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

.button-row {
    display: grid;
    gap: 0.5rem; /* This sets both the vertical and horizontal gap */
    width: 100%;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
}
</style>
