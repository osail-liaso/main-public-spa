<template>
  <div class="editable-container">
    <div class="content-wrapper">
      <div
        class="editable-text"
        contenteditable="true"
        ref="editableDiv"
        @input="updateTextAndHighlights"
        @mouseup="storeSelection"
        @keyup="storeSelection"
        @paste="handlePaste"
      >
        <template v-for="(segment, index) in textSegments" :key="index">
          <span :class="{ highlight: segment.highlighted }">{{ segment.text }}</span>
        </template>
      </div>
    </div>
    <button class="highlight-button" @click="highlightSelection">Highlight</button>
    <button class="highlight-button" @click="enhanceSelection">Enhance</button>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";

const props = defineProps({
  textSegments: Array,
});

const emits = defineEmits(["update", "updateHighlights", "enhance", "cursor"]);
const editableDiv = ref(null);
let storedSelection = null;

function updateTextAndHighlights() {
  const segments = getSegmentsFromContent();
  emits("update", segments);
}

function getSegmentsFromContent() {
  const segments = [];
  editableDiv.value.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      segments.push({ text: node.textContent, highlighted: false });
    } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('highlight')) {
      segments.push({ text: node.textContent, highlighted: true });
    }
  });
  return segments;
}

function storeSelection() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    storedSelection = selection.getRangeAt(0);
  }
}

function highlightSelection() {
  if (!storedSelection) return;

  const range = storedSelection;
  const startNode = range.startContainer;
  const endNode = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  const newSegments = [];
  let currentNode = editableDiv.value.firstChild;

  while (currentNode) {
    if (currentNode === startNode && currentNode === endNode) {
      // Selection is within a single node
      if (startOffset > 0) {
        newSegments.push({ text: currentNode.textContent.slice(0, startOffset), highlighted: false });
      }
      newSegments.push({ text: currentNode.textContent.slice(startOffset, endOffset), highlighted: true });
      if (endOffset < currentNode.textContent.length) {
        newSegments.push({ text: currentNode.textContent.slice(endOffset), highlighted: false });
      }
    } else if (currentNode === startNode) {
      // Start of selection
      if (startOffset > 0) {
        newSegments.push({ text: currentNode.textContent.slice(0, startOffset), highlighted: false });
      }
      newSegments.push({ text: currentNode.textContent.slice(startOffset), highlighted: true });
    } else if (currentNode === endNode) {
      // End of selection
      newSegments.push({ text: currentNode.textContent.slice(0, endOffset), highlighted: true });
      if (endOffset < currentNode.textContent.length) {
        newSegments.push({ text: currentNode.textContent.slice(endOffset), highlighted: false });
      }
    } else if (currentNode.nodeType === Node.TEXT_NODE) {
      // Nodes between start and end
      newSegments.push({ text: currentNode.textContent, highlighted: isNodeBetween(currentNode, startNode, endNode) });
    } else if (currentNode.nodeType === Node.ELEMENT_NODE && currentNode.classList.contains('highlight')) {
      newSegments.push({ text: currentNode.textContent, highlighted: true });
    }
    currentNode = currentNode.nextSibling;
  }

  emits("update", newSegments);
  window.getSelection().removeAllRanges();
  storedSelection = null;
}

function isNodeBetween(node, startNode, endNode) {
  let current = startNode;
  while (current && current !== endNode) {
    if (current === node) return true;
    current = current.nextSibling;
  }
  return false;
}

function enhanceSelection() {
  // Implement enhance functionality here
  console.log("Enhance selection");
}

function handlePaste(event) {
  event.preventDefault();
  const text = event.clipboardData.getData("text/plain");
  document.execCommand("insertText", false, text);
  updateTextAndHighlights();
}

watch(() => props.textSegments, (newSegments) => {
  if (editableDiv.value) {
    editableDiv.value.innerHTML = newSegments.map(segment => 
      segment.highlighted ? `<span class="highlight">${segment.text}</span>` : segment.text
    ).join('');
  }
}, { deep: true });

</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap');

.editable-container {
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
  min-height: 150px;
}

.highlights-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.highlights {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.editable-text {
  position: relative;
  min-height: 150px;
  padding: 20px;
  white-space: pre-wrap;
  background: transparent;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  border: none;
  outline: none;
  resize: vertical;
}

.highlight {
  position: absolute;
  background-color: rgba(255, 230, 0, 0.3);
  border-radius: 2px;
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