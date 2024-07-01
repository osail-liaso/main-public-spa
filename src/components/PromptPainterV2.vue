<template>
  <EditableHighlightText
    v-model:textSegments="textSegments"
    @update:textSegments="handleTextSegmentsUpdate"

    @cursorUpdate="handleCursorUpdate"
    @changeSegmentSelected="changeSegmentSelected"
    @addSegment="addSegment"
    @splitSegment="splitSegment"

  />
  
Current Cursor:  {{ currentCursor }}

  <DataTable 
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
    <Column field="text" header="Text" style="width: 70%">
      <template #body="{ data }">
        {{ data.text }}
      </template>
      <template #editor="{ data }">
        <textarea v-model="data.text" autofocus />
      </template>
    </Column>
    <Column field="highlighted" header="Highlighted" style="width: 30%">
      <template #body="{ data }">
        {{ data.highlighted }}
      </template>
      <template #editor="{ data }">
        <InputSwitch v-model="data.highlighted" />
      </template>
    </Column>
  </DataTable>
</template>

<script setup>
import { ref, computed, onMounted} from 'vue';
import { v4 as uuidv4 } from "uuid";

import EditableHighlightText from '@/components/EditableHighlightTextV2.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputSwitch from 'primevue/inputswitch';

const defaultTextSegment = {
  uuid:"",
  text:"",
  highlighted:false,
  processing:false,
  history:[], //A history of all the previous texts, in order, and on the date and time the change was made, and by whom (human or AI)
  messagePending:"",
  messageComplete:"",
  messageError:"",
}

const textSegments = ref([]);
const textSegmentSelected = ref(null);

const currentCursor = ref({ segmentIndex: 0, offset: 0 });


function handleCursorUpdate(cursorInfo) {
  currentCursor.value = cursorInfo;
  // You can perform any additional logic here based on the cursor position
}


onMounted(()=>{
  let newSegment = JSON.parse(JSON.stringify(defaultTextSegment))
  newSegment.uuid = uuidv4();
  newSegment.text = "Welcome. Let's get started."
  newSegment.highlighted = true;
  textSegments.value.push(newSegment)
   newSegment = JSON.parse(JSON.stringify(defaultTextSegment))
  newSegment.uuid = uuidv4();
  newSegment.text = "\n\nHere is the second section."
  newSegment.highlighted = false;
  textSegments.value.push(newSegment)

  newSegment = JSON.parse(JSON.stringify(defaultTextSegment))
  newSegment.uuid = uuidv4();
  newSegment.text = "\n\nHere is the third section."
  newSegment.highlighted = false;
  textSegments.value.push(newSegment)

})

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


function splitSegment(index, splitType) {
  textSegments.value = newSegments;
}

function addSegment(index, segment) {
  textSegments.value = newSegments;
}

function onCellEditComplete(event) {
  const { data, newValue, field } = event;
  const index = textSegments.value.findIndex(segment => segment === data);
  if (index !== -1) {
    textSegments.value[index][field] = newValue;
  }
}


</script>