<template>
  <div class="hint" v-if="hints.descriptions.length" @clickout="closeHandler">
    <img class="lightBulb off" :src="lightBulbSource" @click="lightSwitch" />

    <div class="hintText closed">
      <div class="hintNavigation">
        <div class="backward" v-if="hints.descriptions.length > 1" @click="hintHandler" data-direction="backward">&#60;</div>
        <div class="display">{{ hints.current + 1 }}/{{ hints.descriptions.length }}</div>
        <div class="forward" v-if="hints.descriptions.length > 1" @click="hintHandler" data-direction="forward">&#62;</div>
      </div>
      <p v-html="hints.descriptions[hints.current]"></p>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed } from "vue";

export default {
  name: "Hint",
  props: { storeObject: Object },
  setup(props) {
    const { store, getProperty, setProperty } = props.storeObject;
    const currentNode = store.state.currentNode;

    const hints = computed(() => {
      const hints: { active: boolean; current: number; descriptions: Array<string> } = getProperty(`nodes__${currentNode}__hints`);
      if (!hints) return { active: false, current: 0, descriptions: [] };
      return hints;
    });

    let lightBulbSource = ref("/img/lightbulb.png");

    const lightSwitch = (event) => {
      const lightBulb = event.target;
      const textBox = lightBulb.parentNode.querySelector(".hintText");
      if (Array.from(lightBulb.classList).includes("on")) {
        lightBulb.classList.remove("on");
        lightBulbSource.value = "/img/lightbulb.png";
        textBox.classList.add("closed");
        setProperty({ path: `nodes__${currentNode}__hints__active`, value: hints.value.active });
      } else {
        lightBulb.classList.add("on");
        lightBulbSource.value = "/img/lightbulb_on.png";
        textBox.classList.remove("closed");
        setProperty({ path: `nodes__${currentNode}__hints__active`, value: hints.value.active });
      }
    };

    const hintHandler = (event) => {
      const navElement = event.currentTarget;
      const { direction } = navElement.dataset;

      let newHintIndex;
      if (direction === "forward") {
        if (hints.value.current >= hints.value.descriptions.length - 1) newHintIndex = hints.value.descriptions.length - 1;
        else newHintIndex = hints.value.current + 1;
      } else {
        if (hints.value.current <= 0) newHintIndex = 0;
        else newHintIndex = hints.value.current - 1;
      }

      setProperty({ path: `nodes__${currentNode}__hints__current`, value: newHintIndex });
    };

    const closeHandler = () => {
      if (!document.querySelector(".lightBulb.on")) return;
      document.querySelector(".lightBulb.on").classList.remove("on");
      document.querySelector(".hintText").classList.add("closed");
      lightBulbSource.value = "/img/lightbulb.png";
    };

    return {
      hints,
      lightBulbSource,
      lightSwitch,
      hintHandler,
      closeHandler,
    };
  },
};
</script>

<style scoped>
.hint {
  position: absolute;
  right: 30px;
  top: 15px;
  z-index: 6;
  display: flex;
  min-width: 100px;
  min-height: 100px;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  cursor: default;
}

.lightBulb {
  width: 50px;
  height: 50px;
  padding: 5px;
  cursor: pointer;
  border-radius: 50%;
  background: #57636b;
  border: 1px solid black;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
}

.hintText.closed {
  opacity: 0;
  max-height: 0px;
  max-width: 0px;
  transition: all 0.7s ease;
}

.hintText {
  opacity: 1;
  display: flex;
  flex-direction: column;
  margin-top: 15px;
  max-height: 500px;
  max-width: 350px;
  height: 500px;
  width: 350px;
  justify-content: space-around;
  align-items: center;
  border-radius: 5px;
  background: #57636b;
  border: 1px solid black;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  transition: all 0.7s ease;
}

.hintNavigation {
  display: flex;
  width: 90%;
  justify-content: space-around;
  align-items: center;
}

.hintNavigation {
  font-size: 30px;
  font-weight: bolder;
  color: #f1ad2d;
  text-shadow: 2px 2px 1px black;
}

.hintNavigation .forward,
.hintNavigation .backward {
  text-align: center;
  cursor: pointer;
  border: 1px solid black;
  box-shadow: 1px 2px 6px 0px rgba(0, 0, 0, 1);
  width: 40px;
  height: 30px;
  margin: 10px;
  background: #57636b;
}

.hintNavigation .backward:hover,
.hintNavigation .forward:hover {
  transform: scale(1.05);
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  transition: all 0.2s ease;
}

.hintText p {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 370px;
  width: 290px;
  border-radius: 5px;
  background: #b1b2b4;
  border: 1px solid black;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  color: #57636b;
  font-size: 25px;
  overflow-y: scroll;
  padding: 30px 10px 0px;
  text-align: center;
}

/*scrollbar*/
::-webkit-scrollbar {
  width: 10px;
}
/* Track */
::-webkit-scrollbar-track {
  background: #888;
}
/* Handle */
::-webkit-scrollbar-thumb {
  background: #57636b;
}
/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
