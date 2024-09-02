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
                <div class="col-12 md:col-12 bg-white" v-show="true" >
                    <span class="w-full">
                        <label class="text-lg w-full" for="accomplishment">What document are we chunking today?</label>
                        <Textarea id="accomplishment" @blur="handleInitialPromptBlur" v-model="initialPrompt.text" autoResize rows="auto" class="w-full p-inputtext-lg editable-container" autocomplete="off" />
                    </span>

                    <span class="w-full flex">
                        <Dropdown id="modelSelect" v-model="selectedModel" :options="adminModels" optionLabel="name.en" placeholder="Select a Model"></Dropdown>

                        <div class="field-checkbox mb-0 ml-2">
                            <InputSwitch v-model="useHtml" />
                            <label for="checkOption1">HTML</label>
                        </div>

                        <div v-if="useHtml" class="field-input mb-0 ml-2">
                            <InputText id="checkOption2" type="text" v-model="useHtmlDelimiter" />
                            <label class="ml-2" for="checkOption2">Delimiter</label>
                        </div>
                    </span>

                    <br />

                    <Button @click="initialPrompt.trigger = !initialPrompt.trigger" class="mt-1"> Let's Go! </Button>
                </div>
            </div>
        </div>

        <div v-if="useHtmlChunks?.length">
            <p>Generated {{ useHtmlChunks.length }} HTML chunks. Each chunk can now be queried separately.</p>
            <div v-for = "(chunk, index) in useHtmlChunks" :key = "'htmlChunk'+index">

                <div>{{ chunk }}</div>

                <Button  class="mt-1"> Process Chunks into Structure Data </Button>


                <Socket
        v-if="chunk.uuid"
        v-show="true"
        :sessionId="chunk.uuid"
        :trigger="chunk.trigger"
        :persona="null"
        :systemPrompt="chunk.systemPrompt"
        :userPrompt="chunk.source"
        :messageHistory="[]"
        :model="selectedModel"
        :temperature="0.2"
        @messageComplete="(payload) => messageCompleteInitial(chunk, payload)"
        @messagePartial="(payload) => messagePartialInitial(chunk, payload)"
        @messageError="(payload) => messageErrorInitial(chunk, payload)"
    />


                <br/><br/>
            </div>
        </div>

        <!-- {{ textSegments?.[0]?.json }} -->
    </div>
</template>

<script setup>
//Vue and other libraries
import { ref, computed, onMounted, nextTick } from 'vue';
import { v4 as uuidv4, v3 as uuidv3 } from 'uuid';

//
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

//We have 3 groups
/*
    Chunkers are parallel agents which process the original long form text into chunks
    Then they process the chunks into smaller chunks if they are over threshold
    Chunkers pass their outputs to functions which map back each chunk into the whole, like a folder tree

    Then we have graphers, which turn chunks into knowledge graphs, and keep assembling them back into the whole network graph
    Graphers pass their outputs to a function which builds edges and nodes

    Then we have vectorizing functions which produce a vector score for each chunk which can happen at the end
    And also vectorize either the whole graph or each node pair + edge 
*/

// All the documents uploaded
const knowledgeSet = ref({
    uuid: uuidv4(),
    name: { en: null, fr: null },
    description: { en: null, fr: null },
    version: 1,
    momentCreated: null,
    momentUpdated: null
});

const documents = ref([]);
let taskIterations = ref(3); // The number of times we will evaluate the document

// After each iteration, merge the chunks array and deduplicate
// The number of iterations needs to be staged, based on the model limitations of concurrent sessions.

//Rough chunking provided arbitrary divisions of the document if it exceeds the model's context window completely
//Iterative chunking then breaks each of the rough chunks down into separate topics
//Chunking continues iteratively until the pieces are less than the treshold specified for chunkSize

//Then each chunk gets processed into a nodes and edges
//Nodes and edges are generated, and keep their traceability (provenance) to source chunks and documents

//The graph is iteratively processed, as each chunk either adds new nodes or rather identifies which nodes within which to be added.
//Furthermore, instead of adding nodes, new edges could be generated between existing nodes.

const defaultDocument = {
    //What this document links to
    knowledgeSetUuid: null,

    //Original files
    uuid: null,
    filename: null,
    type: null,
    path: null,
    size: null,
    momentUpdated: null, // THe file edit
    momentCreated: null, // The moment it was added into the knowledge set
    createdBy: null, //The user uuid for the person who uploaded it
    useOriginal: false,

    //Original
    originalContent: null, //might be html, xlsx, etc.
    vectorizedOriginal: null,

    //Text extract
    text: null, //The source text
    vectorizedText: null, //The vectorized text

    //Summarized content
    summary: null, //Generated a simple summary for the chunk
    vectorizedSummary: null,

    //Keyword extraction
    metadataKeyWords: [], //Generated a metadata array of keywords

    chunkIterations: [] //The array of iterations
    /*
//Each of the iterations contains the following. Once all the iterations are complete, the document is processed for each step
    
uuid:uuidv4(),
    systemPrompt: null, // the temporary system prompt
    userPrompt: null, //the temporary user prompt

    //Status processing
    status:null, //enum of 'waiting, pending, processing, completed'
    processing: false,
    trigger: false,

    //The results of the processing, per document.
    messagePartial: null,
    messageComplete: null,
    messageError: null

    //The results of chunking
    chunkCursors:[], //The chunk indexes that are generated in Step 1. This will then be used 

    */
};

