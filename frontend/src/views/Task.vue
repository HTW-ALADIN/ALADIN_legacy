<template>
  <div class="task">
    <transition name="fade">
      <LoadingSpinner v-if="isLoading" />
    </transition>
    <transition name="slidedown">
      <DecisionNode v-if="isDecisionNode" :storeObject="taskStore" :key="currentNode" />
    </transition>
    <Canvas v-if="!isDecisionNode && !isLoading" :key="currentNode" :storeObject="taskStore" />
  </div>
</template>

<script lang="ts">
import { onMounted, onBeforeUnmount, computed } from "vue";
import { useRoute } from "vue-router";
import Canvas from "@/components/Canvas.vue";
import stores from "@/helpers/TaskGraphUtility";
import DecisionNode from "@/components/DecisionNode.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";

export default {
  name: "Task",
  components: {
    Canvas,
    DecisionNode,
    LoadingSpinner,
  },
  setup() {
    const taskStore = stores.taskStore;
    const { store, getProperty, setProperty } = taskStore;

    const route = useRoute();
    const currentNode = computed(() => getProperty("currentNode"));

    const isDecisionNode = computed(() => {
      const edges = getProperty(`edges__${currentNode.value}`);
      if (edges) return edges.length > 1;
      return false;
    });

    const isLoading = computed(() => getProperty(`isLoading`));

    const isReplayGraph = computed(() => getProperty("restoredFromReplay"));

    if (typeof route.params.task === "string" && !isReplayGraph.value) {
      setProperty({ path: "currentTask", value: route.params.task });
      store.dispatch("fetchTaskGraph", { task: route.params.task });
    }

    const throttle = 50;
    let last = new Date().getTime();
    const trackMouse = (event) => {
      event.preventDefault();
      const now = new Date().getTime();
      const target: EventTarget = event.target;

      // update only n milliseconds to not freeze the app
      if (now - last < throttle) return;

      store.dispatch("trackMouse", { x: event.pageX, y: event.pageY, timestamp: now });

      last = now;
    };
    onMounted(() => {
      document.addEventListener("mousemove", trackMouse);
    });

    onBeforeUnmount(() => {
      document.removeEventListener("mousemove", trackMouse);
    });

    return { currentNode, isDecisionNode, taskStore, isLoading };
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
