<template>
  <input :class="`${elementId}__initial`" @change="emitEvent" :value="element.initial" :type="element.type" :checked="element.initial" />
</template>

<script lang="ts">
export default {
  name: "CheckboxFormField",
  props: {
    element: Object,
    elementId: String,
  },
  setup(props, { emit }) {
    const emitEvent = (event) => {
      emit("updateElement", event);
    };
    return { emitEvent };
  },
};
</script>

<style scoped>
input[type="checkbox"] {
  width: 14px !important;
  height: 14px !important;
  margin: 5px;
  -webkit-appearance: none;
  -moz-appearance: none;
  -o-appearance: none;
  appearance: none;
  outline: 1px solid #b1b2b4;
  box-shadow: none;
  font-size: 0.8em;
  text-align: center;
  line-height: 1em;
  background: #57636b;
}

input[type="checkbox"]:checked:after {
  text-align: center;
  content: "✔";
  color: #f1ad2d;
  filter: brightness(120%);
  background: #57636b;
}
</style>
