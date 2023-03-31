<template>
  <div :class="`button button__${label} ${buttonType}`" v-bind="dataAttribute" @click.stop="callback">
    {{ label }}
  </div>
</template>

<script lang="ts">
export default {
  name: "Button",
  props: {
    label: String,
    callback: Function,
    data: Object,
    type: String,
  },
  setup(props) {
    let buttonType = props.type;
    if (!buttonType) buttonType = "default";

    let dataAttribute = {};
    if (props.data) {
      dataAttribute = {
        [`data-${props.data.name}`]: props.data.value,
      };
    }

    return { buttonType, dataAttribute };
  },
};
</script>

<style scoped>
.button {
  text-align: center;
  line-height: 5vh;
  min-width: 5vw;
  padding: 0 10px;
  height: 5vh;
  border-radius: 10px;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  text-shadow: 2px 2px black;
  transition: all 1s ease;
}

.button:hover {
  filter: brightness(85%);
  transition: all 1s ease;
}

.default {
  background: linear-gradient(90deg, #57636b, #40494f);
  color: #f1ad2d;
}
</style>
