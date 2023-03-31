<template>
  <div class="controlObject">
    <h2>{{ labels.overview }}</h2>
    <div>
      <DragList
        :propData="nodes.map((v, i) => i)"
        :style="{ type: 'boxes', direction: 'horizontal' }"
        :name="'nodes'"
        :pullAction="'clone'"
        :putAction="false"
      />
    </div>
    <div v-for="([controlName, path], i) in Object.entries(controlObjectPaths)" :key="i">
      <p>{{ labels[controlName] }}</p>
      <div>
        <DragList
          :storeObject="storeObject"
          :path="path"
          :style="{ type: 'boxes', direction: 'horizontal' }"
          :name="'nodes'"
          :pullAction="true"
          :putAction="true"
          :uniqueValues="true"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { onMounted, computed } from "vue";
import DragList from "@/components/DragList.vue";

export default {
  props: {
    componentID: Number,
    storeObject: Object,
  },
  components: {
    DragList,
  },
  setup(props) {
    const { store, getProperty, setProperty } = props.storeObject;
    const currentNode = computed(() => store.state.currentNode);
    const path = `nodes__${currentNode.value}__components__${props.componentID}`;

    const dependencies = getProperty(`${path}__dependencies`);
    const nodes = computed(() => getProperty(dependencies.DijkstraTable.nodes));
    const initialRow = computed(() => getProperty(dependencies.DijkstraTable.initialRow));
    const initialControls = computed(() => getProperty(dependencies.DijkstraTable.initialControls));

    const labels = getProperty(`${path}__component__labels`);

    const userRows = computed(() => {
      const userRows = getProperty(`${path}__component__userRows`);
      if (!userRows.length) userRows.push(initialRow.value);
      return userRows;
    });

    if (!getProperty(`${path}__component__controlObject`)["queue"].length) {
      setProperty({ path: `${path}__component__controlObject`, value: initialControls.value });
    }

    const controlObjectPaths = {
      queue: `${path}__component__controlObject__queue`,
      done: `${path}__component__controlObject__done`,
      chosen: `${path}__component__controlObject__chosen`,
      successor: `${path}__component__controlObject__successor`,
    };

    const addRow = () => userRows.value.push(userRows.value[userRows.value.length - 1]);
    const removeRow = () => userRows.value.pop();
    return { nodes, userRows, addRow, removeRow, labels, controlObjectPaths };
  },
};
</script>

<style scoped>
.controlObject {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 20%;
  height: 100%;
  justify-content: center;
  align-content: center;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  background: #b1b2b4;
  border: 1px solid black;
}

.controlObject h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #57636b;
}

.controlObject > div {
  display: flex;
  justify-content: space-around;
  align-content: center;
  width: 100%;
  margin-bottom: 10px;
  font-size: 19px;
  background: #57636b;
  padding: 5px 0;
  color: #e8edf1;
  box-shadow: 1px 2px 9px 0px rgba(0, 0, 0, 1);
}

.controlObject > div p {
  flex: 2;
  margin-left: 5px;
}

.controlObject > div > div {
  flex: 2;
}

.controlObject div textarea {
  flex: 2;
  margin-right: 10px;
  text-align: center;
  border-radius: 5px;
  box-shadow: 1px 1px 3px 0px rgba(0, 0, 0, 1);
}
</style>
