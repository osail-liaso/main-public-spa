<template>
  <div class="editable-container">
    <div class="content-wrapper" ref="contentElement"   @mouseup="handleMouseUp($event, null)">
      <!-- Use v-for to render spans -->
      <span
        v-for="(segment, index) in textSegments"
        :key="segment.uuid"
         :data-uuid="segment.uuid"
        class="text-content"
        :class="{ highlight: segment.highlighted }"
        contenteditable="true"
        @input="handleInput($event, segment.uuid)"
         @keydown="handleKeyDown($event, segment.uuid)"
        @keyup="handleKeyUp($event, segment.uuid)"
        @mouseup="handleMouseUp($event, segment.uuid)"
        @paste="handlePaste($event, segment.uuid)"
      >{{ segment.text }}</span>
    </div>
    <button class="highlight-button" @click="highlightSelection">Highlight</button>
    <button class="highlight-button" @click="splitSelection">Split Selection</button>

  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue";

const props = defineProps({
  textSegments: Array,
});

const emit = defineEmits(['update:textSegments', 'cursorUpdate']);

const contentElement = ref(null);


const currentCursor = ref({ node: null, offset: 0, segmentIndex: 0 });
watch(currentCursor, (newCursor, oldCursor) => {
  if (newCursor.segmentIndex !== oldCursor.segmentIndex) {
    // The cursor has moved to a different segment
    // First, set all segments to not be highlighted
    const updatedSegments = props.textSegments.map((segment, index) => ({
      ...segment,
      highlighted: false,
    }));

    // Now, set the newly selected segment to be highlighted
    if (newCursor.segmentIndex >= 0 && newCursor.segmentIndex < updatedSegments.length) {
      updatedSegments[newCursor.segmentIndex].highlighted = true;
    }

    // Emit the updated segments with the new highlight statuses
    emit('update:textSegments', updatedSegments);
  }
});


function handleInput(event, uuid) {
  // console.log('Input event:', event.inputType);

  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const currentSegment = props.textSegments.find(s => s.uuid === uuid);
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
  if (event.key === 'Enter') {
    event.preventDefault(); // Prevent the default behavior of the enter key

    // Find the current segment based on the uuid
    const currentSegment = props.textSegments.find(s => s.uuid === uuid);
    if (!currentSegment) return;

    // Use the currentCursor.value.offset for the caret position
    const caretPosition = currentCursor.value.offset;

    // Split the text at the caret position to insert a newline
    const beforeCursor = currentSegment.text.substring(0, caretPosition);
    const afterCursor = currentSegment.text.substring(caretPosition);
    const updatedText = beforeCursor + '\n' + afterCursor;

    // Update the current segment text
    const updatedSegments = props.textSegments.map(segment =>
      segment.uuid === uuid ? { ...segment, text: updatedText } : segment
    );

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

function handleMouseUp(event, uuid) {
  updateCursorPosition();
}

function getCurrentSegmentIndex(node) {
  while (node && node.parentNode !== contentElement.value) {
    node = node.parentNode;
  }
  if (node && node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
    const uuid = node.getAttribute('data-uuid');
    return props.textSegments.findIndex(s => s.uuid === uuid);
  }
  return -1;
}


function updateTextAndHighlights() {
  if (contentElement.value) {
    const spanElements = contentElement.value.querySelectorAll('span.text-content');
    const newSegments = Array.from(spanElements).map((span) => {
      const uuid = span.getAttribute('data-uuid');
      const originalSegment = props.textSegments.find(s => s.uuid === uuid);
      if (!originalSegment) {
        console.error(`No segment found with uuid: ${uuid}`);
        return null;
      }
      return {
        uuid: uuid,
        text: span.textContent,
        highlighted: span.classList.contains('highlight'),
      };
    }).filter(segment => segment !== null); // Remove any null entries due to errors

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
      const segmentIndex = props.textSegments.findIndex(s => s.uuid === uuid);
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
  const text = event.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
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

function highlightSelection() {
  // Implement highlight selection logic
}

function enhanceSelection() {
  // Implement enhance selection logic
}


function splitSelection()
{
  
}
</script>

<style scoped>
.editable-container {
  padding:20px;
  margin:20px;
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
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  outline: .5px solid rgba(100, 100, 100, 0); /* Thinner and more transparent outline */
  outline-offset: 0; /* Increase the distance of the outline from the text */
  /* background-color: rgba(200, 200, 200, 0.3); */

}

.highlight {
  background-color: rgba(0, 255, 0, 0.1);
 
}

.text-content:focus {
  outline: .5px solid rgba(100, 100, 100, 0.2); /* Thinner and more transparent outline */
  outline-offset: 0; /* Increase the distance of the outline from the text */
    outline-style:dotted;
    
  /* background-color: rgba(200, 200, 200, 0.3); */
  background-color: rgba(0, 200, 0, 0.1);
}

.highlight-button {
  display: block;
  width: 100%;
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  font-size: 16px;
  font-weight: 500;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.highlight-button:hover {
  background-color: #45a049;
}

.highlight-button:active {
  background-color: #3e8e41;
}
</style>