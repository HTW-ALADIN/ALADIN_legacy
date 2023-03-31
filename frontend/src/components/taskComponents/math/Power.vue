<template>
  <div class="power">
    <slot name="base"></slot>
    <div class="exponent">
      <sup><slot name="exponent"></slot></sup>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: "Power",
  setup() {
    return {};
  },
};
</script>

<style scoped>
.power {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  width: 100%;
  height: 100%;
}

.exponent {
  padding-bottom: 1em;
}

.exponent sup {
  vertical-align: super;
}
</style>
