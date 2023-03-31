<template>
  <div class="folderTabs">
    <div class="tab" @click="clickHandler" v-for="(tab, i) in tabs" :key="i">
      <div class="title">
        <h2>{{ tab.title }}</h2>
      </div>
      <div class="content">
        <p>{{ tab.description }}</p>
        <img v-if="tab.image" :src="tab.image" />
        <Button :label="'Enter'" :data="tab.data" :callback="tab.handler" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Button from "@/components/Button.vue";
export default {
  name: "FolderTabs",
  props: {
    tabs: Object,
  },
  components: { Button },
  setup(props) {
    const clickHandler = (event) => {
      const tab: HTMLElement = event.currentTarget;
      const previouslyActive: HTMLElement = document.querySelector(".active.tab");
      if (previouslyActive) previouslyActive.classList.remove("active");
      if (tab != previouslyActive) tab.classList.add("active");
    };
    return { clickHandler };
  },
};
</script>

<style scoped>
.folderTabs {
  display: flex;
  min-height: 100vh;
  max-height: 100vh;
}

.tab {
  flex: 1;
  display: flex;
  align-items: stretch;
  background: #57636b;
  cursor: pointer;
  transition: all 1s ease;
}

.tab:hover {
  filter: brightness(85%);
}

.tab.active:hover {
  filter: brightness(100%);
}

.tab.active {
  flex: 20;
  background: #e8edf1;
  cursor: default;
}

.title {
  flex: 5;
  display: flex;
  align-items: center;
  width: 100%;
  text-align: center;
}
h2 {
  color: #f1ad2d;
  width: 100%;
  height: 25vh;
  min-width: 15vw;
  transform: rotate(-90deg);
  white-space: nowrap;
  transition: all 0.5s 0.2s ease-out;
}
.active h2 {
  color: #57636b;
  transform: rotate(0deg);
  height: 5vh;
  transition: all 0.5s 0.2s ease-out;
  font-size: 40px;
}

.content {
  flex: 1;
  display: flex;
  justify-content: space-around;
  align-items: center;
  opacity: 0;
  transition: all 0.4s 0.3s ease-out;
}
.active .content {
  flex: 18;
  opacity: 1;
  transform: scaleX(1);
  color: #57636b;
}
.content p {
  width: 20vw;
  padding: 15px;
  border-radius: 5px;
  font-size: 20px;
  text-align: justify;
  background: #b1b2b4;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
}
.content img {
  border-radius: 5px;
  border: 1px solid #57636b;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  width: 20vw;
  height: auto;
}
</style>
