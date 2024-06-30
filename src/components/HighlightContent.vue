<template>
  <div class="highlight-container">
    <div class="button-group">
      <button
        v-for="color in highlightColors"
        :key="color"
        @click="highlightText(color)"
      >
        Highlight {{ color }}
      </button>
    </div>
    <div
      ref="editableDiv"
      class="content editable"
      :contenteditable="!readonly"
      @input="handleInput"
      @paste.prevent="handlePaste"
      @mouseup="handleMouseUp"
      :placeholder="placeholder"
    ></div>
    <div class="highlights-layer">
      <template v-for="highlight in highlights">
        <div
          v-for="(rect, index) in highlight.rects"
          :key="`${highlight.id}-${index}`"
          class="highlight"
          :style="getHighlightStyle(highlight, rect)"
        ></div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import debounce from 'lodash/debounce';
import DOMPurify from 'dompurify';

const props = defineProps({
  modelValue: String,
  placeholder: String,
  readonly: Boolean,
  asPlainText: Boolean
});

const emit = defineEmits(['update:modelValue', 'highlight-added', 'text-selected']);

const editableDiv = ref(null);
const highlights = ref([]);
const highlightColors = ['yellow', 'green', 'blue'];

const updateHighlights = debounce(() => {
  nextTick(() => {
    highlights.value.forEach((highlight) => {
      const range = document.createRange();
      const { startNode, startOffset } = findNodeAndOffsetAtPosition(highlight.start);
      const { endNode, endOffset } = findNodeAndOffsetAtPosition(highlight.end);
      if (startNode && endNode) {
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        const rects = Array.from(range.getClientRects());
        highlight.rects = rects;
      }
    });
  });
}, 300);

onMounted(() => {
  editableDiv.value.innerHTML = props.modelValue || '';
  window.addEventListener('resize', updateHighlights);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateHighlights);
});

watch(() => props.modelValue, (newValue) => {
  if (editableDiv.value.innerHTML !== newValue) {
    editableDiv.value.innerHTML = newValue;
    updateHighlights();
  }
});

function handleInput(event) {
  emit('update:modelValue', event.target.innerHTML);
  updateHighlights();
}

function handlePaste(event) {
  const clipboardData = event.clipboardData || window.clipboardData;
  const pastedData = clipboardData.getData(props.asPlainText ? 'text/plain' : 'text/html');
  const sanitizedData = DOMPurify.sanitize(pastedData);
  document.execCommand('insertHTML', false, sanitizedData);
  emit('update:modelValue', editableDiv.value.innerHTML);
  updateHighlights();
}

function handleMouseUp() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (!range.collapsed) {
      const start = getPositionRelativeToEditableDiv(range.startContainer, range.startOffset);
      const end = getPositionRelativeToEditableDiv(range.endContainer, range.endOffset);
      emit('text-selected', { start, end });
    }
  }
}

function highlightText(color) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (!range.collapsed) {
      const start = getPositionRelativeToEditableDiv(range.startContainer, range.startOffset);
      const end = getPositionRelativeToEditableDiv(range.endContainer, range.endOffset);
      const id = uuidv4();
      highlights.value.push({ id, start, end, color, rects: [] });
      emit('highlight-added', { id, color, text: range.toString() });
      updateHighlights();
    }
  }
}


function getHighlightStyle(highlight, rect) {
  return {
    backgroundColor: highlight.color,
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    position: 'absolute',
    opacity: 0.3,
    pointerEvents: 'none',
  };
}

function getPositionRelativeToEditableDiv(node, offset) {
  const range = document.createRange();
  range.selectNodeContents(editableDiv.value);
  range.setEnd(node, offset);
  return range.toString().length;
}

function findNodeAndOffsetAtPosition(position) {
  let currentPos = 0;
  const treeWalker = document.createTreeWalker(editableDiv.value, NodeFilter.SHOW_TEXT, null, false);
  while (treeWalker.nextNode()) {
    const node = treeWalker.currentNode;
    const nextPos = currentPos + node.textContent.length;
    if (position <= nextPos) {
      return { node, offset: position - currentPos };
    }
    currentPos = nextPos;
  }
  return { node: null, offset: 0 };
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap');

.highlight-container {
  position: relative;
  font-family: 'Open Sans', sans-serif;
}
.editable {
  white-space: pre-wrap;
  word-break: break-word;
  padding: 10px;
  line-height: 1.5;
  font-size: 16px;
  min-height: 100px;
  border: 1px solid #ccc;
  border-radius: 4px;
  position: relative;
  z-index: 2;
}
.highlights-layer {
  position: absolute;
  pointer-events: none;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px;
  z-index: 1;
}
.highlight {
  position: absolute;
  opacity: 0.3;
  pointer-events: none;
}
</style>
