<template>
  <div class="radical">
    <div class="index">
      <sup>
        <slot name="index"></slot>
      </sup>
    </div>
    &radic;
    <div class="radicand"><slot name="radicand"></slot></div>
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
.radical {
  display: flex;
  height: 100%;
  font-size: 30px;
  justify-content: center;
  align-items: flex-end;
}

.index {
  padding-bottom: 0.7em;
}

.index sup {
  vertical-align: super;
}

.radicand {
  border-top: 1px solid #000000;
  padding-top: 4px;
}
</style>
