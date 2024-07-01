<template>
  <div class="editable-container">
    <div class="content-wrapper">
      <div class="highlights-wrapper">
        <div class="highlights" ref="highlightsDiv">
          <template v-for="highlight in localHighlights" :key="highlight.id">
            <span
              v-for="(style, index) in highlightStyle(highlight)"
              :key="`${highlight.id}-${index}`"
              class="highlight"
              :style="style"
            ></span>
          </template>
        </div>
      </div>
      <div
        class="editable-text"
        contenteditable="true"
        ref="editableDiv"
        @input="updateTextAndHighlights"
        @mouseup="storeSelection"
        @touchend="storeSelection"
        @keyup="storeSelection"
        @keydown="handleKeyDown"
        @paste="handlePaste"
        @selectionchange="storeSelection"
      >
        {{ text }}
      </div>
    </div>
    <button class="highlight-button" @click="highlightSelection">Highlight</button>
    <button class="highlight-button" @click="highlightSelection">Enhance</button>
  </div>
</template>

<script setup>
import { ref, watch, watchEffect, nextTick, toRaw, onMounted, onUnmounted } from "vue";
import { v4 as uuidv4 } from "uuid";

const props = defineProps({
  text: String,
  highlightsProp: Array,
});

const emits = defineEmits(["update", "updateHighlights", "enhance","cursor"]);

const editableDiv = ref(null);
const highlightsDiv = ref(null);
const localHighlights = ref([]);
const isPasting = ref(false);
const cursorPosition = ref(null);

watchEffect(() => {
  if (props.highlightsProp) {
    localHighlights.value = props.highlightsProp.map((h) => ({ ...h }));
  }
});

let storedSelection = null;
const lastText = ref(props.text || "");
// Modify the updateTextAndHighlights function
function updateTextAndHighlights() {
  if (isPasting.value) return;

  const newText = editableDiv.value.innerText;

  // Store the current cursor position as an offset
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const cursorOffset = getCursorOffset(editableDiv.value, range);

  emits("update", newText);

  nextTick(() => {
    updateHighlightPositions(lastText.value, newText);
    lastText.value = newText;

    // Restore the cursor position
    setCursorPosition(editableDiv.value, cursorOffset);

    // Update the cursor position for highlight color change
    cursorPosition.value = cursorOffset;
  });
}
// Helper function to get cursor offset
function getCursorOffset(element, range) {
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  emits("cursor", preCaretRange.toString().length);
  return preCaretRange.toString().length;
}

// Helper function to set cursor position
function setCursorPosition(element, offset) {
  const range = document.createRange();
  const sel = window.getSelection();

  let currentOffset = 0;
  let nodeStack = [element];
  let node;
  let foundNode = false;

  while (!foundNode && (node = nodeStack.pop())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const nodeLength = node.length;
      if (currentOffset + nodeLength >= offset) {
        range.setStart(node, offset - currentOffset);
        range.setEnd(node, offset - currentOffset);
        foundNode = true;
      } else {
        currentOffset += nodeLength;
      }
    } else {
      let i = node.childNodes.length;
      while (i--) {
        nodeStack.push(node.childNodes[i]);
      }
    }
  }

  sel.removeAllRanges();
  sel.addRange(range);
}

function storeSelection(event) {
  setTimeout(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        storedSelection = range.cloneRange();
      } else {
        storedSelection = null;
      }
      cursorPosition.value = getCursorOffset(editableDiv.value, range);
    }
  }, 0);
}

function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

function highlightSelection() {
  if (isTouchDevice()) {
    // For touch devices, get the current selection
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        const highlight = createHighlight(range);
        localHighlights.value.push(highlight);
        emits("updateHighlights", toRaw(localHighlights.value));
        selection.removeAllRanges(); // Clear the selection after highlighting
      }
    }
  } else {
    // For non-touch devices, use the stored selection or current selection
    let rangeToHighlight;
    if (storedSelection && !storedSelection.collapsed) {
      rangeToHighlight = storedSelection;
    } else {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
          rangeToHighlight = range;
        }
      }
    }

    if (rangeToHighlight) {
      const highlight = createHighlight(rangeToHighlight);
      localHighlights.value.push(highlight);
      emits("updateHighlights", toRaw(localHighlights.value));
      window.getSelection().removeAllRanges(); // Clear the selection after highlighting
    }
  }

  // Reset stored selection after highlighting
  storedSelection = null;
}


