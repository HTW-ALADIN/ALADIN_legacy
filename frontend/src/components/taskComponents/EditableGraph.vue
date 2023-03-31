<template>
  <ContextMenu :componentId="id" :methods="selectedMethods" :storeObject="storeObject">
    <div class="editableGraph">
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
    const currentNode = getProperty("currentNode");
    const path = `nodes__${currentNode}__components__${props.componentID}`;
    const dependencies = getProperty(`${path}__dependencies`);

    const userValues = computed(() => getProperty(`${path}__component__userValues`));
    if (!userValues.value)
      setProperty({ path: `${path}__component__userValues`, value: [...getProperty(dependencies.EditableGraph.validation)] });

    const editSVGText = (event) => {
      const target = event.target;
      const propertyNode = target.parentElement.parentElement;
      const node = propertyNode.parentElement.parentElement;
      const nodeProperty = propertyNode.getAttribute("id").split("_").pop().trim();
      const nodeId = node.getAttribute("id").split("_").pop().trim();

      const input = document.createElement("input");
      input.style.textAlign = "right";
      input.style.width = "20px";
      input.value = target.textContent;
      input.onkeyup = (event) => {
        const input = (event.target as unknown) as HTMLInputElement;
        if (["Enter", "Escape"].includes(event.key)) {
          input.blur();
          return;
        }
        // TODO eventually shift logic into deep watcher, to make replays possible
        target.textContent = input.value;
        setProperty({ path: `${path}__component__userValues__${nodeId}__${nodeProperty}`, value: input.value });
      };
      input.onblur = () => {
        foreignObject.remove();
        validate();
      };

      const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
      foreignObject.setAttribute("width", "100%");
      foreignObject.setAttribute("height", "100%");
      foreignObject.setAttribute("y", `${target.getAttribute("y") - 15}`);
      foreignObject.setAttribute("x", target.getAttribute("x"));
      foreignObject.append(input);

      const svg = target.parentNode;
      svg.append(foreignObject);

      input.select();
    };

    const editableFields = getProperty(`${path}__component__editableFields`);
    const selectors = editableFields.map((field) => `g.node g[id="a_${field}"] text`);
    const assignEventHandlers = () => {
      Array.from(document.querySelectorAll(selectors)).forEach((node) => {
        node.setAttribute("pointer-events", "visible");
        node.addEventListener("click", editSVGText);
      });
    };

    onMounted(() => {
      pollGraphRender(".editableGraph .node", assignEventHandlers);
      pollGraphRender(".editableGraph .node", validate);
    });
    onUnmounted(() => {
      Array.from(document.querySelectorAll(selectors)).forEach((node) => node.removeEventListener("click", editSVGText));
    });

    const validate = () => {
      const nodes = getProperty(dependencies.EditableGraph.validation);
      const isValid = nodes.every((node) => {
        const { id } = node;
        // TODO make editableFields Array of keys again and create replica of nodes for userValue to record changes in VUEX state and add node id to handler
        // create deep watcher to extract the changed key<->value in new/old Value of watcher
        // move assignment logic of textfield from the editSVGText-handler to watcher
        return editableFields.every((field) => {
          const correctValue = node[field];
          const userValue = document.querySelector(`g.node[id="${id}"] g[id="a_${field}"] text`).textContent.trim();
          return userValue == correctValue;
        });
      });

      setProperty({
        path: `${path}__isValid`,
        value: isValid,
      });
    };

    const methods = {
      showSolution: () => {
        // manually remove old svg, since foreignObjects might cause issues with the rerender
        Array.from(document.querySelectorAll(selectors)).forEach((node) => node.removeEventListener("click", editSVGText));
        const svg = document.querySelector(".dotGraph svg");
        const dotGraph = getProperty(dependencies.DOTGraph.dotDescription);
        const solution = getProperty(dependencies.EditableGraph.solution);
        if (svg && dotGraph != solution) document.querySelector(".dotGraph").removeChild(svg);

        setProperty({ path: dependencies.DOTGraph.dotDescription, value: solution });

        pollGraphRender(".editableGraph .node", assignEventHandlers);
        setProperty({
          path: `${path}__isValid`,
          value: true,
        });
      },
    };
    const selectedMethods = () => {
      return Object.entries(getProperty(`${path}__methods`)).reduce(
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
.editableGraph {
  width: 100%;
  height: 100%;
}
</style>
