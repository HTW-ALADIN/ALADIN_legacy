<template>
  <nav class="navigation">
    <div class="traverse backward" data-direction="backward" :data-to="previous" @click="navigate">
      <div class="validity">&#10004;</div>
      <p>&#9658;</p>
    </div>
    <div class="traverse forward" v-if="next" data-direction="forward" :data-to="next" @click="navigate">
      <div class="validity">&#33;</div>
      <p>&#9658;</p>
    </div>
  </nav>
</template>

<script lang="ts">
import { onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";

export default {
  props: {
    storeObject: Object,
  },
  setup(props) {
    const { getProperty, setProperty } = props.storeObject;
    const router = useRouter();
    const rootNode = getProperty("rootNode");
    const currentNode = computed(() => getProperty("currentNode"));
    const next = computed(() => {
      const edges = getProperty("edges")[currentNode.value];
      if (edges) return edges[0];
      return null;
    });
    const previous = computed(() => getProperty("previousNode"));

    const findPrevious = (to: number) => {
      const edges: { [id: number]: Array<number> } = getProperty("edges");

      const previousId = Object.entries(edges).reduce((previousId, [nodeId, toIds]) => {
        if (toIds.includes(to)) previousId = parseInt(nodeId);
        return previousId;
      }, -1);

      return previousId;
    };

    const componentValidities = computed(() => {
      const edges = getProperty("edges");
      if (edges && edges[currentNode.value]) {
        if (edges[currentNode.value].length > 1) return [true];
        const components = getProperty(`nodes__${currentNode.value}__components`);
        if (components) return Object.values(components).map((component: any) => component.isValid);
      }
      return [false];
    });

    const validate = (componentValidities) => {
      const navForwards: Array<HTMLElement> = Array.from(document.querySelectorAll(".traverse.forward"));
      navForwards.forEach((navForward) => {
        const validityElement: HTMLElement = navForward.querySelector(".validity");
        if (componentValidities.every((validity) => validity)) {
          navForward.classList.remove("inValid");
          validityElement.innerHTML = "&#10004;";
        } else if (validityElement) {
          navForward.classList.add("inValid");
          validityElement.innerHTML = "&#33;";
        }
      });
    };

    onMounted(() => {
      validate(componentValidities.value);
    });

    watch(componentValidities, (newValidities) => {
      validate(newValidities);
    });

    const navigate = (event) => {
      const navElement = event.currentTarget;
      const { direction, to } = navElement.dataset;

      const previousId = findPrevious(parseInt(to));

      if (!to && direction === "backward") {
        router.push({ name: "TaskOverview" });
      } else if (!Array.from(navElement.classList).includes("inValid")) {
        setProperty({ path: "previousNode", value: previousId });
        setProperty({ path: "currentNode", value: to });
      }
    };

    return { navigate, next, previous };
  },
};
</script>

<style scoped>
.navigation {
  position: absolute;
  width: 100px;
  height: 100px;
  bottom: 20px;
  left: 20px;
  display: flex;
  z-index: 3;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
}

.traverse {
  display: flex;
  width: 80%;
  height: 30%;
  align-items: center;
  justify-content: space-around;
  font-size: 20px;
  border: 1px solid black;
  background: #57636b;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  text-shadow: 1px 1px 1px #b1b2b4;
  font-weight: bold;
  cursor: auto;
  border-radius: 5px;
}

.traverse p {
  margin-right: auto;
  cursor: pointer;
  color: #f1ad2d;
}

.backward p {
  transform: rotate(270deg);
}

.forward p {
  transform: rotate(90deg);
}

.inValid p {
  opacity: 0.6;
  cursor: not-allowed;
}

.validity {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin-right: auto;
  width: 2vw;
  background: green;
}

.inValid .validity {
  background: red;
  cursor: auto;
}
</style>
