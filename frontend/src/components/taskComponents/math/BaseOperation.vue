<template>
  <div class="baseOperation">
    <slot name="firstOperand"></slot>
    <div class="operation">{{ operation }}</div>
    <slot name="secondOperand"></slot>
  </div>
</template>

<script lang="ts">
export default {
  name: "BaseOperation",
  props: { options: Object },
  setup(props) {
    return { operation: props.options.operation };
  },
};
</script>

<style scoped>
.baseOperation {
  display: flex;
  align-items: center;
}

.operation {
  font-size: 20px;
  width: 20px;
}

.baseOperation > * {
  margin: 0 5px;
}
</style>