const chunks = ref([]);

const defaultChunk = {
    uuid: null, //The uuid of the chunk
    source: null, //The uuid of the source document

    startCursor: null, //the starting point of the chunk
    endCursor: null, //the ending point of the chunk

    text: null, //The source text
    vectorizedText: null, //The vectorized text if required

    summary: null, //Generated a simple summary for the chunk
    vectorizedSummary: null,

    //prompt
    systemPrompt:null,
    userPrompt:null,

    json: null, //Generated generated JSON results
    processing: false,
    trigger: false
};

//The knowledge graph

const graphNodes = ref([]);
const graphEdges = ref([]);

//Nodes and graphs
const defaultNode = {
    uuid: null, //short uuid
    label: null,
    type: null,

    //Nodes are document non-specific but keep the provenance of their sources. When a node is found, or enforced, the document and chunks are populated/
    //Nodes can trace their lineage back to these original sources
    documents: [], //The uuid documents that relate to the specific nodes
    chunks: [] //The uuid chunks that relate to the specific nodes
};

const defaultEdge = {
    uuid: null,
    source: null,
    target: null,
    type: null,

    //Also non specific
    documents: [], //The uuid documents that relate to the specific edges
    chunks: [] //The uuid chunks that relate to the specific edge
};

const textSegments = ref([]);
const textIndexes = ref([]);
const textSegmentSelected = ref(null);
const cursorSelect = ref({ segmentIndex: 0, offset: 0 });
const currentCursor = ref({ segmentIndex: 0, offset: 0 });

const initialPrompt = ref({});
const useHtml = ref(true);
const useHtmlDelimiter = ref('article');
const useHtmlChunks = ref(null);
const initialSystemPrompt = ref(`
 Evaluate the attached text and identify the first 30-50 characters of any area which represents a change in topic or structure. 
 We are seeking areas of semantic difference, where the meaning of the subject of the text changes. 
 This may occur with a header, like a number or a specific title ('Chapter', 'Section', 'Subject', 'Clause') or it may not be indicated at all but contain text which is semantically different from whatever cames before or comes after it. 
 Return the results in a JSON format, where each string within the results array contains the first 30-50 characters of the string verbatim (capturing the entire header of first sentence, if possible). 
 Be as comprehensive as possible; ensure that all semantic changes are highlighted in the document. Maximize the use of response tokens, and never return placeholder text.
 Return always at least one result.
 {"results":[]}
 `);

const evaluationPrompt = ref(`
Extract the key data elements from this LinkedIn HTML.
Fill this JSON template
{
"profilePictureUrl":"", //the URL for the person's profile picture
"name":"", //The person's name
"title":"", //The person's title
"degrees":"", //The degree of relatedness to me on linkedin 
"time":"", //The time, if noted. If it is just the number of days, use this string value
"text":"", //the comment from the text
"links":[], //any hyperlinks provided
}
`)

const assessPrompt = ref(`
Evaluate the text provided and extract out the following information.

#1 
Fill this JSON template
{

"category":[] //enum of 'Supporting Gen AI', 'Against Gen AI', 'Mixed', 'Ad hominem' if the comment is a criticism of Janak Alford, the poster
"keyComments":[] //Summarize and extract out a key list of positions.

}

In your population of keyComments, evaluate the following comments that have already been produced. If there is a similar enough comment, not an exact textual match but rather a close enough 
comment, then use that comment. If there is no similar comment, then add in your own comment.

Existing Comments


`)


onMounted(() => {
    // //Create the new segments to start off the app
    // textSegments.value.push(createNewSegment('\u200B', true));
    // addHistory(textSegments.value[textSegments.value.length - 1], 'user');
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

    if (matchedPositions.length < matchArray.length) console.log('Error, at least one of the strings not found in the text. ', { matchArray, matchedPositions });
    else console.log('Matched positions in the original string', matchedPositions);
    return matchedPositions;
}

 
//Add a new segment after
//Add a new segment before
//Split a segment into old half, new half, or middle split (divide into 3)
 
 

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
        if (payload?.message?.length) {
            segment.text = payload.message + '\n';
            segment.messagePartial = null;
            segment.processing = false;

            let thisJson = extractData(segment.text);
            if (thisJson?.json?.length) {

                segment.json = thisJson.json[0];
                // textSegments.value[currentCursor.value.segmentIndex].json = thisJson;
                // textIndexes.value = getIndexesFromMatchStrings(thisJson.json[0].results);
                // console.log(textIndexes.value);
            }
        }
    
}

function messageErrorInitial(segment, payload) {
    console.log('Error', payload);
}



function handleInitialPromptBlur(event) {
    if (useHtml.value) {
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialPrompt.value.text, 'text/html');
        const sections = dom.body.querySelectorAll(useHtmlDelimiter.value);
        useHtmlChunks.value = [];
        sections.forEach((section, index) => {
            // Get the HTML content of each paragraph
            const chunk = section.outerHTML;

            let newChunk = JSON.parse(JSON.stringify(defaultChunk))
            
            newChunk.uuid = uuidv4();
            newChunk.source = chunk;
            newChunk.json = {};
            newChunk.systemPrompt = evaluationPrompt.value;
            useHtmlChunks.value.push(newChunk);
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
