<template>
  <div class="contourPlot"></div>
</template>

<script>
import { onMounted, computed, watch } from "vue";
import * as d3 from "d3";
import * as hsv from "d3-hsv";

export default {
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { getProperty, setProperty } = props.storeObject;
    const currentNode = computed(() => getProperty("currentNode"));

    const dependencyPath = getProperty(`nodes__${currentNode.value}__components__${props.componentID}__dependencies`);

    const grid = computed(() => getProperty(dependencyPath.ContourPlot.grid));

    let data = {};
    const fetchData = () => {
      const { grid, thresholds } = dependencyPath.ContourPlot;
      const gridDependency = getProperty(grid);
      const tresholdsDependency = getProperty(thresholds);
      if (!gridDependency || !tresholdsDependency) return { values: [], rows: 1, columns: 1, thresholds: [] };
      return {
        values: gridDependency.reduce((flattened, row) => [...flattened, ...row], []),
        rows: gridDependency.length,
        columns: gridDependency[0].length,
        thresholds: tresholdsDependency,
      };
    };

    const prepareData = () => {
      const { values, columns, rows } = data;
      const contours = d3.contours().size([columns, rows]);

      const interpolateTerrain = () => {
        const i0 = hsv.interpolateHsvLong(hsv.hsv(120, 1, 0.65), hsv.hsv(60, 1, 0.9));
        const i1 = hsv.interpolateHsvLong(hsv.hsv(60, 1, 0.9), hsv.hsv(0, 0, 0.95));
        return (t) => (t < 0.5 ? i0(t * 2) : i1((t - 0.5) * 2));
      };

      const color = d3.scaleSequential(interpolateTerrain()).domain(d3.extent(values)).nice();

      return { color, contours };
    };

    const genSvg = () => {
      const { color, contours } = prepareData();
      const { values, thresholds, columns, rows } = data;
      const path = d3.geoPath();

      const svg = d3
        .select(".contourPlot")
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin ")
        .attr("viewBox", `0 0 ${rows} ${columns}`);

      const g = svg.append("g").attr("stroke", "black").attr("stroke-width", 0.03);

      for (const threshold of thresholds) {
        const geoJson = contours.contour(values, threshold);
        g.append("path").attr("d", path(geoJson)).attr("fill", color(threshold));
      }
      return svg.node();
    };

    onMounted(() => {
      data = fetchData();
      genSvg();
    });

    watch(grid, () => {
      data = fetchData();
      const parent = document.querySelector(".contourPlot");
      parent.removeChild(parent.firstChild);
      genSvg();
    });

    return {};
  },
};
</script>

<style scoped>
.contourPlot {
  width: 100%;
  height: 100%;
}

.contourPlot > svg {
  width: 100%;
  height: 100%;
}
</style>