function createHighlight(range) {
  const editableRect = editableDiv.value.getBoundingClientRect();
  const rects = range.getClientRects();

  return {
    id: uuidv4(),
    startOffset: getAbsoluteOffset(range.startContainer, range.startOffset),
    endOffset: getAbsoluteOffset(range.endContainer, range.endOffset),
    selectedText: range.toString(),
    rects: Array.from(rects).map((rect) => ({
      top: rect.top - editableRect.top,
      left: rect.left - editableRect.left,
      width: rect.width,
      height: rect.height,
    })),
  };
}

function getAbsoluteOffset(node, offset) {
  let absoluteOffset = 0;
  const treeWalker = document.createTreeWalker(
    editableDiv.value,
    NodeFilter.SHOW_TEXT
  );

  while (treeWalker.nextNode() && treeWalker.currentNode !== node) {
    absoluteOffset += treeWalker.currentNode.length;
  }

  return absoluteOffset + offset;
}

function handleResize() {
  updateHighlightPositions(lastText.value, lastText.value);
}


// Add debounce function to limit the frequency of resize handler calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Create a debounced version of the resize handler
const debouncedHandleResize = debounce(handleResize, 10);


// Add lifecycle hooks to add and remove the event listener
onMounted(() => {
  window.addEventListener('resize', debouncedHandleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', debouncedHandleResize);
});


// Update the updateHighlightPositions function
function updateHighlightPositions(oldText, newText) {
  const updatedHighlights = localHighlights.value
    .map((highlight) => {
      const [newStart, newEnd] = adjustOffsets(
        oldText,
        newText,
        highlight.startOffset,
        highlight.endOffset
      );

      const updatedHighlight = { ...highlight };
      updatedHighlight.startOffset = newStart;
      updatedHighlight.endOffset = newEnd;
      updatedHighlight.selectedText = newText.slice(newStart, newEnd);

      const range = document.createRange();
      const [startNode, startOffset] = getNodeAndOffsetFromAbsolute(
        updatedHighlight.startOffset
      );
      const [endNode, endOffset] = getNodeAndOffsetFromAbsolute(
        updatedHighlight.endOffset
      );

      if (startNode && endNode) {
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);

        const rects = range.getClientRects();
        updatedHighlight.rects = Array.from(rects).map((rect) => ({
          top: rect.top - editableDiv.value.getBoundingClientRect().top,
          left: rect.left - editableDiv.value.getBoundingClientRect().left,
          width: rect.width,
          height: rect.height,
        }));

        updatedHighlight.selectedText = range.toString();
      } else {
        updatedHighlight.rects = [];
        updatedHighlight.selectedText = "";
      }

      return updatedHighlight;
    })
    .filter((highlight) => highlight.selectedText.length > 0);

  if (!areHighlightsEqual(updatedHighlights, localHighlights.value)) {
    localHighlights.value = updatedHighlights;
    emits("updateHighlights", toRaw(updatedHighlights));
  }
}

function adjustOffsets(oldText, newText, startOffset, endOffset) {
  let diff = 0;
  let i = 0;
  while (i < oldText.length && i < newText.length && diff === 0) {
    if (oldText[i] !== newText[i]) {
      diff = i;
    }
    i++;
  }
  if (diff === 0) {
    diff = Math.min(oldText.length, newText.length);
  }

  const lengthDiff = newText.length - oldText.length;

  let newStart = startOffset;
  let newEnd = endOffset;

  if (diff <= startOffset) {
    newStart += lengthDiff;
    newEnd += lengthDiff;
  } else if (diff < endOffset) {
    newEnd += lengthDiff;
  }

  return [Math.max(0, newStart), Math.max(0, newEnd)];
}

