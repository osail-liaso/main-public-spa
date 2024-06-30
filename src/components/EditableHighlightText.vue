<template>
  <div class="editable-container">
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
      @keydown="handleKeyDown"
      @paste="handlePaste"
    >
      {{ text }}
    </div>
    <button @click="highlightSelection">Highlight</button>
  </div>
</template>
<script setup>
import { ref, watch, watchEffect, nextTick, toRaw } from "vue";
import { v4 as uuidv4 } from "uuid";

const props = defineProps({
  text: String,
  highlightsProp: Array,
});

const emits = defineEmits(["update", "updateHighlights"]);

const editableDiv = ref(null);
const highlightsDiv = ref(null);
const localHighlights = ref([]);

watchEffect(() => {
  if (props.highlightsProp) {
    localHighlights.value = props.highlightsProp.map((h) => ({ ...h }));
  }
});

let storedSelection = null;
const lastText = ref(props.text || "");

function updateTextAndHighlights() {
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
  });
}

// Helper function to get cursor offset
function getCursorOffset(element, range) {
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
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
  // Wait for the selection to be updated
  setTimeout(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        storedSelection = range.cloneRange();
      } else {
        storedSelection = null;
      }
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
  } else if (storedSelection) {
    // For non-touch devices, use the stored selection
    const highlight = createHighlight(storedSelection);
    localHighlights.value.push(highlight);
    emits("updateHighlights", toRaw(localHighlights.value));
    storedSelection = null;
  }
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
function updateHighlightPositions(oldText, newText) {
  const editableRect = editableDiv.value.getBoundingClientRect();

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
          top: rect.top - editableRect.top,
          left: rect.left - editableRect.left,
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
    const newline = document.createTextNode('\n');
    range.deleteContents();
    range.insertNode(newline);

    // Move the cursor after the inserted newline
    range.setStartAfter(newline);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    // Trigger the input event to update the text
    updateTextAndHighlights();
  }
}


function handlePaste(event) {
  event.preventDefault();
  const text = event.clipboardData.getData("text/plain");
  document.execCommand("insertText", false, text);
}

function highlightStyle(highlight) {
  return highlight.rects.map((rect) => ({
    position: "absolute",
    backgroundColor: "green",
    opacity: 0.2,
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    pointerEvents: "none",
  }));
}

watch(
  () => props.text,
  (newText) => {
    if (editableDiv.value && newText !== editableDiv.value.innerText) {
      editableDiv.value.innerText = newText;
      updateTextAndHighlights();
    }
  }
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
@import url("https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap");

.editable-container {
  position: relative;
}

.highlights-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
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
  min-height: 100px;
  border: 1px solid #ccc;
  padding: 8px;
  white-space: pre-wrap;

  background: transparent;
  position: relative;
  z-index: 1;
  overflow: auto;
  /* For Open Sans */
  font-family: "Open Sans", sans-serif;
  /* For Calibri */
  /* font-family: Calibri, 'Trebuchet MS', sans-serif; */
}

.highlight {
  position: absolute;
}
</style>
