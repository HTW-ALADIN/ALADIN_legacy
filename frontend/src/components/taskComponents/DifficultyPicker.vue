<template>
  <div></div>
</template>

<script lang="ts">
import { onMounted, ref, watch } from "vue";

export default {
  props: { storeObject: Object },
  setup(props) {
    const { store, getProperty, setProperty } = props.storeObject;
    return {};
  },
};
</script>

<style></style>
