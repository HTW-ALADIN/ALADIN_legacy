<template>
  <input class="scalar" :class="setValidation(isValid)" type="number" v-model="userValue" :data-valueType="valueType" :data-path="path" />
</template>

<script lang="ts">
import { inject, computed, ref, watch } from "vue";
export default {
  name: "Scalar",
  props: {
    value: Number,
    term: Object,
    path: String,
  },
  setup(props, { emit }) {
    const storeObject: { state: any; getProperty: Function; setProperty: Function } = inject("storeObject");
    const componentID = inject("componentID");
    const { getProperty, setProperty } = storeObject;

    const currentNode = getProperty("currentNode");

    const ASTPath = `nodes__${currentNode}__components__${componentID}__component__aladinAST`;

    const userValue = computed({
      get: () => getProperty(`${ASTPath}__${props.path}__userValue`),
      set: (newValue) => setProperty({ path: `${ASTPath}__${props.path}__userValue`, value: newValue }),
    });

    let isValid = ref(null);
    const setValidation = (isValid: boolean) => {
      if (isValid === false) return "invalid";
      if (isValid === true) return "valid";
      return "";
    };

    watch(userValue, (newV, oldV) => {
      const value = getProperty(`${ASTPath}__${props.path}__value`);
      if (`${value}` == userValue.value) isValid.value = true;
      else isValid.value = false;
      if (newV == "") isValid.value = null;
    });

    return { userValue, isValid, setValidation, valueType: props.term.valueType };
  },
};
</script>

<style scoped>
.scalar {
  width: 35px;
  min-width: 30px;
  text-align: center;
  height: 25px;
}

.valid {
  border: 2px solid green;
}

.valid:focus {
  outline: none;
  border: 3px solid green;
}

.invalid {
  border: 2px solid red;
}

.invalid:focus {
  outline: none;
  border: 3px solid red;
}
</style>
