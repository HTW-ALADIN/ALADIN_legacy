<template>
  <div class="settings"></div>
</template>

<script lang="ts">
import Equation from "@/components/taskComponents/math/Equation.vue";
import { mathlex } from "@/helpers/FormulaGenerator";

export default {
  name: "Settings",
  setup() {
    return {};
  },
};
</script>

<style scoped>
.settings {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  flex-direction: column;
}
</style>