function getNodeAndOffsetFromAbsolute(absoluteOffset) {
  let currentOffset = 0;
  const treeWalker = document.createTreeWalker(
    editableDiv.value,
    NodeFilter.SHOW_TEXT
  );

  while (treeWalker.nextNode()) {
    if (currentOffset + treeWalker.currentNode.length > absoluteOffset) {
      return [treeWalker.currentNode, absoluteOffset - currentOffset];
    }
    currentOffset += treeWalker.currentNode.length;
  }

  // If we've gone past the end, return the last possible position
  const lastTextNode = treeWalker.currentNode;
  return [lastTextNode, lastTextNode.length];
}

function handleKeyDown(event) {
  if (event.key === "Enter") {
    event.preventDefault();

    // Insert a newline character at the current cursor position
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const newline = document.createTextNode("\n");
    range.deleteContents();
    range.insertNode(newline);

    // Move the cursor after the inserted newline
    range.setStartAfter(newline);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);


       // Update the cursor position
       nextTick(() => {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      cursorPosition.value = getCursorOffset(editableDiv.value, range);
    });

    // Trigger the input event to update the text
    updateTextAndHighlights();

  }
}


// Corrected handlePaste function
async function handlePaste(event) {
  event.preventDefault();
  const text = event.clipboardData.getData("text/plain");
  
  isPasting.value = true;
  
  // Store the current cursor position
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const cursorOffset = getCursorOffset(editableDiv.value, range);

  // Insert the text at the current cursor position
  document.execCommand("insertText", false, text);
  
  // Re-enable reactivity and update highlights in the next tick
  await nextTick();
  isPasting.value = false;
  
 // Update text and highlights
 updateTextAndHighlights();

// Restore the cursor position after the inserted text
nextTick(() => {
  const newCursorPosition = cursorOffset + text.length;
  setCursorPosition(editableDiv.value, newCursorPosition);
  cursorPosition.value = newCursorPosition;
});
}

function highlightStyle(highlight) {
  const isActive = cursorPosition.value !== null &&
    cursorPosition.value >= highlight.startOffset &&
    cursorPosition.value <= highlight.endOffset;

  return highlight.rects.map((rect) => ({
    position: "absolute",
    backgroundColor: isActive ? "orange" : "green",
    opacity: 0.2,
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    pointerEvents: "none",
  }));
}

watch(cursorPosition, () => {
  // Force a re-render of the highlights
  localHighlights.value = [...localHighlights.value];
});

watch(
  () => props.text,
  (newText) => {
    if (editableDiv.value && newText !== editableDiv.value.innerText && !isPasting.value) {
      editableDiv.value.innerText = newText;
      updateTextAndHighlights();
    }
  },
  { immediate: true }
);

watch(
  localHighlights,
  (newHighlights) => {
    if (!areHighlightsEqual(newHighlights, props.highlightsProp)) {
      emits("updateHighlights", toRaw(newHighlights));
    }
  },
  { deep: true }
);

function areHighlightsEqual(highlights1, highlights2) {
  if (highlights1.length !== highlights2.length) return false;

  for (let i = 0; i < highlights1.length; i++) {
    const h1 = highlights1[i];
    const h2 = highlights2[i];

    if (
      h1.id !== h2.id ||
      h1.startOffset !== h2.startOffset ||
      h1.endOffset !== h2.endOffset ||
      h1.selectedText !== h2.selectedText ||
      !areRectsEqual(h1.rects, h2.rects)
    ) {
      return false;
    }
  }

  return true;
}

// Helper function to compare rects
function areRectsEqual(rects1, rects2) {
  if (rects1.length !== rects2.length) return false;

  for (let i = 0; i < rects1.length; i++) {
    const r1 = rects1[i];
    const r2 = rects2[i];

    if (
      r1.top !== r2.top ||
      r1.left !== r2.left ||
      r1.width !== r2.width ||
      r1.height !== r2.height
    ) {
      return false;
    }
  }

  return true;
}
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