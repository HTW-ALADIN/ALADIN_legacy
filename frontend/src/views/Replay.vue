<template>
  <div class="task">
    <transition name="slidedown">
      <DecisionNode v-if="isDecisionNode" :storeObject="replayStore" />
    </transition>
    <transition name="slidedown">
      <Canvas v-if="!isDecisionNode && isLoaded" :key="currentNode" :storeObject="replayStore" />
    </transition>
    <ReplayOverlay :replayStore="replayStore" :taskStore="taskStore" />
  </div>
</template>

<script lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import Canvas from "@/components/Canvas.vue";
import stores from "@/helpers/TaskGraphUtility";
import DecisionNode from "@/components/DecisionNode.vue";
import ReplayOverlay from "@/components/ReplayOverlay.vue";

export default {
  name: "Replay",
  components: {
    Canvas,
    DecisionNode,
    ReplayOverlay,
  },
  setup() {
    const taskStore = stores.taskStore;
    const replayStore = stores.replayStore;
    const { store, getProperty, setProperty } = replayStore;

    const route = useRoute();
    if (typeof route.params.id === "string") {
      store.dispatch("fetchReplayGraph", { id: route.params.id });
    }

    const currentNode = computed(() => getProperty("currentNode"));
    const isDecisionNode = computed(() => {
      const edges = getProperty(`edges__${currentNode.value}`);
      if (edges) return edges.length > 1;
      return false;
    });

    const isLoaded = computed(() => getProperty(`currentNode`) !== null);

    return { currentNode, isDecisionNode, isLoaded, replayStore, taskStore };
  },
};
</script>

<style scoped>
.slidedown-enter-active,
.slidedown-leave-active {
  transition: max-height 0.3s ease-in-out;
}

.slidedown-enter-to,
.slidedown-leave-from {
  overflow: hidden;
  max-height: 100vh;
}

.slidedown-enter-from,
.slidedown-leave-to {
  overflow: hidden;
  max-height: 0;
}
</style>
