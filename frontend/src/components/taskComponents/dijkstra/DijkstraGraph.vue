<template>
  <div class="dijkstraGraph">
    <DOTGraph :componentID="componentID" :storeObject="storeObject" />
  </div>
</template>

<script lang="ts">
import { onMounted, computed } from "vue";
import DOTGraph from "@/components/taskComponents/DOTGraph.vue";

export default {
  components: { DOTGraph },
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { getProperty, setProperty } = props.storeObject;
    const currentNode = computed(() => getProperty("currentNode"));
    const path = `nodes__${currentNode.value}__components__${props.componentID}`;

    const dependencies = getProperty(`${path}__dependencies`);
    const controlObject = computed(() => getProperty(dependencies.DijkstraGraph.controlObject));
    const generatedNodes = computed(() => getProperty(dependencies.DijkstraGraph.nodes));

    const colorCoding = getProperty(`${path}__component__colorCoding`);

    onMounted(() => {
      let nodes = document.querySelectorAll(".dijkstraGraph .node");
      const pollGraph = setInterval(() => {
        nodes = document.querySelectorAll(".dijkstraGraph .node");

        if (nodes.length) {
          clearInterval(pollGraph);
          Array.from(nodes).forEach((node) => node.addEventListener("click", handleSelectedNode));
        }
      }, 500);
    });

    const handleSelectedNode = (event) => {
      const { queue, done, chosen, successor } = controlObject.value;
      const selectedNode = event.currentTarget;
      const selectedId = parseInt(selectedNode.querySelector("title").textContent);

      if (!queue.includes(selectedId)) return;

      const activeNode = document.querySelector('ellipse[fill="red"]').parentNode;
      assignStep(controlObject.value, selectedId, activeNode);

      const succesorNodes = Array.from(document.querySelectorAll(".node title"))
        .filter((node) => successor.includes(parseInt(node.textContent)))
        .map((node) => node.parentNode);

      colorCodeNodes(colorCoding["done"], [activeNode]);
      colorCodeNodes(colorCoding["chosen"], [selectedNode]);
      //   colorCodeNodes(colorCoding["successor"], succesorNodes);
    };

    const assignStep = (controlObject, selectedId, activeNode) => {
      const { queue, done, chosen, successor } = controlObject;

      const doneNode = parseInt(activeNode.querySelector("title").textContent);
      const newNeighbours = generatedNodes.value[selectedId].neighbours.filter(
        (id) => !done.includes(id) && !successor.includes(id) && !queue.includes(id)
      );
      const newSuccessors = [...generatedNodes.value[selectedId].neighbours];
      const filteredQueue = [...queue.filter((id) => id !== selectedId), ...newNeighbours];
      const orderedQueue = filteredQueue.sort();

      setProperty({ path: `${dependencies.DijkstraGraph.controlObject}__chosen`, value: [selectedId] });
      setProperty({ path: `${dependencies.DijkstraGraph.controlObject}__done`, value: [...done, doneNode] });
      setProperty({ path: `${dependencies.DijkstraGraph.controlObject}__successor`, value: newSuccessors });
      setProperty({ path: `${dependencies.DijkstraGraph.controlObject}__queue`, value: filteredQueue });
    };

    const colorCodeNodes = (color, nodeElements) => {
      nodeElements.forEach((node) => {
        node.querySelector("ellipse").setAttribute("stroke", color);
        node.querySelector("ellipse").setAttribute("fill", color);
      });
    };

    return {};
  },
};
</script>

<style scoped>
.dijkstraGraph {
  width: 100%;
  height: 100%;
}
</style>
