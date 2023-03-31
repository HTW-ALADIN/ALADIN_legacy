<template>
  <ContextMenu :componentId="id" :methods="selectedMethods" :storeObject="storeObject">
    <table :id="`matrix_${id}`" class="matrix">
      <tr v-if="columnLabel && columnLabel.length">
        <p class="placeholder">&nbsp;</p>
        <th v-for="(label, i) in columnLabel" :key="i">
          <p class="matrix_label">{{ label }}</p>
        </th>
      </tr>
      <tr v-for="(row, i) in userData" :key="i">
        <th v-if="rowLabel && rowLabel.length">
          <p class="matrix_label">{{ rowLabel[i] }}</p>
        </th>
        <td class="matrix_element" v-for="(element, j) in userData[i]" :key="j">
          <input
            :class="`i__${i}__${j}`"
            :data-index="[i, j]"
            :readonly="isReadOnly"
            :disabled="isReadOnly"
            @keyup="updateField"
            type="number"
            :value="element"
          />
        </td>
      </tr>
    </table>
  </ContextMenu>
</template>

<script lang="ts">
import { onMounted, computed, watch } from "vue";
import { Matrix } from "@/helpers/LinearAlgebra";
import { IMatrixInstruction } from "@/interfaces/componentInterfaces/MatrixInterface";
import ContextMenu from "@/components/taskComponents/mixins/ContextMenu.vue";

export default {
  props: { componentID: Number, storeObject: Object },
  components: {
    ContextMenu,
  },
  setup(props) {
    const { store, getProperty, setProperty } = props.storeObject;
    const currentNode = computed(() => store.state.currentNode);
    const componentPath = `nodes__${currentNode.value}__components__${props.componentID}__component`;

    const dependencyPaths = getProperty(`nodes__${currentNode.value}__components__${props.componentID}__dependencies`);
    const dependencies = computed(() =>
      Object.entries(dependencyPaths.Matrix).map(([dependency, dependencyPath]) => getProperty(dependencyPath))
    );

    const isReadOnly = getProperty(`${componentPath}__readOnly`);
    const instructions = getProperty(`${componentPath}__initialize`);
    const rowLabelPath = getProperty(`${componentPath}__rowLabel`);
    const columnLabelPath = getProperty(`${componentPath}__columnLabel`);
    const rowLabel = computed(() => {
      if (rowLabelPath) return getProperty(rowLabelPath);
      else return [];
    });
    const columnLabel = computed(() => {
      if (rowLabelPath) return getProperty(columnLabelPath);
      else return [];
    });

    const initialize = async (instructions: IMatrixInstruction) => {
      Object.entries(instructions).forEach(([name, instructions]) => {
        // TODO: change replay functionality for stepping in task to apply incremental changes behind loading screen
        // fix for presentation; REMOVE AFTERWARDS
        if (name === "user" && getProperty("restoredFromReplay")) {
          return;
        }

        const strip = (v) => JSON.parse(JSON.stringify(v));
        const { paths, operations } = instructions;

        let delay = false;
        const matrices = paths.map((path) => {
          let matrix = strip(getProperty(`${path}`));
          // need to wait for components to be computed fully, before initializing depending component
          if (matrix === null) {
            delay = true;
            return new Matrix(...[[]]);
          }

          if (matrix.length == 1) matrix = matrix[0].map((scalar) => [scalar]);
          return new Matrix(...matrix);
        });

        if (delay) return;

        const resultMatrix = operations.reduce((result, operation, i) => {
          const { name, args } = JSON.parse(JSON.stringify(operation));
          if (args.includes("chain")) return result[name](matrices[i + 1]);
          return result[name](...args);
        }, matrices[0]);
        setProperty({ path: `${componentPath}__${name}Data`, value: resultMatrix.getRows() });
      });
    };

    onMounted(async () => {
      if ((dependencies.value && !userData.value) || !userData.value.length) {
        initialize(instructions);
      }
      validateMatrix();
    });

    watch(
      dependencies,
      async () => {
        initialize(instructions);
      },
      { deep: true }
    );

    const loadData = (path) => {
      const data = getProperty(path);
      if (data) {
        if (data.length > 1) return data;
        return data[0].map((scalar) => [scalar]);
      } else return [];
    };
    const userData = computed(() => loadData(`${componentPath}__userData`));
    const validationData = computed(() => loadData(`${componentPath}__validationData`));

    const updateField = (event) => {
      const element = event.target;
      const { index } = element.dataset;
      const [column, row] = index.split(",");
      let value = element.value;
      setProperty({ path: `${componentPath}__userData__${column}__${row}`, value });
    };

    const validateMatrix = () => {
      if (isReadOnly) return true;
      return userData.value.reduce((isValid, column, i) => {
        column.forEach((value, j) => {
          const element = document.querySelector(`#matrix_${props.componentID} .i__${i}__${j}`);
          if (!element) {
            isValid = false;
            return;
          }
          if (value === null || value === "") {
            element.classList.remove("valid");
            element.classList.remove("invalid");
            isValid = false;
          } else if (validationData.value[i][j] == value) {
            element.classList.remove("invalid");
            element.classList.add("valid");
            return;
          } else {
            element.classList.remove("valid");
            element.classList.add("invalid");
            isValid = false;
          }
        });
        return isValid;
      }, true);
    };
    watch(
      userData,
      () => {
        const isValid = validateMatrix();
        setProperty({
          path: `nodes__${currentNode.value}__components__${props.componentID}__isValid`,
          value: isValid,
        });
      },
      { deep: true }
    );

    const methods = {
      fillZeros: () => {
        const solution = JSON.parse(JSON.stringify(getProperty(`${componentPath}__validationData`)));
        const userData = JSON.parse(JSON.stringify(getProperty(`${componentPath}__userData`)));
        const merged = solution.map((row, i) =>
          row.map((value, j) => {
            if (value === 0) return "0";
            return userData[i][j];
          })
        );
        setProperty({ path: `${componentPath}__userData`, value: merged });
      },
      showSolution: () => {
        const solution = JSON.parse(JSON.stringify(getProperty(`${componentPath}__validationData`)));
        setProperty({ path: `${componentPath}__userData`, value: solution });
      },
      copyToClipboard: () => {
        const csv = userData.value.map((row) => row.join(";") + ";").join("\n");
        window.navigator.clipboard.writeText(csv);
      },
    };
    const selectedMethods = () => {
      return Object.entries(getProperty(`nodes__${currentNode.value}__components__${props.componentID}__methods`)).reduce(
        (selectedMethods, [name, description]: [string, string]) => ({ ...selectedMethods, [description]: methods[name] }),
        {}
      );
    };

    return {
      id: props.componentID,
      validationData,
      userData,
      rowLabel,
      columnLabel,
      isReadOnly,
      updateField,
      selectedMethods: selectedMethods(),
    };
  },
};
</script>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.matrix {
  width: 100%;
  min-height: 100%;
  height: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.matrix .matrix_element {
  min-height: 100%;
  position: relative;
  border: 2px solid black;
}

.matrix input {
  top: 0px;
  position: absolute;
  width: 100%;
  min-height: 100%;
  font-size: 130%;
  text-align: center;
}

th {
  min-height: 100%;
  border: 2px solid black;
  background: #57636b;
  color: #b1b2b4;
}

.matrix_label {
  font-size: 130%;
  width: 100%;
  text-align: center;
}

.valid {
  background: green;
}

.invalid {
  background: red;
}

input[disabled] {
  background: lightgrey;
}
</style>
