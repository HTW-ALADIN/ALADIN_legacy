<template>
  <ContextMenu :componentId="id" :methods="selectedMethods" :storeObject="storeObject">
    <div class="gantt">
      <div class="time">
        <div
          class="timepoint axis"
          v-for="i in Array(maxTime)
            .fill(0)
            .map((_, i) => i)"
          :key="i"
        >
          <span>
            {{ i }}
          </span>
        </div>
      </div>

      <div class="diagram">
        <div class="events">
          <div class="event axis" v-for="event in events" :key="event">
            <span>
              {{ event }}
            </span>
          </div>
        </div>
        <div class="matrix">
          <div class="row" v-for="(row, i) in userMatrix" :key="i">
            <div
              class="field"
              :class="filled ? 'filled' : ''"
              :id="`${i}_${j}`"
              @mousedown="drawStartHandler"
              @mousemove="drawHandler"
              @mouseup="drawEndHandler"
              v-for="(filled, j) in row"
              :key="j"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </ContextMenu>
</template>

<script lang="ts">
import { onMounted, computed } from "vue";
import ContextMenu from "@/components/taskComponents/mixins/ContextMenu.vue";
import { throttle } from "@/helpers/HelperFunctions";

export default {
  components: { ContextMenu },
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { getProperty, setProperty } = props.storeObject;
    const currentNode = getProperty("currentNode");
    const path = `nodes__${currentNode}__components__${props.componentID}`;

    const dependencies = getProperty(`${path}__dependencies`);
    const { matrix, events, maxTime } = getProperty(dependencies.GanttDiagram.ganttDiagram);

    const userMatrix = computed(() => getProperty(`${path}__component__userMatrix`));
    if (!userMatrix.value.length) setProperty({ path: `${path}__component__userMatrix`, value: matrix.map((row) => row.map((_) => 0)) });

    const isDrawing = computed(() => getProperty(`${path}__component__isDrawing`));
    const isDeleting = computed(() => getProperty(`${path}__component__isDeleting`));
    const currentRow = computed(() => getProperty(`${path}__component__currentRow`));
    const currentColumn = computed(() => getProperty(`${path}__component__currentColumn`));

    onMounted(() => {
      validate();
    });

    const drawStartHandler = () => {
      const currentElement = Array.from(document.querySelectorAll(":hover")).pop();
      const isFilled = Array.from(currentElement.classList).includes("filled");
      const value = isFilled ? 0 : 1;
      const [row, column] = currentElement.id.split("_");
      setProperty({ path: `${path}__component__isDrawing`, value: true });
      setProperty({ path: `${path}__component__isDeleting`, value: isFilled });
      setProperty({ path: `${path}__component__currentRow`, value: row });
      setProperty({ path: `${path}__component__currentColumn`, value: column });
      setProperty({ path: `${path}__component__userMatrix__${row}__${column}`, value });
    };
    const drawHandler = () => {
      if (isDrawing.value) {
        const currentElement = Array.from(document.querySelectorAll(":hover")).pop();
        const [_, column] = currentElement.id.split("_");

        if (column != currentColumn.value) {
          const value = isDeleting.value ? 0 : 1;

          const forward = (index, current) => index >= current;
          const backward = (index, current) => index <= current;
          const [from, to] = column > currentColumn.value ? [forward, backward] : [backward, forward];

          const newRow = userMatrix.value[currentRow.value].map((v, i) => {
            if (from(i, currentColumn.value) && to(i, column)) return value;
            return v;
          });

          setProperty({ path: `${path}__component__currentColumn`, value: column });
          setProperty({ path: `${path}__component__userMatrix__${currentRow.value}`, value: newRow });
        }
      }
    };
    const drawEndHandler = () => {
      const currentElement = Array.from(document.querySelectorAll(":hover")).pop();
      const [_, column] = currentElement.id.split("_");
      const value = isDeleting.value ? 0 : 1;
      const newRow = userMatrix.value[currentRow.value].map((v, i) => {
        if (i >= currentColumn.value && i < column) return value;
        return v;
      });

      setProperty({ path: `${path}__component__isDrawing`, value: false });
      setProperty({ path: `${path}__component__currentRow`, value: null });
      setProperty({ path: `${path}__component__currentColumn`, value: null });
      setProperty({ path: `${path}__component__userMatrix__${currentRow.value}`, value: newRow });

      setTimeout(() => validate(), 100);
    };

    const validate = () => {
      const isValid = matrix.every((row, i) => row.every((value, j) => userMatrix.value[i][j] == value));

      setProperty({
        path: `${path}__isValid`,
        value: isValid,
      });
    };

    const methods = {
      showSolution: () => {
        setProperty({ path: `${path}__component__userMatrix`, value: matrix.map((row) => row.map((value) => value)) });
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
      maxTime,
      events,
      userMatrix,
      drawStartHandler,
      drawHandler: throttle(drawHandler, 50),
      drawEndHandler,
    };
  },
};
</script>

<style scoped>
.gantt {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: space-between;
  align-items: center;
  flex-direction: column;
}

.diagram {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: space-between;
  align-items: center;
}

.time {
  display: flex;
  height: 5vh;
  width: calc(100% - 5vh);
  align-self: flex-end;
  justify-content: center;
  align-items: center;
}

.timepoint {
  width: 100%;
  height: 100%;
}

.time span {
  vertical-align: -90%;
  padding-left: 5px;
  text-align: center;
}

.events {
  display: flex;
  height: 100%;
  width: 5vh;
  justify-content: space-around;
  align-items: center;
  flex-direction: column;
}

.event {
  width: 100%;
  height: 100%;
}

.event span {
  vertical-align: -90%;
  padding-left: 40%;
}

.axis {
  background: #57636b;
  color: #e8edf1;
}

.matrix {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: space-between;
  align-items: center;
  flex-direction: column;
}

.row {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: space-between;
  align-items: center;
}

.field {
  width: 100%;
  height: 100%;
  border: 1px dotted grey;
}

.filled {
  background: blue;
}
</style>
