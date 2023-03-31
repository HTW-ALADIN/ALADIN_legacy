<template>
  <div class="range_slider">
    <input type="range" min="0" max="180" step="1" v-model="sliderMin" />
    <input type="number" min="0" max="180" step="1" v-model="sliderMin" />
    <input type="range" min="0" max="180" step="1" v-model="sliderMax" />
    <input type="number" min="0" max="180" step="1" v-model="sliderMax" />
    <input type="number" min="0" max="180" step="1" v-model="sliderDiff" />
  </div>
  <input
    :class="`${elementId}__value`"
    :type="element.type"
    :value="element.value"
    :step="element.step"
    oninput="this.reportValidity()"
    @keyup="emitEvent"
  />
</template>

<script lang="ts">
import { onMounted, ref } from "vue";

export default {
  name: "RangeFormField",
  props: {
    element: Object,
    elementId: String,
  },
  setup(props, { emit }) {
    // console.error(props);
    const emitEvent = (event) => {
      emit("updateElement", event);
    };

    return { emitEvent };
  },
};
</script>

<style scoped>
input {
  margin: 5px;
  width: 50px;
  border-radius: 5px;
  text-align: center;
  border: 3px solid black;
}

input:focus {
  outline: none;
}

input.invalid {
  border: 3px solid red;
}

input.valid {
  border: 3px solid green;
}
</style>
