<template>
  <ContextMenu :componentId="componentID" :methods="selectedMethods" :storeObject="storeObject">
    <div :class="`equation equation__${componentID}`">
      <Term :terms="leftTerm" :path="'leftTerm__0'" />
      <div class="operator">{{ comparisonOperator }}</div>
      <Term :terms="rightTerm" :path="'rightTerm__0'" />
    </div>
  </ContextMenu>
</template>

<script lang="ts">
import Term from "@/components/taskComponents/math/Term.vue";
import ContextMenu from "@/components/taskComponents/mixins/ContextMenu.vue";
import { computed, onMounted, provide, watch } from "vue";

export default {
  name: "Equation",
  components: {
    Term,
    ContextMenu,
  },
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { store, getProperty, setProperty } = props.storeObject;
    provide("storeObject", props.storeObject);
    provide("componentID", props.componentID);

    const currentNode = computed(() => store.state.currentNode);
    const path = `nodes__${currentNode.value}__components__${props.componentID}`;

    const dependencies = getProperty(`${path}__dependencies`);
    const aladinAST = computed(() => getProperty(dependencies.Equation.aladinAST));
    const { leftTerm, rightTerm, comparisonOperator } = aladinAST.value;

    const validate = () => {
      const isValid = Array.from(document.querySelectorAll(`.equation input`)).every((element) =>
        Array.from(element.classList).includes("valid")
      );
      setProperty({ path: `${path}__isValid`, value: isValid });
    };

    watch(
      aladinAST,
      () => {
        setTimeout(validate, 50);
      },
      { deep: true }
    );

    const methods = {
      fillConstants: () => {
        const ASTPath = `nodes__${currentNode.value}__components__${props.componentID}__component__aladinAST`;

        Array.from(document.querySelectorAll(`.equation input`)).forEach((element: HTMLElement) => {
          if (element.dataset.valuetype == "constant") {
            //  || element.dataset.valuetype == "variableConstant" for ^p for example which is temporarily set to 2 to simplify
            const scalar = getProperty(`${ASTPath}__${element.dataset.path}`);

            setProperty({ path: `${ASTPath}__${element.dataset.path}__userValue`, value: scalar.value });
          }
        });
      },
      showSolution: () => {
        const ASTPath = `nodes__${currentNode.value}__components__${props.componentID}__component__aladinAST`;

        Array.from(document.querySelectorAll(`.equation input`)).forEach((element: HTMLElement) => {
          if (!Array.from(element.classList).includes("valid")) {
            const scalar = getProperty(`${ASTPath}__${element.dataset.path}`);

            setProperty({ path: `${ASTPath}__${element.dataset.path}__userValue`, value: scalar.value });
          }
        });
      },
    };
    const selectedMethods = () => {
      return Object.entries(getProperty(`nodes__${currentNode.value}__components__${props.componentID}__methods`)).reduce(
        (selectedMethods, [name, description]: [string, string]) => ({ ...selectedMethods, [description]: methods[name] }),
        {}
      );
    };

    return {
      leftTerm,
      rightTerm,
      comparisonOperator,
      validate,
      selectedMethods: selectedMethods(),
    };
  },
};
</script>

<style scoped>
.equation {
  display: flex;
  overflow-x: scroll;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: row;
}

.equation > * {
  margin: 0 10px;
}

.operator {
  font-size: 20px;
  width: 20px;
}
</style>
