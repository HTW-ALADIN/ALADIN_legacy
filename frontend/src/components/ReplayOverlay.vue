<template>
  <div class="replayOverlay">
    <img class="fakeCursor" src="/img/fake_cursor.png" />
    <div class="replay" @mouseenter="fadeControlsIn" @mouseleave="fadeControlsOut">
      <div class="progressBar" @click="jumpHandler">
        <div class="progress"></div>
        <div :class="`marker__${i} marker`" :style="placeMarker(i)" v-for="(marker, i) in replayGraph.steps" :key="marker.timestamp">|</div>
      </div>
      <div class="controlElements">
        <Button class="playButton" :callback="startStopHandler" :label="'&#9658;'" />
        <Button class="enterButton" :callback="enterTask" :label="'&#128498;'" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, watch, onMounted } from "vue";
import Button from "@/components/Button.vue";
import { useRouter } from "vue-router";
export default {
  name: "ReplayOverlay",
  props: {
    replayStore: Object,
    taskStore: Object,
  },
  components: { Button },
  setup(props) {
    const router = useRouter();

    const { store, getProperty, setProperty } = props.replayStore;
    const replayGraph = computed(() => {
      const replay = getProperty("taskReplay");
      if (!replay) return {};
      return replay;
    });

    const barSize = window.innerWidth * 0.6 * 0.95;
    const barOffset = window.innerWidth * 0.215;

    const calcDuration = (replayGraph) => {
      const times = { start: new Date().getTime(), duration: 0, end: 0 };
      Object.values(replayGraph).forEach((events: Array<any>) => {
        if (!events.length) return;
        const firstEvent = events[0].timestamp;
        const lastEvent = events[events.length - 1].timestamp;
        if (firstEvent < times.start) times.start = firstEvent;
        if (lastEvent > times.end) times.end = lastEvent;
      });

      times.duration = times.end - times.start;
      return times;
    };

    const segmentMouse = (replayGraph, start) => {
      const { mouse } = replayGraph;
      let previous = start;
      let segment = [];
      const segments = mouse.reduce((segments, event) => {
        const { timestamp } = event;
        if (timestamp - previous <= 50) {
          segment.push(event);
        } else {
          segments[previous] = segment;
          segment = [event];
        }
        previous += 50;
        return segments;
      }, {});
      return segments;
    };
    let start, duration, end;
    let current = start;
    let mouseSegments = {};
    watch(replayGraph, (newReplayGraph) => {
      setProperty({ path: "currentTask", value: newReplayGraph.steps[0].value });

      ({ start, duration, end } = calcDuration(newReplayGraph));
      mouseSegments = segmentMouse(newReplayGraph, start);
      current = start;
    });

    const placeMarker = (i) => {
      const timestamp = replayGraph.value.steps[i].timestamp;
      const difference = timestamp - start;
      const percentage = difference / duration;
      const position = percentage * barSize;
      return { left: `${position}px` };
    };

    const applyMouse = (timestamp: number, jump: boolean = false) => {
      const cursor: HTMLElement = document.querySelector(".fakeCursor");
      const { mouse } = replayGraph.value;
      if (jump) {
        const movements = mouse.filter((event) => event.timestamp < timestamp);
        if (movements.length) {
          const { x, y } = movements[movements.length - 1];
          cursor.style.transform = `translate(${x}px, ${y}px)`;
        }
        return;
      }
      if (timestamp in mouseSegments) {
        mouseSegments[timestamp].forEach((event) => {
          const { x, y } = event;
          cursor.style.transform = `translate(${x}px, ${y}px)`;
        });
      }
    };

    // baseCoordinates are set when the play button is first clicked
    let baseCoordinates = { x: 5000, y: 5000 };
    const applyPanning = (timestamp) => {
      if (baseCoordinates) {
        const { x, y } = baseCoordinates;

        const events = replayGraph.value.panning.filter((event) => event.timestamp < timestamp && event.timestamp > current);

        events.forEach((event) => {
          const relativeX = Math.abs(x) - Math.abs(event.x);
          const relativeY = Math.abs(y) - Math.abs(event.y);
          window.panzoom.pan(relativeX, relativeY, { relative: true, animate: true });
          baseCoordinates = window.panzoom.getPan();
        });
      }
    };

    const applyZooming = (timestamp) => {
      const events = replayGraph.value.zooming.filter((event) => event.timestamp < timestamp && event.timestamp > current);
      events.forEach((zoomEvent) => {
        let { scale, x, y } = zoomEvent;
        window.panzoom.zoomToPoint(scale, { clientX: x, clientY: y }, { animate: true });
      });
    };

    const applyEvents = (timestamp: number) => {
      let events = [];
      if (timestamp < current) {
        store.dispatch("clearState");
        events = replayGraph.value.steps.filter((event) => event.timestamp < timestamp);
      } else {
        events = replayGraph.value.steps.filter((event) => event.timestamp < timestamp && event.timestamp > current);
      }
      events.forEach((event) => {
        const { path, value } = event;
        setProperty({ path, value });
      });
    };

    const convertPxToTimestamp = (px: number): number => {
      const timestamp = (px / barSize) * duration + start;
      return timestamp;
    };

    const jumpHandler = (event) => {
      const progressBar = event.currentTarget;
      const progress = progressBar.firstChild;
      const clickPosition = event.pageX - barOffset;
      progress.style.width = `${clickPosition}px`;
      const timestamp = convertPxToTimestamp(clickPosition);
      current = timestamp;
      mouseSegments = segmentMouse(replayGraph.value, timestamp);
      applyEvents(timestamp);
      applyMouse(timestamp, true);
      applyPanning(timestamp);
      applyZooming(timestamp);
    };

    let progressInterval;
    let isPlaying = false;
    const startStopHandler = (event) => {
      const playButton = event.currentTarget;
      if (isPlaying) {
        clearInterval(progressInterval);
        isPlaying = !isPlaying;
        playButton.innerHTML = "&#9658;";
        return;
      }
      playButton.innerHTML = "&#10074; &#10074;";
      isPlaying = !isPlaying;
      const increment = 50;
      let timestamp = current;

      const pxPerIncrement = (increment * barSize) / duration;
      const progress: HTMLElement = document.querySelector(".progress");

      progressInterval = setInterval(() => {
        const currentWidth = progress.offsetWidth;
        const newWidth = currentWidth + pxPerIncrement;
        if (newWidth > barSize) {
          clearInterval(progressInterval);
          isPlaying = !isPlaying;
          playButton.innerHTML = "&#9658;";
        }
        progress.style.width = `${newWidth}px`;
        timestamp += increment;
        applyEvents(timestamp);
        applyMouse(timestamp);
        applyPanning(timestamp);
        // applyZooming(timestamp);
        current = timestamp;

        if (!baseCoordinates && window.panzoom) {
          baseCoordinates = window.panzoom.getPan();
        }
      }, increment);
    };

    const enterTask = () => {
      const task = getProperty("currentTask");
      const properties = [
        "currentTask",
        "layoutSize",
        "currentNode",
        "previousNode",
        "rootNode",
        "topology",
        "edges",
        "nodes",
        "taskData",
        "taskReplay",
      ];

      properties.forEach((property) => {
        let propertyValue = getProperty(property);
        if (property === "taskReplay") {
          const timeCorrectedReplay = Object.entries(propertyValue).reduce(
            (timeCorrectedReplay, [eventType, eventValues]: [string, Array<any>]) => {
              if (eventType === "meta") return timeCorrectedReplay;
              const timeCorrectedValues = eventValues.map((event) => {
                const current = new Date().getTime();
                const offset = current - event.timestamp;
                event.timestamp = current - offset;
                return event;
              });
              timeCorrectedReplay[eventType] = timeCorrectedValues;
              return timeCorrectedReplay;
            },
            {}
          );
          propertyValue = timeCorrectedReplay;
        }
        props.taskStore.setProperty({ path: property, value: propertyValue });
        props.taskStore.store.dispatch("restoredFromReplay");
      });

      router.push({ name: "Task", params: { task } });
    };

    let fade;
    const fadeControlsIn = (event) => {
      clearTimeout(fade);
      const controls: HTMLElement = event.target;
      controls.style.opacity = "1";
    };
    const fadeControlsOut = (event) => {
      const controls: HTMLElement = event.target;
      fade = setTimeout(() => {
        controls.style.opacity = "0.3";
      }, 3000);
    };

    return { replayGraph, jumpHandler, startStopHandler, placeMarker, enterTask, fadeControlsIn, fadeControlsOut };
  },
};
</script>

<style scoped>
.replayOverlay {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  z-index: 4;
}

.replay {
  position: fixed;
  display: flex;
  flex-direction: column;
  left: 20vw;
  bottom: 5vh;
  height: 15vh;
  width: 60vw;
  align-items: center;
  justify-content: space-around;
  z-index: 3;
}

.progressBar {
  position: relative;
  display: flex;
  flex-direction: row;
  background: #b1b2b4;
  height: 20px;
  width: 95%;
  border-radius: 10px;
  border: 1px solid #f1ad2d;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  cursor: pointer;
}
.progress {
  position: absolute;
  background: #57636b;
  height: 20px;
  width: 0;
  z-index: 1;
}
.marker {
  position: absolute;
  color: black;
  width: 1.5px;
}

.controlElements {
  display: flex;
  width: 15vw;
  height: 8vh;
  justify-content: space-around;
  transition: opacity 2s linear;
  opacity: 1;
}

.fakeCursor {
  display: none;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  transition: 0.05s;
}
</style>
