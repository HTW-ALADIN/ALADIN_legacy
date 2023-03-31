<template>
  <div class="replayOverview">
    <div class="replayList">
      <div class="header">
        <div>Task</div>
        <div>Duration</div>
        <div>Date</div>
        <div>Status</div>
      </div>
      <div class="list">
        <router-link class="replayListEntry" v-for="replay in replayList" :key="replay.hash" :to="`/replay/${replay.hash}`">
          <div class="replayTask">{{ replay.task }}</div>
          <div class="replayDuration">{{ (replay.duration / 1000 / 60).toFixed(2) }} Minuten</div>
          <div class="replayDate">{{ new Date(replay.date).toUTCString() }}</div>
          <div class="replayStatus">{{ replay.completion }}</div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { onMounted, ref } from "vue";
import axios from "axios";

export default {
  setup() {
    const replayList = ref({});
    onMounted(async () => {
      const response = await axios.post(`/api/fetchReplayOverview`, { user: "dummy" });
      replayList.value = JSON.parse(response.data).replayList;
    });
    return { replayList };
  },
};
</script>

<style scoped>
.replayOverview {
  display: flex;
  width: 100vw;
  height: 100vh;
  justify-content: center;
  align-items: center;
}

.replayList {
  display: flex;
  width: 80vw;
  height: 80vh;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  background: #b1b2b4;
  border-radius: 5px;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
}

.replayListEntry,
.header {
  display: flex;
  width: 95%;
  height: 50px;
  min-height: 50px;
  margin-bottom: 20px;
  padding: 10px 0;
  justify-content: space-around;
  align-items: center;
  background: #57636b;
  border-radius: 5px;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
}

.header {
  margin-top: 1vh;
  margin-bottom: 5vh;
  width: 98%;
  font-size: 30px;
}

.list {
  display: flex;
  width: 100%;
  height: 100%;
  max-height: 800px;
  overflow-y: scroll;
  flex-direction: column;
  align-items: center;
}

.replayListEntry div,
.header div {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #f1ad2d;
  padding: 10px;
  border-radius: 5px;
  background: #e8edf1;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  width: 20%;
  font-size: 20px;
  font-weight: bold;
  color: black;
}

.header div {
  font-size: 30px;
}

.replayListEntry {
  filter: brightness(100%);
  transition: 0.15s;
  text-decoration: none;
}

.replayListEntry:hover {
  filter: brightness(85%);
  transition: 0.15s;
  border: 1px solid #f1ad2d;
}
</style>
