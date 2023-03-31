<template>
  <div>
    <DOTGraph :componentID="componentID" :storeObject="storeObject" />
  </div>
</template>

<script lang="ts">
import { onMounted, ref, watch } from "vue";
import DOTGraph from "@/components/taskComponents/DOTGraph.vue";

export default {
  components: { DOTGraph },
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { store, getProperty, setProperty } = props.storeObject;
    const handleSelectedPath = (event) => {};
    const edges = document.querySelectorAll(".edge");
    edges.forEach((edge) => edge.addEventListener("click", handleSelectedPath));
    return {};
  },
};
</script>

<style scoped></style>
