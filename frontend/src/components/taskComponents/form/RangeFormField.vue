<template>
  <div class="parameter_range">
    <input
      v-tooltip.top-center="lowerErrorMessage"
      :class="`${elementId}__initial__lowerValue`"
      :type="element.type"
      :value="element.initial.lowerValue"
      :min="element.boundaries.min"
      :max="element.boundaries.max"
      :step="element.step"
      oninput="this.reportValidity()"
      @keyup="emitEvent"
    />
    <input
      v-tooltip.top-center="upperErrorMessage"
      :class="`${elementId}__initial__upperValue`"
      :type="element.type"
      :value="element.initial.upperValue"
      :min="element.boundaries.min"
      :max="element.boundaries.max"
      :step="element.step"
      oninput="this.reportValidity()"
      @keyup="emitEvent"
    />
  </div>
</template>

<script lang="ts">
import { onMounted, ref, computed } from "vue";
import { delay } from "@/helpers/HelperFunctions.ts";
import { evaluateRange } from "./validation";

export default {
  name: "RangeFormField",
  props: {
    element: Object,
    elementId: String,
  },
  setup(props, { emit }) {
    let lowerErrorMessage = ref("");
    let upperErrorMessage = ref("");

    const evaluate = () => {
      const lowerInput: HTMLInputElement = document.querySelector(`.${props.elementId}__initial__lowerValue`);
      const upperInput: HTMLInputElement = document.querySelector(`.${props.elementId}__initial__upperValue`);
      const lowerValue = parseFloat(lowerInput.value.replace(",", "."));
      const upperValue = parseFloat(upperInput.value.replace(",", "."));

      const { min, max } = props.element.boundaries;

      const lowerCondition = lowerValue >= min && lowerValue <= max && lowerValue <= upperValue;
      const upperCondition = upperValue >= min && upperValue <= max && upperValue >= lowerValue;

      const setValidity = (target: HTMLInputElement, isValid: boolean) => {
        if (isValid) {
          target.classList.remove("invalid");
          target.classList.add("valid");
        } else {
          target.classList.remove("valid");
          target.classList.add("invalid");
        }
      };
      setValidity(lowerInput, lowerCondition);
      setValidity(upperInput, upperCondition);
    };

    const emitEvent = (event) => {
      delay(
        "formFill",
        () => {
          evaluateRange(props);
          emit("updateElement", event);
        },
        500
      );
    };

    onMounted(() => {
      evaluateRange(props);
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
