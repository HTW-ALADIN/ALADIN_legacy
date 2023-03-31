<template>
  <p class="tex" style="text-align: center"></p>
</template>

<script lang="ts">
import { onMounted, computed } from "vue";
export default {
  name: "TexDisplay",
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { store, getProperty } = props.storeObject;
    const currentNode = computed(() => store.state.currentNode);
    const path = `nodes__${currentNode.value}__components__${props.componentID}`;
    const dependencies = getProperty(`${path}__dependencies`);
    const renderedTex = computed(() => getProperty(dependencies.TexDisplay.renderedTex));

    onMounted(() => {
      document.querySelector(".tex").innerHTML = "`" + renderedTex.value + "`";
      window.MathJax.Hub.Typeset();
    });
    return {};
  },
};
</script>

<style scoped>
.tex {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 250%;
}
</style>
