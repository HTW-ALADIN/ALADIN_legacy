<template>
  <select :class="`${elementId}__initial`" @change="emitEvent" :value="element.initial">
    <option v-for="(option, i) in element.options" :key="i">
      {{ option }}
    </option>
  </select>
</template>

<script lang="ts">
import { onMounted } from "vue";

export default {
  name: "RangeFormField",
  props: {
    element: Object,
    elementId: String,
    storeObject: Object,
    componentID: Number,
  },
  setup(props, { emit }) {
    const { store, getProperty } = props.storeObject;
    const currentTask = getProperty("currentTask");

    const { action } = props.element;

    const executeAction = () => {
      const { instruction, type, key } = action;
      store.dispatch("fetchTaskData", {
        payload: { instruction, type: currentTask, task: currentTask, parameters: { [key]: props.element.initial } },
        endpoint: `${currentTask}/${instruction}`,
      });
    };

    onMounted(() => {
      executeAction();
    });

    const emitEvent = (event) => {
      emit("updateElement", event);
      executeAction();
    };
    return { emitEvent };
  },
};
</script>

<style scoped>
select {
  width: 100%;
  border-radius: 5px;
  text-align-last: center;
  text-align: center;
}
</style>
