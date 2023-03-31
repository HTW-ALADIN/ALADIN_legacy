<template>
  <div class="dropdown">
    <h2>{{ header }}</h2>
    <form action="#">
      <select id="db" name="Datenbanken" @change="onChange($event)" class="form-control" v-model="selected">
        <option v-for="(option, i) in options" :key="i">
          {{ option }}
        </option>
      </select>
    </form>
  </div>
</template>

<script lang="ts">
import { onMounted, computed, watch } from "vue";

export default {
  name: "Dropdown",
  props: {
    componentID: Number,
    storeObject: Object,
  },
  setup(props) {
    const { getProperty, setProperty } = props.storeObject;
    const currentNode = computed(() => getProperty("currentNode"));
    const path = `nodes__${currentNode.value}__components__${props.componentID}`;

    const componentPath = `${path}__component`;
    const dependencies = computed(() => getProperty(`${path}__dependencies`));

    const options = computed(() => {
      const dependency = getProperty(dependencies.value.Dropdown.options);
      if (!dependency) return [];
      return dependency;
    });

    const selected = computed(() => getProperty(`${componentPath}__selected`));
    const header = computed(() => getProperty(`${componentPath}__header`));
    const label = computed(() => getProperty(`${componentPath}__label`));

    function onChange(event) {
      setProperty({ path: `${path}__component__selected`, value: event.target.value });
    }

    watch(selected, (newValue) => {
      if (newValue != null) setProperty({ path: `${path}__isValid`, value: true });
      else setProperty({ path: `${path}__isValid`, value: false });
    });

    return { options, onChange, header, label };
  },
};
</script>

<style scoped>
.dropdown {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.dropdown * {
  height: 100%;
  width: 100%;
  font-size: 120%;
  text-align: center;
}

h2 {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
