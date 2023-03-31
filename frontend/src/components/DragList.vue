<template>
  <draggable
    :class="`dragArea list-group ${style.type} ${style.direction}`"
    tag="transition-group"
    :group="{ name: name, pull: pullAction, put: putAction, unique: uniqueValues }"
    :component-data="{
      tag: 'ul',
      type: 'transition-group',
      name: !drag ? 'flip-list' : null,
    }"
    @start="drag = true"
    @end="drag = false"
    :move="cancelInvalid"
    v-model="data"
    v-bind="dragOptions"
    item-key="id"
  >
    <template #item="{ element }">
      <div class="list-group-item" :class="{ 'not-draggable': !enabled }">
        {{ element.name }}
      </div>
    </template>
  </draggable>
</template>

<script lang="ts">
import draggable from "vuedraggable";
import { ref, computed } from "vue";

export default {
  name: "DragList",
  props: {
    propData: Array,
    storeObject: Object,
    style: Object,
    path: String,
    name: String,
    pullAction: [Boolean, String, Array],
    putAction: [Boolean, Array],
    uniqueValues: Boolean,
  },
  components: {
    draggable,
  },
  setup(props) {
    let data;
    let masterData;
    if (props.propData) {
      data = ref(props.propData.map((v, i) => ({ id: i, name: v })));
    } else {
      masterData = computed(() => props.storeObject.getProperty(props.path).map((v, i) => ({ id: i, name: v })));
      data = ref([...masterData.value]);
    }
    //   : computed({
    //       get() {
    //         const data = props.storeObject.getProperty(props.path);
    //         console.log(data);
    //         return data.map((v, i) => ({ id: i, name: v }));
    //       },
    //       set(newValue) {
    //         console.log(newValue);
    //         props.storeObject.setProperty({ path: props.path, value: newValue });
    //       },
    //     });

    const drag = ref(true);
    const enabled = ref(true);

    const dragOptions = {
      animation: 200,
      ghostClass: "ghost",
    };

    const cancelInvalid = (dragEvent, domEvent) => {
      const { draggedContext, relatedContext } = dragEvent;
      const isTargetSet = relatedContext.component.$attrs.group.unique;
      if (isTargetSet) {
        const { element } = draggedContext;
        const { list } = relatedContext;

        if (list.find((el) => el.name === element.name)) return false;
      }
      return true;
    };

    return { data, dragOptions, enabled, drag, cancelInvalid };
  },
};
</script>

<style scoped>
.dragArea {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: space-around;
  align-items: center;
}
.dragArea.vertical {
  flex-direction: column;
}

.boxes {
  flex-wrap: wrap;
  min-height: 30px !important;
  height: 90%;
  width: 90%;
  background: #b1b2b4;
  border-radius: 5px;
  color: black;
  padding: 1px;
  box-shadow: 1px 2px 4px 0px rgba(0, 0, 0, 1);
}

.boxes .list-group-item {
  height: 50%;
  padding: 5px;
  background: #e8edf1;
  border-radius: 5px;
  border: 3px solid #57636b;
  box-shadow: 1px 2px 6px 0px rgba(0, 0, 0, 1);
}

.flip-list-move {
  transition: transform 0.5s;
}
.no-move {
  transition: transform 0s;
}
.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}
.list-group {
  min-height: 20px;
}
.list-group-item {
  cursor: move;
}
.list-group-item i {
  cursor: pointer;
}
</style>
