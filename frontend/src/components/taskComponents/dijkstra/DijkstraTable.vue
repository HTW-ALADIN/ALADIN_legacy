<template>
  <ContextMenu :componentId="id" :methods="selectedMethods" :storeObject="storeObject">
    <div class="dijkstra">
      <div class="djikstraWrapper">
        <div class="dijkstraTable">
          <table>
            <thead>
              <tr>
                <th class="header">{{ labels.iteration }}</th>
                <th class="header"></th>
                <th class="header" :style="`background=&quot;${colorScheme[node.id]}&quot;`" v-for="node in nodes" :key="node.id">
                  {{ node.id }}
                </th>
              </tr>
            </thead>
            <tbody>
              <transition-group class="list" name="list" tag="tr" v-for="(row, i) in userRows" :key="i">
                <td :key="i">
                  {{ i }}
                </td>
                <td class="rowHeader" :key="i">
                  <p>{{ labels.cost }}</p>
                  <p>{{ labels.predecessor }}</p>
                </td>
                <td v-for="(cost, j) in row.cost" :key="j">
                  <div class="cost">
                    <input type="text" :data-index="`${j}-cost`" :value="cost" @input="() => {}" />
                    <input type="text" :data-index="`${j}-predecessor`" :value="row.predecessor[j]" />
                  </div>
                </td>
              </transition-group>
            </tbody>
          </table>
        </div>

        <div class="tableControls">
          <Button class="addRow" :label="'+'" :callback="false ? () => {} : addRow" :class="{ disabled: userRows.length === maxRows }" />
          <Button class="removeRow" :label="'-'" :callback="removeRow" :class="{ disabled: userRows.length === 1 }" />
        </div>
      </div>

      <ControlObject :componentID="componentID" :storeObject="storeObject" />
    </div>
  </ContextMenu>
</template>

<script lang="ts">
import { onMounted, computed, watch, ref } from "vue";
import Button from "@/components/Button.vue";
import ControlObject from "@/components/taskComponents/dijkstra/ControlObject.vue";
import ContextMenu from "@/components/taskComponents/mixins/ContextMenu.vue";

export default {
  components: {
    Button,
    ControlObject,
    ContextMenu,
  },
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { store, getProperty, setProperty } = props.storeObject;
    const currentNode = computed(() => store.state.currentNode);
    const path = `nodes__${currentNode.value}__components__${props.componentID}`;

    const dependencies = getProperty(`${path}__dependencies`);
    const nodes = computed(() => getProperty(dependencies.DijkstraTable.nodes));
    const initialRow = computed(() => getProperty(dependencies.DijkstraTable.initialRow));
    const controlObject = computed(() => getProperty(dependencies.DijkstraTable.initialControls));

    const labels = getProperty(`${path}__component__labels`);

    const colorCoding = getProperty(`${path}__component__colorCoding`);

    const applyColors = (controlObject): object => {
      const { done, chosen, queue, successor } = controlObject;

      return Object.entries(controlObject).reduce((colorScheme, [key, values]) => {
        const arr = values as any;
        for (let i; i < arr.length; i++) {
          colorScheme[arr[i]] = colorCoding[key];
        }
        return colorScheme;
      }, {});
    };

    const colorScheme = ref(applyColors(controlObject.value));

    const userRows = computed(() => {
      const userRows = getProperty(`${path}__component__userRows`);
      if (!userRows.length) userRows.push(initialRow.value);
      return userRows;
    });

    const methods = {
      solveStep: () => {
        const { steps } = getProperty(`taskData__solution`);
        const { row, controlObject } = steps[userRows.value.length - 1];
        setProperty({ path: `${path}__component__userRows`, value: [...userRows.value, row] });
        setProperty({ path: `${path}__component__controlObject`, value: controlObject });
      },
    };
    const selectedMethods = () => {
      return Object.entries(getProperty(`nodes__${currentNode.value}__components__${props.componentID}__methods`)).reduce(
        (selectedMethods, [name, description]: [string, string]) => ({ ...selectedMethods, [description]: methods[name] }),
        {}
      );
    };

    const maxRows = getProperty("taskData__edges").length;
    const addRow = () => {
      if (userRows.value.length < maxRows) userRows.value.push(userRows.value[userRows.value.length - 1]);
    };
    const removeRow = () => userRows.value.pop();

    watch(
      controlObject,
      (newValue, oldValue) => {
        colorScheme.value = applyColors(newValue);
        // console.log(colorScheme);
      },
      { deep: true }
    );

    return { nodes, userRows, addRow, removeRow, maxRows, labels, colorScheme, selectedMethods: selectedMethods() };
  },
};
</script>

<style scoped>
.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.dijkstra {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
}

.djikstraWrapper {
  flex: 3;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.dijkstraTable {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  align-items: center;
  height: 90%;
  box-shadow: 1px 1px 3px 0px rgba(0, 0, 0, 1);
  overflow: auto;
}

.tableControls {
  display: flex;
  width: 100%;
  height: 20%;
  justify-content: center;
  align-content: center;
}

.addRow,
.removeRow {
  margin: 5px 5px;
  align-self: center;
}

table {
  width: 100%;
}

table,
th,
td {
  border: 1px solid black;
  border-collapse: collapse;
  text-align: center;
  border-spacing: 5px;
  font-size: 20px;
}
th,
td {
  min-height: 70px;
  min-width: 70px;
}
th {
  background: #57636b;
  color: #e8edf1;
}
tr {
  width: 100%;
  height: 100%;
}
tr:nth-child(odd) {
  background: #b1b2b4;
}

.rowHeader {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.cost {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.cost input {
  margin: 5px;
  width: 40%;
  text-align: center;
}

.list-enter-active,
.list-leave-enter {
  transform: translateX(0);
  transition: all 0.3s linear;
}
.list-enter,
.list-leave-to {
  transform: translateX(100%);
}
</style>
