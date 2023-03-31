<template>
  <ContextMenu :componentId="id" :methods="selectedMethods" :storeObject="storeObject">
    <div class="planGraph">
      <DOTGraph :componentID="componentID" :storeObject="storeObject" />
    </div>
  </ContextMenu>
</template>

<script lang="ts">
import { onMounted, onUnmounted, computed } from "vue";
import DOTGraph from "@/components/taskComponents/DOTGraph.vue";
import ContextMenu from "@/components/taskComponents/mixins/ContextMenu.vue";
import { pollGraphRender } from "@/helpers/HelperFunctions";

export default {
  components: { DOTGraph, ContextMenu },
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { getProperty, setProperty } = props.storeObject;
    const currentNode = computed(() => getProperty("currentNode"));
    const path = `nodes__${currentNode.value}__components__${props.componentID}`;

    const dependencies = getProperty(`${path}__dependencies`);
    const dotGraph = computed(() => getProperty(dependencies.PlanGraph.dotDescription));

    const assignEventHandlers = () => {
      Array.from(document.querySelectorAll("g.node")).forEach((node) => {
        node.setAttribute("pointer-events", "visible");
        node.addEventListener("click", handleEdgeDrawing);
      });
    };

    onMounted(() => {
      pollGraphRender(".planGraph .node", assignEventHandlers);
      validate();
    });
    onUnmounted(() => {
      Array.from(document.querySelectorAll("g.node")).forEach((node) => node.removeEventListener("click", handleEdgeDrawing));
    });

    const handleEdgeDrawing = (event) => {
      const target = event.currentTarget;
      const activeNode = document.querySelector("g.node.active");

      if (activeNode) {
        activeNode.classList.remove("active");
        activeNode.setAttribute("stroke", "");
        Array.from(activeNode.querySelectorAll("polygon")).forEach((node: SVGPolygonElement) => node.setAttribute("stroke", "black"));

        const parentId = activeNode.id;
        const childId = target.id;
        const edge = `${parentId}:out -> ${childId}:in []`;
        const reverseEdge = `${childId}:out -> ${parentId}:in []`;
        if (parentId === childId || dotGraph.value.includes(reverseEdge)) return;

        if (dotGraph.value.includes(edge)) {
          setProperty({ path: dependencies.PlanGraph.dotDescription, value: dotGraph.value.replace(edge, "") });
          pollGraphRender(".planGraph .node", () =>
            Array.from(document.querySelectorAll("g.node")).forEach((node) => node.setAttribute("pointer-events", "visible"))
          );
        } else {
          setProperty({ path: dependencies.PlanGraph.dotDescription, value: dotGraph.value.replace("}", `${edge} \n }`) });
          pollGraphRender(".planGraph .node", () =>
            Array.from(document.querySelectorAll("g.node")).forEach((node) => node.setAttribute("pointer-events", "visible"))
          );
        }
      } else {
        target.classList.add("active");
        target.setAttribute("stroke", "red");
        Array.from(target.querySelectorAll("polygon")).forEach((node: SVGPolygonElement) => node.setAttribute("stroke", "red"));
      }
      validate();
    };

    const validate = () => {
      const solution = getProperty(dependencies.PlanGraph.validation);
      const expectedEdges = Array.from(solution.matchAll(/\d:out -> \d:in \[.*\]/g)).map((match) => match[0]);

      const userGraph = getProperty(dependencies.PlanGraph.dotDescription);
      const userEdges = Array.from(userGraph.matchAll(/\d:out -> \d:in \[.*\]/g)).map((match) => match[0]);
      const isValid = expectedEdges.every((edge) => userEdges.includes(edge)) && userEdges.every((edge) => expectedEdges.includes(edge));

      setProperty({
        path: `nodes__${currentNode.value}__components__${props.componentID}__isValid`,
        value: isValid,
      });
    };

    const methods = {
      showSolution: () => {
        const solution = getProperty(dependencies.PlanGraph.validation);
        setProperty({ path: dependencies.PlanGraph.dotDescription, value: solution });
        pollGraphRender(".planGraph .node", () =>
          Array.from(document.querySelectorAll("g.node")).forEach((node) => node.setAttribute("pointer-events", "visible"))
        );
        validate();
      },
    };
    const selectedMethods = () => {
      return Object.entries(getProperty(`nodes__${currentNode.value}__components__${props.componentID}__methods`)).reduce(
        (selectedMethods, [name, description]: [string, string]) => ({ ...selectedMethods, [description]: methods[name] }),
        {}
      );
    };

    return {
      selectedMethods: selectedMethods(),
      id: props.componentID,
    };
  },
};
</script>

<style scoped>
.planGraph {
  width: 100%;
  height: 100%;
}
</style>
