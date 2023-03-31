<template>
  <div class="test">
    <div class="box">
      <DragList
        :propData="[1, 2, 3, 5, 6]"
        :style="{ type: 'boxes', direction: 'horizontal' }"
        :name="'nodes'"
        :pullAction="'clone'"
        :putAction="false"
      />
    </div>
    <div class="box">
      <DragList
        :propData="[1, 2, 3, 4, 5, 6]"
        :style="{ type: 'boxes', direction: 'horizontal' }"
        :name="'nodes'"
        :pullAction="true"
        :putAction="true"
        :uniqueValues="false"
      />
    </div>
  </div>
</template>

<script lang="ts">
import DragList from "@/components/DragList.vue";
import { reactive, ref } from "vue";

export default {
  name: "Test",
  components: {
    DragList,
  },
  setup() {
    return {};
  },
};
</script>

<style scoped>
.test {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
}

.box {
  width: 600px;
}
</style>
