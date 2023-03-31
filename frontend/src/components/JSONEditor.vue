<template>
  <div class="jsonEditor">
    <CodeEditor :componentID="999" :storeObject="storeObject" :codeProp="code" :hideActions="true" :languageProp="'.json'" />
  </div>
</template>

<script lang="ts">
import { computed } from "vue";
import CodeEditor from "@/components/taskComponents/CodeEditor.vue";

export default {
  name: "Editor",
  props: {
    storeObject: Object,
  },
  components: {
    CodeEditor,
  },
  setup(props) {
    const { store, getProperty, setProperty } = props.storeObject;
    const code = computed(() => {
      return { nodes: getProperty("nodes"), taskData: getProperty("taskData") };
    });

    return { code };
  },
};
</script>

<style>
.jsonEditor {
  position: fixed;
  right: 0;
  top: 0;
  width: 30vw;
  height: 100vh;
  z-index: 5;
}
</style>
