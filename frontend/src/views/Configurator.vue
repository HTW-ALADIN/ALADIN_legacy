<template>
  <div class="editor">
    <JSONEditor :storeObject="configurationStore" />
    <DecisionNode v-if="isDecisionNode" :storeObject="configurationStore" />
    <Canvas v-if="!isDecisionNode && Number.isInteger(currentNode)" :key="currentNode" :storeObject="configurationStore" />
  </div>
</template>

<script lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import Canvas from "@/components/Canvas.vue";
import stores from "@/helpers/TaskGraphUtility";
import DecisionNode from "@/components/DecisionNode.vue";
import JSONEditor from "@/components/JSONEditor.vue";

export default {
  name: "Editor",
  components: {
    Canvas,
    DecisionNode,
    JSONEditor,
  },
  setup() {
    const configurationStore = stores.configurationStore;
    const { store, getProperty, setProperty } = configurationStore;

    const route = useRoute();
    const currentNode = computed(() => getProperty("currentNode"));
    const isDecisionNode = computed(() => {
      const edges = getProperty(`edges__${currentNode.value}`);
      if (edges) return edges.length > 1;
      return false;
    });

    return { currentNode, isDecisionNode, configurationStore };
  },
};
</script>

<style></style>
