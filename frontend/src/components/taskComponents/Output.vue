<template>
  <div class="output__component">
    <h2>{{ header }}</h2>
    <div class="output__wrapper" v-if="serverOutput">
      <div class="output text" v-if="outputType === 'text'">
        <p class="text">{{ serverOutput }}</p>
      </div>
      <table class="output" v-if="outputType === 'table'">
        <tr>
          <th>Index</th>
          <th v-for="key in Object.keys(serverOutput[0])" :key="key">
            {{ key }}
          </th>
        </tr>
        <tr v-for="(row, i) in serverOutput" :key="i">
          <td>
            {{ i }}
          </td>
          <td v-for="(value, j) in Object.values(row)" :key="j">
            {{ value }}
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, watch } from "vue";

export default {
  name: "Output",
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { getProperty, setProperty } = props.storeObject;
    const currentNode = computed(() => getProperty("currentNode"));
    const path = `nodes__${currentNode.value}__components__${props.componentID}`;

    const componentPath = `${path}__component`;
    const dependencyPath = computed(() => getProperty(`${path}__dependencies`));

    const serverOutput = computed(() => {
      let serverOutput = getProperty(dependencyPath.value.Output.serverOutput);
      if (!serverOutput || (Array.isArray(serverOutput) && !serverOutput.length)) serverOutput = "";
      return serverOutput;
    });

    const outputType = computed(() => (typeof serverOutput.value === "string" ? "text" : "table"));

    const validOutput = computed(() => getProperty(dependencyPath.value.Output.validOutput));

    const header = computed(() => getProperty(`${componentPath}__header`));

    watch(validOutput, (isValid) => {
      setProperty({ path: `${path}__isValid`, value: isValid });
    });
    return { serverOutput, header, outputType };
  },
};
</script>

<style scoped>
h2 {
  color: #57636b;
  text-shadow: 1px 1px 1px #fff;
  padding: 10px 0;
}

.output__component {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
}
.output__component h2 {
  padding: 20px 0;
  height: 5%;
}
.output__wrapper {
  height: 95%;
  width: 100%;
  overflow-y: auto !important;
}
.output__component .output {
  height: 100%;
  width: 100%;
}
.output__component .output.text {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.output__component .output .text {
  text-align: justify;
  padding: 10px;
  width: 90%;
  background: #b1b2b4;
  border-radius: 5px;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
}
table,
th,
td {
  border: 1px solid black;
  border-collapse: collapse;
  text-align: center;
  border-spacing: 5px;
}
th,
td {
  width: 40px;
  height: 40px;
}
th {
  background: #57636b;
  color: #e8edf1;
}
tr:nth-child(odd) {
  background: #b1b2b4;
}
</style>
