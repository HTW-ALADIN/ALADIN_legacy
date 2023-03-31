<template>
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
import { evaluateValue } from "./validation";
import { delay } from "@/helpers/HelperFunctions.ts";

export default {
  name: "RangeFormField",
  props: {
    element: Object,
    elementId: String,
  },
  setup(props, { emit }) {
    const emitEvent = (event) => {
      delay(
        "formFill",
        () => {
          evaluateValue(props);
          emit("updateElement", event);
        },
        500
      );
    };
    onMounted(() => {
      evaluateValue(props);
    });

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
