<template>
  <EditableHighlightText
    :textSegments="textSegments"
    @update="handleTextUpdate"
  />


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
        <InputText v-model="data.text" autofocus />
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
import { ref, computed } from 'vue';
import EditableHighlightText from '@/components/EditableHighlightText.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputSwitch from 'primevue/inputswitch';

const textSegments = ref([{ text: 'Your initial text here', highlighted: false }, { text: 'And some more text here', highlighted: true }]);
const cursor = ref(null);

function handleTextUpdate(newSegments) {
  textSegments.value = newSegments;
}

function onCellEditComplete(event) {
  const { data, newValue, field } = event;
  const index = textSegments.value.findIndex(segment => segment === data);
  if (index !== -1) {
    textSegments.value[index][field] = newValue;
  }
}

function updateCursor(c) {
  cursor.value = c;
  console.log("Cursor", c);
}


function handleTextUpdate(newSegments) {
  textSegments.value = newSegments;
}

</script>