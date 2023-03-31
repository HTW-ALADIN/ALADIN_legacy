<template>
  <div class="taskConfiguration">
    <DifficultyPicker :storeObject="storeObject" :componentID="props.componentID" v-if="isAdvancedUser" />
    <ParameterSelection :storeObject="storeObject" :componentID="props.componentID" v-else />
  </div>
</template>

<script lang="ts">
import { computed, watch } from "vue";
import DifficultyPicker from "@/components/taskComponents/DifficultyPicker.vue";
import ParameterSelection from "@/components/taskComponents/ParameterSelection.vue";

export default {
  props: {
    componentID: Number,
    storeObject: Object,
  },
  components: {
    DifficultyPicker,
    ParameterSelection,
  },
  setup(props) {
    const { store, getProperty, setProperty } = props.storeObject;
    const isAdvancedUser = false;

    const currentNode = computed(() => getProperty("currentNode"));
    const taskData = computed(() => getProperty("taskData"));

    watch(taskData, () => setProperty({ path: `nodes__${currentNode.value}__components__${props.componentID}__isValid`, value: true }));

    return { isAdvancedUser, props };
  },
};
</script>

<style>
.taskConfiguration {
  width: 100%;
  height: 100%;
}
</style>
