<template>
  <div class="menu closed">
    <div class="menuBubble" @click="openCloseHandler" @clickout="closeHandler"><p>&#9776;</p></div>
    <div class="menuOptions">
      <div :class="`menu__option ${option.class}`" v-for="(option, i) in options" :key="i" @click="option.handler">
        <div class="menu__option--icon" v-html="option.icon"></div>
        <div class="menu__option--tooltip">{{ option.label }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useRouter } from "vue-router";
import stores from "@/helpers/TaskGraphUtility";
require("clickout-event");

export default {
  setup() {
    const taskStore = stores.taskStore;
    const { store } = taskStore;
    const router = useRouter();
    let isMenuOpen = false;

    const openCloseHandler = (event) => {
      const menuBubble = event.currentTarget;
      if (isMenuOpen === false) {
        menuBubble.parentNode.classList.remove("closed");
        menuBubble.parentNode.classList.add("open");
        menuBubble.querySelector("p").innerHTML = "&#10005;";
      } else {
        menuBubble.parentNode.classList.remove("open");
        menuBubble.parentNode.classList.add("closed");
        menuBubble.querySelector("p").innerHTML = "&#9776;";
      }

      isMenuOpen = !isMenuOpen;
    };

    const closeHandler = () => {
      const menuBubble = document.querySelector(".menu");
      menuBubble.classList.add("closed");
      menuBubble.classList.remove("open");
      menuBubble.querySelector("p").innerHTML = "&#9776;";
      isMenuOpen = false;
    };

    const options = [
      {
        label: "Home",
        icon: "&#127968;",
        class: "home",
        handler: () => {
          router.push({ name: "TaskOverview" });
        },
      },
      {
        label: "Settings",
        icon: "&#9881;",
        class: "settings",
        handler: () => {
          router.push({ name: "Settings" });
        },
      },
      {
        label: "Statistic",
        icon: "&#128202;",
        class: "statistics",
        handler: () => {
          router.push({ name: "Statistic" });
        },
      },
      {
        label: "Save replay",
        icon: "&#128190;",
        class: "replay",
        handler: () => {
          store.dispatch("storeReplay");
        },
      },
    ];

    return { openCloseHandler, options, closeHandler };
  },
};
</script>

<style scoped>
.menuBubble {
  position: absolute;
  width: 10vw;
  height: 10vw;
  top: -5vw;
  left: -5vw;
  background: linear-gradient(90deg, #57636b, #40494f);
  border-radius: 50%;
  z-index: 6;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  cursor: pointer;
  text-shadow: 2px 2px black;
  transition: all 1s ease;
}

.menuBubble:hover {
  filter: brightness(85%);
  transition: all 1s ease;
}

.menuBubble > p {
  position: relative;
  top: 5vw;
  left: 5.5vw;
  color: #f1ad2d;
  font-size: 50px;
  box-shadow: inset 0 -7px 5px -7px rgba(0, 0, 0, 0);
}

.menuOptions {
  position: absolute;
  top: 0vh;
  left: 0vh;
  height: 0vh;
  width: 0vw;
  z-index: 5;
  transition-delay: 0.1s;
  transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.open .menuOptions {
  position: absolute;
  width: 20vw;
  height: 20vh;
  display: block;
}

.menu__option {
  top: 0;
  left: 0;
  position: absolute;
  display: flex;
  font-size: 1vw;
  cursor: pointer;
  border-radius: 50%;
  border: 2px solid #f1ad2d;
  background: #57636b;
  width: 0vw;
  height: 0vw;
  align-items: center;
  justify-content: center;
  z-index: 3;
  box-shadow: 2px 3px 4px 0px rgba(0, 0, 0, 1);
  transition-delay: 0.1s;
  transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.open .menu__option {
  width: 2vw;
  height: 2vw;
}

.open .home {
  top: 1vh;
  left: 6.5vw;
}

.open .settings {
  top: 6vh;
  left: 5.5vw;
  font-size: 1.5vw;
}

.open .statistics {
  top: 9.5vh;
  left: 3.5vw;
}

.open .replay {
  top: 12vh;
  left: 1vw;
}

.open .menu__option--tooltip {
  display: none;
}

.menu__option:hover .menu__option--tooltip {
  display: block;
  position: absolute;
  top: 3vw;
  left: 4vw;
}
</style>
