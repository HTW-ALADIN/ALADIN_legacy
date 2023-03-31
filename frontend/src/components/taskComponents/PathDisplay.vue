<template>
  <div class="pathDisplay">
    <div class="path" v-for="(path, i) in selectedPath" :key="i">
      <div v-for="(element, j) in path" :key="j">
        <div v-if="element.hasOwnProperty('label')" class="node">
          <div class="label">
            {{ element.label }}
          </div>
          <div class="value">
            {{ element.value }}
          </div>
        </div>
        <div v-else class="edge">
          <div class="weight">{{ element.weight }}</div>
          <div class="arrow">&zigrarr;</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { onMounted, computed } from "vue";

export default {
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { getProperty } = props.storeObject;
    const currentNode = computed(() => getProperty("currentNode"));
    const path = `nodes__${currentNode.value}__components__${props.componentID}`;

    const dependencies = getProperty(`${path}__dependencies`);
    const nodes: object = getProperty(dependencies.PathDisplay.nodes);
    const nodesById = Object.values(nodes).reduce((nodes, node) => {
      if (Object.keys(node).includes("label")) nodes[node.label] = node;
      return nodes;
    }, {});
    const selectedPaths = computed(() => getProperty(dependencies.PathDisplay.selectedPaths));
    const selectedPath = computed(() => {
      const paths = getProperty(dependencies.PathDisplay.selectedPaths);
      return paths.reduce((transformedPaths, path) => {
        const transformedPath = path.reduce((transformedPath, edge, i) => {
          if (i === 0) transformedPath.push({ label: edge.between[0], value: nodes[edge.between[0]].value });
          transformedPath.push({ weight: edge.weight });
          transformedPath.push({ label: edge.between[1], value: nodes[edge.between[1]].value });
          return transformedPath;
        }, []);
        return [...transformedPaths, transformedPath];
      }, []);
    });

    return { selectedPaths, selectedPath, nodes };
  },
};
</script>

<style scoped>
.pathDisplay {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  font-size: 3vh;
}

.path {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  border: 1px solid black;
  border-radius: 5px;
}

.edge {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.arrow {
  transform: scaleX(1);
  width: 100%;
}

.node {
  display: flex;
  flex-direction: column;
}
.node .value {
  border-radius: 50%;
  border: 1px solid black;
  text-align: center;
}
</style>
