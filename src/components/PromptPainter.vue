<template>
  <EditableHighlightText
    :text="text"
    :highlightsProp="highlights"
    @update="handleTextUpdate"
    @updateHighlights="updateHighlights"
  />


  <button @click="changeText">Change the text</button>


  {{ text }}



  <br/>

  {{ highlights }}
</template>

<script setup>
import { ref, shallowRef } from 'vue';
import EditableHighlightText from '@/components/EditableHighlightText.vue';

const text = ref('Your initial text here');
const highlights = shallowRef([]);

function handleTextUpdate(updatedText) {
  text.value = updatedText;
}

// function handleHighlightsUpdate(newHighlights) {
//   // highlights.value = newHighlights;
//   // console.log("newHighlights", newHighlights);
// }


function updateHighlights(newHighlights) {
  // Use Object.is for deep comparison
  if (!Object.is(JSON.stringify(highlights.value), JSON.stringify(newHighlights))) {
    highlights.value = newHighlights;
  }

  
}

function changeText()
{
  text.value = "Your initialsdfsdfdsal text here"
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
</script>