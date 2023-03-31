<template>
  <div class="taskOverview">
    <div class="center node">ALADIN</div>
    <router-link class="taskOverview_taskNode node" v-for="task in taskList" :key="task.name" :to="`/task/${task.name}`">{{
      task.name
    }}</router-link>
  </div>
</template>

<script lang="ts">
import { computed, onMounted, onBeforeMount, watch } from "vue";
import { store as taskOverviewStore } from "../store/taskOverview";
import stores from "@/helpers/TaskGraphUtility";

export default {
  setup() {
    const taskStore = stores.taskStore.store;

    const taskList = computed(() => {
      return taskOverviewStore.state.taskList;
    });

    const circularLayout = (circleElements, spread = 300) => {
      if (!taskList.value.length) return;
      const elementSize = circleElements[0].offsetWidth / 2;

      const centerX = window.innerWidth / 2 - elementSize;
      const centerY = window.innerHeight / 2 - elementSize;

      const increase = (Math.PI * 2) / circleElements.length;

      let x = 0,
        y = 0,
        angle = 0;

      circleElements.forEach((element) => {
        x = spread * Math.cos(angle) + centerX;
        y = spread * Math.sin(angle) + centerY;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.opacity = "1";
        angle += increase;
      });
    };

    const centreElement = (element) => {
      const elementSize = element.offsetWidth / 2;

      const x = window.innerWidth / 2 - elementSize;
      const y = window.innerHeight / 2 - elementSize;

      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    };

    const renderLayout = () => {
      const centerNode = document.querySelector(".center");
      centreElement(centerNode);
      setTimeout(() => {
        const circleElements = Array.from(document.querySelectorAll(".taskOverview_taskNode"));
        circularLayout(circleElements);
      }, 5);
    };

    onBeforeMount(() => {
      taskOverviewStore.dispatch("fetchTasks");
      taskStore.dispatch("resetStore");
    });

    onMounted(() => {
      renderLayout();
    });

    watch(taskList, (newTaskList) => {
      renderLayout();
    });

    return { taskList };
  },
};
</script>

<style scoped>
.taskOverview {
  width: 100vw;
  height: 100vh;
}

.node {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  height: 8vw;
  width: 8vw;
  background: #57636b;
  border-radius: 50%;
  text-decoration: none;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  text-shadow: 1px 1px 1px #b1b2b4;
  font-size: 18px;
}

.center {
  height: 9vw;
  width: 9vw;
  color: #f1ad2d;
  font-size: 20px;
}

.taskOverview_taskNode {
  transition: all 0.2s ease;
  background: #e8edf1;
  filter: brightness(70%);
  color: #57636b;
  opacity: 0;
}

.taskOverview_taskNode:hover {
  filter: brightness(85%);
  transition: all 0.5s ease;
  color: #f1ad2d;
  font-size: 20px;
  transform: scale(1.02);
  background: #57636b;
}
</style>
