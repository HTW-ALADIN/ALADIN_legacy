<template>
  <div class="actions">
    <Button
      v-for="(action, i) in actions"
      :class="{ disabled: action.disabled }"
      :key="i"
      :data="{ name: 'id', value: i }"
      :label="action.label"
      :callback="action.disabled ? () => {} : handleAction"
    />
  </div>
</template>

<script lang="ts">
import Button from "@/components/Button.vue";

export default {
  name: "ActionButtons",
  props: {
    actionTypes: Object,
    actions: Array,
  },
  components: { Button },
  setup(props) {
    // TODO register on global object (window/html) to register, since button is not keydownable
    const handleKeyboardShortcut = (event) => {
      const actionId = event.target.dataset.id;
      const { type, instruction, keyboardShortcut, parameters } = props.actions[actionId];

      const shortcutPressed = keyboardShortcut.every(({ property, value }) => event[property] === value);

      if (shortcutPressed) props.actionTypes[type](instruction);
    };

    const handleAction = (event) => {
      const actionId = event.target.dataset.id;
      const { type, instruction, parameters } = props.actions[actionId];

      props.actionTypes[type](instruction, parameters);
    };

    return { handleAction };
  },
};
</script>

<style scoped>
.actions {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 10vw;
  height: 10vh;
  cursor: default;
  opacity: 1;
}

.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
