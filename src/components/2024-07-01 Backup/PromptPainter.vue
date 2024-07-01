<template>
  <EditableHighlightText
    :text="text"
    :highlightsProp="highlights"
    @update="handleTextUpdate"
    @updateHighlights="updateHighlights"
    @cursor = "updateCursor"
  />


  <!-- <button @click="changeText">Change the text</button>


  {{ text }} -->

  <!-- <DataTable :value="highlights" tableStyle="min-width: 50rem">
    <Column field="startOffset" header="Start"></Column>
    <Column field="endOffset" header="End"></Column>
    <Column field="selectedText" header="Selected Text"></Column>

  </DataTable> -->


  <DataTable 
    :value="highlights" 
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
    <Column field="id" header="ID" style="width: 25%">
      <template #body="{ data }">
        {{ data.id }}
      </template>
    </Column>
    <Column field="startOffset" header="Start Offset" style="width: 25%">
      <template #body="{ data }">
        {{ data.startOffset }}
      </template>
      <template #editor="{ data }">
        <InputNumber v-model="data.startOffset" autofocus />
      </template>
    </Column>
    <Column field="endOffset" header="End Offset" style="width: 25%">
      <template #body="{ data }">
        {{ data.endOffset }}
      </template>
      <template #editor="{ data }">
        <InputNumber v-model="data.endOffset" autofocus />
      </template>
    </Column>
    <Column field="selectedText" header="Selected Text" style="width: 25%">
      <template #body="{ data }">
        {{ data.selectedText }}
      </template>
      <template #editor="{ data }">
        <InputText v-model="data.selectedText" autofocus />
      </template>
    </Column>
  </DataTable>

{{ highlights }}

 </template>

<script setup>
import { ref, shallowRef, watch , computed} from 'vue';
import EditableHighlightText from '@/components/EditableHighlightText.vue';

import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ColumnGroup from 'primevue/columngroup';   // optional
import Row from 'primevue/row';                   // optional

const originalText = ref('Your initial text here');
const highlights = shallowRef([]);
const cursor = ref(null);


const text = computed(() => {
  let result = originalText.value;
  highlights.value
    .sort((a, b) => b.startOffset - a.startOffset) // Sort in reverse order
    .forEach(highlight => {
      result = 
        result.slice(0, highlight.startOffset) +
        highlight.selectedText +
        result.slice(highlight.endOffset);
    });
  return result;
});


const onCellEditComplete = (event) => {
  const { data, newValue, field } = event;
  const index = highlights.value.findIndex(item => item.id === data.id);
  if (index !== -1) {
    const oldHighlight = highlights.value[index];
    let updatedHighlight = { ...oldHighlight, [field]: newValue };

    if (field === 'selectedText') {
      updatedHighlight.endOffset = updatedHighlight.startOffset + newValue.length;
    } else if (field === 'startOffset') {
      updatedHighlight.endOffset = newValue + (oldHighlight.endOffset - oldHighlight.startOffset);
    }

    // Ensure the highlight is within the text bounds
    updatedHighlight.startOffset = Math.max(0, Math.min(updatedHighlight.startOffset, originalText.value.length));
    updatedHighlight.endOffset = Math.max(updatedHighlight.startOffset, Math.min(updatedHighlight.endOffset, originalText.value.length));

    // Update the selectedText based on the new offsets
    updatedHighlight.selectedText = originalText.value.slice(updatedHighlight.startOffset, updatedHighlight.endOffset);

    highlights.value = [
      ...highlights.value.slice(0, index),
      updatedHighlight,
      ...highlights.value.slice(index + 1)
    ];
  }
};

function adjustDownstreamHighlights(downstreamHighlights, changeEndOffset, lengthDiff) {
  return downstreamHighlights.map(highlight => ({
    ...highlight,
    startOffset: highlight.startOffset + lengthDiff,
    endOffset: highlight.endOffset + lengthDiff
  }));
}

function applyHighlightsToText() {
  let newText = text.value;
  let offset = 0;

  highlights.value.sort((a, b) => a.startOffset - b.startOffset).forEach(highlight => {
    const adjustedStart = highlight.startOffset + offset;
    const adjustedEnd = highlight.endOffset + offset;
    newText = newText.slice(0, adjustedStart) + highlight.selectedText + newText.slice(adjustedEnd);
    offset += highlight.selectedText.length - (adjustedEnd - adjustedStart);
  });

  text.value = newText;
}

function updateHighlights(newHighlights) {
  highlights.value = newHighlights.map(highlight => ({
    ...highlight,
    startOffset: Math.max(0, Math.min(highlight.startOffset, originalText.value.length)),
    endOffset: Math.max(highlight.startOffset, Math.min(highlight.endOffset, originalText.value.length)),
    selectedText: originalText.value.slice(
      Math.max(0, Math.min(highlight.startOffset, originalText.value.length)),
      Math.max(highlight.startOffset, Math.min(highlight.endOffset, originalText.value.length))
    )
  }));
}


function handleTextUpdate(newText) {
  originalText.value = newText;
  updateHighlightsFromText(newText);
}


function updateHighlightsFromText(newText) {
  highlights.value = highlights.value.map(highlight => ({
    ...highlight,
    startOffset: Math.min(highlight.startOffset, newText.length),
    endOffset: Math.min(highlight.endOffset, newText.length),
    selectedText: newText.slice(
      Math.min(highlight.startOffset, newText.length),
      Math.min(highlight.endOffset, newText.length)
    )
  }));
}

watch(text, (newText, oldText) => {
  if (newText !== oldText) {
    updateHighlightsFromText(newText);
  }
});

function changeText() {
  text.value = "Your initialsdfsdfdsal text here";
}


function removeHighlight(id) {
  highlights.value = highlights.value.filter(h => h.id !== id);
}


function addHighlight() {
  const newHighlight = {
    id: Date.now().toString(),
    startOffset: 0,
    endOffset: 5,
    selectedText: text.value.slice(0, 5),
    rects: [{
      top: 0,
      left: 0,
      width: 50,
      height: 20
    }]
  };
  highlights.value = [...highlights.value, newHighlight];
}

function updateCursor(c) {
  cursor.value = c;
  console.log("Cursor", c);
}
</script>