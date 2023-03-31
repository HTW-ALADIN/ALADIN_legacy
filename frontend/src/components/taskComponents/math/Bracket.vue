<template>
  <div>
    <div class="bracket open">{{ bracket.type }}</div>
    <slot></slot>
    <div class="bracket close">{{bracket.type)}}</div>
  </div>
</template>

<script lang="ts">
export default {
  name: "Scalar",
  props: {
    value: Number,
  },
  setup() {
    return {};
  },
};
</script>

<style scoped>
.scalar {
  width: 30px;
  text-align: center;
  padding: 5px;
}
</style>
