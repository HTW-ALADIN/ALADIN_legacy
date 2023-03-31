<template>
  <div class="traversal">
    <DOTGraph :componentID="componentID" :storeObject="storeObject" />
  </div>
</template>

<script lang="ts">
import { onMounted, computed } from "vue";
import DOTGraph from "@/components/taskComponents/DOTGraph.vue";
import { isEqualArrayContent } from "@/helpers/HelperFunctions.ts";

export default {
  components: { DOTGraph },
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    // TODO refactor component and remove implicit side effects/pass arguments explicitly

    const { getProperty, setProperty } = props.storeObject;
    const currentNode = getProperty("currentNode");
    const path = `nodes__${currentNode}__components__${props.componentID}`;

    const dependencies = getProperty(`${path}__dependencies`);
    const dependency = computed(() => {
      const paths = getProperty(dependencies.VisualGraphTraversal.paths);

      const reverseEdges = /dir="back"/.test(getProperty(dependencies.VisualGraphTraversal.dotDescription));

      const nodesById: object = getProperty(dependencies.VisualGraphTraversal.nodes);
      const nodes = Object.values(nodesById).reduce((nodes, node) => {
        if (Object.keys(node).includes("label")) nodes[node.label] = node;
        return nodes;
      }, {});

      const edgeCount = paths.reduce((edgeCount, path) => {
        path.forEach((edge) => {
          const edgeString = `${edge.between}`;
          if (Object.keys(edgeCount).includes(edgeString)) edgeCount[edgeString] += 1;
          else edgeCount[edgeString] = 1;
        });
        return edgeCount;
      }, {});
      const reoccurringEdges = Object.entries(edgeCount)
        .filter(([edge, count]) => count > 1)
        .reduce((reoccurringEdges, [edge, count]) => ({ ...reoccurringEdges, [edge]: count }), {});

      return { nodes, paths, reoccurringEdges, reverseEdges };
    });

    const colorCoding = getProperty(`${path}__component__colorCoding`);
    const selectedPaths = computed(() => getProperty(`${path}__component__selectedPaths`));

    onMounted(() => {
      let edges = document.querySelectorAll(".traversal .edge");
      const pollGraph = setInterval(() => {
        edges = document.querySelectorAll(".traversal .edge");

        if (edges.length) {
          clearInterval(pollGraph);
          Array.from(edges).forEach((edge) => edge.addEventListener("click", handleSelectedPath));
        }
      }, 500);
    });

    let currentPaths = [];
    let completedCount = 0;
    const handleSelectedPath = (event) => {
      const { paths, reoccurringEdges, reverseEdges } = dependency.value;
      let nodes = Object.values(dependency.value.nodes) as Array<any>;
      const edge = event.currentTarget;
      const { complete, parentNode, childNode, weight } = unwrapEdgeElement(edge);

      if (Array.from(edge.classList).includes("complete")) return;

      // find all possible paths from selected edges
      let possiblePaths = [];
      if (currentPaths.length) {
        possiblePaths = checkPossiblePaths([nodes[parentNode].id, nodes[childNode].id], currentPaths);
      }
      // if first selected edge or selecting edge not connected to previous path
      if (!possiblePaths.length || !currentPaths.length) {
        const selectedEdgeElements = Array.from(document.querySelectorAll(".edge.selected"));
        selectedEdgeElements.forEach((selectedEdgeElement) => {
          selectedEdgeElement.classList.remove("selected");
        });
        colorCodePaths(colorCoding.standard, selectedEdgeElements);
        possiblePaths = checkPossiblePaths([nodes[parentNode].id, nodes[childNode].id], paths);
      }

      // check if path is complete
      edge.classList.add("selected");
      const selectedEdgeElements = Array.from(document.querySelectorAll(".edge.selected"));
      if (isPathComplete(selectedEdgeElements, possiblePaths, nodes)) {
        colorCodePaths(colorCoding.completed, selectedEdgeElements);
        selectedEdgeElements.forEach((selectedEdgeElement) => {
          const { parentNode, childNode } = unwrapEdgeElement(selectedEdgeElement);
          const key = reverseEdges ? `${[nodes[childNode].id, nodes[parentNode].id]}` : `${[nodes[parentNode].id, nodes[childNode].id]}`;
          if (Object.keys(reoccurringEdges).includes(key) && reoccurringEdges[key] != 0) {
            reoccurringEdges[key] -= 1;
            if (reoccurringEdges[key] === 0) {
              selectedEdgeElement.classList.remove("partial");
              selectedEdgeElement.classList.add("complete");
            } else {
              selectedEdgeElement.classList.add("partial");
              selectedEdgeElement.classList.remove("complete");
              colorCodePaths(colorCoding.partial, [selectedEdgeElement]);
            }
            selectedEdgeElement.classList.remove("selected");
          } else {
            selectedEdgeElement.classList.remove("selected");
            selectedEdgeElement.classList.add("complete");
          }
        });
        persistSelectedPaths(selectedEdgeElements, reverseEdges);
        completedCount += 1;

        currentPaths = [];
      } else if (!Array.from(edge.classList).includes("complete")) {
        persistSelectedPaths(selectedEdgeElements, reverseEdges);

        colorCodePaths(colorCoding.selected, [edge]);
        currentPaths = possiblePaths;
      }
    };

    const persistSelectedPaths = (selectedEdgeElements, reverseEdges) => {
      const newPath = selectedEdgeElements.map((selectedEdgeElement) => {
        const { parentNode, childNode, weight } = unwrapEdgeElement(selectedEdgeElement);
        return translateEdge(parentNode, childNode, weight, reverseEdges);
      });

      if (completedCount === selectedPaths.value.length) {
        setProperty({ path: `${path}__component__selectedPaths`, value: [...selectedPaths.value, newPath] });
      } else {
        const newSelectedPaths = [...selectedPaths.value.slice(0, selectedPaths.value.length - 1), newPath];
        setProperty({ path: `${path}__component__selectedPaths`, value: newSelectedPaths });
      }
    };

    const translateEdge = (parent, child, weight, reverseEdges) => {
      const between = reverseEdges ? [child, parent] : [parent, child];
      return { between, weight };
    };

    const checkPossiblePaths = (selectedEdge, paths) => {
      return paths.reduce((possiblePaths, path) => {
        const containsEdge = path.some((edge) => isEqualArrayContent(selectedEdge, edge.between));
        if (containsEdge) possiblePaths.push(path);
        return possiblePaths;
      }, []);
    };

    const colorCodePaths = (color, edgeElements) => {
      edgeElements.forEach((edgeElement) => {
        edgeElement.querySelector("path").setAttribute("stroke", color);
        edgeElement.querySelector("polygon").setAttribute("fill", color);
        edgeElement.querySelector("polygon").setAttribute("stroke", color);
      });
    };

    const unwrapEdgeElement = (edgeElement) => {
      const { reverseEdges } = dependency.value;
      // path is encoded in the nested title element with the shape of eg. "A1->A2"
      let [complete, parentNode, childNode] = edgeElement.querySelector("title").textContent.match(/(.*)->(.*)/);
      if (reverseEdges) {
        const temp = childNode;
        childNode = parentNode;
        childNode = temp;
      }
      const weight = edgeElement.querySelector("text").textContent;
      return { complete, parentNode, childNode, weight };
    };

    const isPathComplete = (edgeElements, possiblePaths, nodes) => {
      if (possiblePaths.length != 1) return false;
      const possiblePath = possiblePaths[0];
      if (possiblePath.length != edgeElements.length) return false;
      return edgeElements.every((edgeElement) => {
        const { complete, parentNode, childNode, weight } = unwrapEdgeElement(edgeElement);
        return !!checkPossiblePaths([nodes[parentNode].id, nodes[childNode].id], possiblePaths).length;
      });
    };

    return {};
  },
};
</script>

<style scoped>
.traversal {
  width: 100%;
  height: 100%;
}
</style>

<style>
.traversal .edge {
  cursor: pointer;
}

.traversal .edge.complete {
  cursor: default;
}

.traversal .edge.complete.partial {
  cursor: pointer;
}
</style>
