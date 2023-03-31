<template>
  <div class="wrapper">
    <ContourPlot class="background" :componentID="componentID" :storeObject="storeObject" />
    <DOTGraph class="foreground" :componentID="componentID" :storeObject="storeObject" />
  </div>
</template>

<script>
import { onMounted, computed } from "vue";
import ContourPlot from "@/components/taskComponents/ContourPlot.vue";
import DOTGraph from "@/components/taskComponents/DOTGraph.vue";

export default {
  props: {
    componentID: Number,
    storeObject: Object,
  },
  components: {
    DOTGraph,
    ContourPlot,
  },
  setup(props) {},
};
</script>

<style scoped>
.foreground {
  position: absolute;
  z-index: 2;
  top: 0;
}
</style>
