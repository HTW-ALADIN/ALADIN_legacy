<template>
  <div>
    <canvas id="minimap"></canvas>
    <button class="minimap_collapse" @click="minimize">_</button>
    <canvas id="resizeCanvas"></canvas>
  </div>
</template>

<script lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";

export default {
  props: { storeObject: Object },
  setup(props) {
    const { getProperty } = props.storeObject;
    let canvas: HTMLCanvasElement = document.querySelector("#resizeCanvas");
    const canvasProportions = [0.2, 0.9];

    const currentNode = computed(() => getProperty("currentNode"));

    const topology = computed(() => getProperty("topology"));

    const edges = computed(() => getProperty("edges"));

    let collapsed = false;

    onMounted(() => {
      window.addEventListener("resize", resizeCanvas);
      canvas = document.querySelector("#resizeCanvas");
      collapsed = false;
      initializeCanvas();
      const { depth, width, layout } = calculateLayout(canvas);
      drawGraph(canvas, depth, width, layout, edges);
      resizeCanvas();
    });

    onUnmounted(() => {
      window.removeEventListener("resize", resizeCanvas);
    });

    const getRows = (topology) => {
      return topology;
    };
    const getColumns = (topology) => {
      return topology[0].map((element, elementIndex) => topology.map((row) => row[elementIndex]));
    };

    const minimize = () => {
      const minimap: HTMLCanvasElement = document.querySelector("#minimap");
      const button: HTMLButtonElement = document.querySelector(".minimap_collapse");
      collapsed = !collapsed;
      if (collapsed) {
        minimap.style.display = "none";
        button.innerHTML = "&square;";
      } else {
        minimap.style.display = "block";
        button.innerHTML = "_";
      }
    };

    const calculateLayout = (canvas: HTMLCanvasElement): { depth: number; width: number; layout: { [id: number]: [number, number] } } => {
      const depth = topology.value.length;
      const laneCount = getRows(topology.value)[0].length;
      const rows = getColumns(topology.value);
      const laneWidth = canvas.offsetWidth / laneCount;
      const laneHeight = canvas.offsetHeight / depth;
      let x = laneWidth / 2;
      let y = laneHeight / 2;
      const layout = {};
      for (let i = 0; i < laneCount; i++) {
        for (let j = 0; j < depth; j++) {
          const id = rows[i][j];
          if (id !== null) {
            layout[id] = [x, y];
          }
          y += laneHeight;
        }
        y = laneHeight / 2;
        x += laneWidth;
      }
      return { depth, width: laneWidth, layout };
    };

    const drawGraph = (canvas: HTMLCanvasElement, depth: number, width: number, layout: { [id: number]: [number, number] }, edges) => {
      const context = canvas.getContext("2d");
      context.lineWidth = 5;
      context.fillStyle = "green";
      context.strokeStyle = "green";
      Object.entries(layout).forEach(([id, coordinates]) => {
        drawNode(context, ...coordinates);
        edges.value[id].forEach((nextNode) => {
          const nextNodeCoordinates = layout[nextNode];
          context.setLineDash([2, 4]);
          context.fillStyle = "red";
          context.strokeStyle = "red";
          context.globalCompositeOperation = "destination-over";
          // individually passing parameters instead of using the spread operator due to https://github.com/microsoft/TypeScript/issues/28010
          drawEdge(context, coordinates[0], coordinates[1], nextNodeCoordinates[0], nextNodeCoordinates[1], width);
          context.globalCompositeOperation = "destination-under";
          context.setLineDash([]);
        });
      });
    };

    const initializeCanvas = () => {
      const width = document.querySelector("html").clientWidth * canvasProportions[0];
      const height = document.querySelector("html").clientHeight * canvasProportions[1];
      canvas.width = width;
      canvas.height = height;
      const realCanvas: HTMLCanvasElement = document.querySelector("#minimap");
      realCanvas.style.backgroundColor = "lightgrey";
      realCanvas.width = width;
      realCanvas.height = height;
    };

    const resizeCanvas = () => {
      const realCanvas: HTMLCanvasElement = document.querySelector("#minimap");
      const newWidth = document.querySelector("html").clientWidth * canvasProportions[0];
      const newHeight = document.querySelector("html").clientHeight * canvasProportions[1];
      const oldWidth = canvas.width;
      const oldHeight = canvas.height;
      realCanvas.width = newWidth;
      realCanvas.height = newHeight;
      realCanvas.getContext("2d").drawImage(canvas, 0, 0, oldWidth, oldHeight, 0, 0, newWidth, newHeight);
    };

    const drawNode = (context: CanvasRenderingContext2D, x: number, y: number, diameter: number = 15) => {
      context.beginPath();
      context.arc(x, y, diameter, 0, 2 * Math.PI);
      context.stroke();
      context.fill();
      context.closePath();
    };

    const drawEdge = (
      context: CanvasRenderingContext2D,
      startX: number,
      startY: number,
      stopX: number,
      stopY: number,
      amplitude: number
    ) => {
      context.beginPath();
      context.moveTo(startX, startY);
      if (startX !== stopX) {
        const factor = (stopX > startX ? stopX / startX : startX / stopX) / 2;
        if (startX < stopX) context.quadraticCurveTo(amplitude * factor, startY, stopX, stopY);
        else context.quadraticCurveTo(amplitude * factor, stopY, stopX, stopY);
      } else {
        context.lineTo(stopX, stopY);
      }
      context.stroke();
      context.closePath();
    };

    watch(currentNode, () => {
      // const context = canvas.getContext("2d");
      // context.lineWidth = 5;
      // context.fillStyle = "green";
      // context.strokeStyle = "green";
      // const { depth, width, layout } = calculateLayout(canvas);
      // const nodeId = currentNode.value;
      // const coordinates = layout[nodeId];
      // drawNode(context, ...coordinates);
      // const previousNodeCoordinates = layout[nodeId - 1];
      // drawEdge(context, coordinates[0], coordinates[1], previousNodeCoordinates[0], previousNodeCoordinates[1], width);
      // resizeCanvas();
    });

    // https://stackoverflow.com/questions/23939588/how-to-animate-drawing-lines-on-canvas
    // http://jsfiddle.net/loktar/uhVj6/4
    const animateStep = () => {};

    const smoothingAnimation = () => {};

    return { minimize };
  },
};
</script>

<style scoped>
#minimap {
  display: block;
  position: fixed;
  right: 0.5vw;
  top: 5vh;
  border: solid 2px black;
  opacity: 0.6;
  z-index: 1;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
}

.collapsed {
  display: none;
}

.minimap_collapse {
  position: fixed;
  right: calc(0.5vw + 6px);
  top: calc(5vh + 6px);
  width: 2vh;
  height: 2vh;
  min-height: 20px;
  min-width: 20px;
  background: white;
  cursor: pointer;
  z-index: 2;
}

#resizeCanvas {
  position: fixed;
  bottom: -999vh;
}
</style>
