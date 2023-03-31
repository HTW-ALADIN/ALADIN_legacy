<template>
  <textarea class="textarea" :value="value" @input="update"> </textarea>
</template>

<script lang="ts">
import { computed } from "vue";
export default {
  name: "TextArea",
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { getProperty, setProperty } = props.storeObject;
    const currentNode = getProperty("currentNode");

    const path = `nodes__${currentNode}__components__${props.componentID}__component__value`;
    const value = computed(() => getProperty(path));

    const update = (event) => {
      const textarea: HTMLInputElement = event.currentTarget;
      setProperty({ path, value: textarea.value });
    };

    return { value, update };
  },
};
</script>

<style scoped>
.textarea {
  width: 100%;
  height: 95%;
  margin-top: 5%;
  font-size: 25px;
}
</style>
