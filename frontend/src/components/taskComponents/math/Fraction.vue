<template>
  <div class="fraction">
    <div class="numerator">
      <slot name="numerator"></slot>
    </div>
    <div class="hr">
      <hr class="line" />
    </div>
    <div class="denominator">
      <slot name="denominator"></slot>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: "Fraction",
  setup() {
    return {};
  },
};
</script>

<style scoped>
.fraction {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  text-align: center;
  flex-direction: column;
  height: 100%;
}

.denominator,
.numerator {
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: center;
}

.hr {
  display: inline-block;
  width: 100%;
}
.hr hr {
  height: 2px;
  background: black;
}
</style>
