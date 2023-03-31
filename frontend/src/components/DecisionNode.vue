<template>
  <div class="branches">
    <div class="traverse backward" :data-to="previous" @click="navigateBackwards">
      <p>&#9658;</p>
    </div>
    <FolderTabs :tabs="tabs"></FolderTabs>
  </div>
</template>

<script lang="ts">
import FolderTabs from "@/components/FolderTabs.vue";
import { onMounted, computed } from "vue";
import { useRouter } from "vue-router";

export default {
  components: { FolderTabs },
  props: { storeObject: Object },
  setup(props) {
    const router = useRouter();

    const { getProperty, setProperty } = props.storeObject;
    const currentNode = getProperty("currentNode");
    const pathDescriptions: { [key: string]: { title: string; image: string; description: string } } = getProperty(
      `nodes__${currentNode}__pathDescriptions`
    );

    const previous = computed(() => getProperty("previousNode"));

    const findPrevious = (to: number) => {
      const edges: { [id: number]: Array<number> } = getProperty("edges");

      const previousId = Object.entries(edges).reduce((previousId, [nodeId, toIds]) => {
        if (toIds.includes(to)) previousId = parseInt(nodeId);
        return previousId;
      }, -1);

      return previousId;
    };

    const navHandler = (event) => {
      // fadeOut backNavButton when navigating forward
      document.querySelector(".traverse.backward").classList.add("fadeOut");

      const button: HTMLElement = event.target;
      const nodeId = button.dataset.id;
      setProperty({ path: "previousNode", value: currentNode });
      setProperty({ path: "currentNode", value: nodeId });
    };

    const navigateBackwards = (event) => {
      const navElement = event.currentTarget;

      navElement.classList.add("fadeOut");

      const { to } = navElement.dataset;
      const previousId = findPrevious(parseInt(to));

      if (!to) {
        router.push({ name: "TaskOverview" });
      } else {
        setProperty({ path: "previousNode", value: previousId });
        setProperty({ path: "currentNode", value: to });
      }
    };

    const tabs = Object.entries(pathDescriptions).map(([nodeId, pathDescription]) => {
      return { data: { value: nodeId, name: "id" }, handler: navHandler, ...pathDescription };
    });

    return { tabs, previous, navigateBackwards };
  },
};
</script>

<style scoped>
.decisions {
  display: flex;
  flex-direction: row;
  justify-items: space-evenly;
  align-items: center;
  width: 100vw;
  height: 100vh;
}

.branch {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 1px dotted black;
  z-index: 2;
}

.traverse {
  position: absolute;
  z-index: 999;
  bottom: 40px;
  left: 40px;
  display: flex;
  width: 40px;
  height: 30px;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 1px solid black;
  background: #57636b;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  text-shadow: 1px 1px 1px #b1b2b4;
  font-weight: bold;
  cursor: auto;
  border-radius: 5px;
  opacity: 1;
}

.fadeOut {
  opacity: 0;
  transition: all 0.1s;
}

.traverse p {
  color: #f1ad2d;
}

.backward p {
  cursor: pointer;
  transform: rotate(270deg);
}
</style>
