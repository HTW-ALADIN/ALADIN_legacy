<template>
  <transition name="fade" mode="out-in">
    <div class="overlay" v-if="active">
      <div class="modal" @clickout="closeHandler">
        <div class="closeModal" @click="closeHandler">X</div>
        <div class="modal__header">
          {{ modal.content.header }}
        </div>
        <div class="modal__body">{{ modal.content.body }}</div>
        <div class="modal__footer">
          <Button
            v-for="(button, i) in modal.content.footer.buttons"
            :key="i"
            :label="button.label"
            :callback="buttonFunctions[button.type](button.parameters)"
          />
        </div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import { computed, watch } from "vue";
import Button from "@/components/Button.vue";
import { useRouter } from "vue-router";

export default {
  name: "Modal",
  props: { storeObject: Object, modalIndex: Number },
  components: {
    Button,
  },
  setup(props) {
    const { store, getProperty, setProperty } = props.storeObject;
    const currentNode = store.state.currentNode;

    const router = useRouter();

    const modalPath = `nodes__${currentNode}__modals__${props.modalIndex}`;
    const modal = computed(() => getProperty(modalPath));
    const active = computed(() => getProperty(`${modalPath}__active`));

    const completed = computed(() => {
      const components = getProperty(`nodes__${currentNode}__components`) as object;
      return Object.values(components).every((component) => component.isValid);
    });

    const allValid = computed(() => {
      const components = getProperty(`nodes__${currentNode}__components`) as object;
      return Object.values(components).every((component) => component.isValid);
    });

    const triggers = {
      completion: (completed) => {
        if (completed) {
          setTimeout(() => {
            setProperty({ path: `${modalPath}__active`, value: true });
          }, 50);
          window.panzoom.setOptions({
            disablePan: true,
          });
        }
      },
      success: (allValid) => {
        if (allValid) {
          setTimeout(() => {
            setProperty({ path: `${modalPath}__active`, value: true });
            window.panzoom.setOptions({
              disablePan: true,
            });
          }, 50);
        }
      },
    };

    watch(completed, triggers[modal.value.trigger.type]);

    const closeHandler = () => {
      setProperty({ path: `${modalPath}__active`, value: false });
      window.panzoom.setOptions({
        disablePan: false,
      });
    };

    const buttonFunctions = {
      close: () => closeHandler,
      route: (parameters) => () => {
        const { route } = parameters;
        router.push({ name: route });
      },
    };

    return { closeHandler, modal, active, buttonFunctions };
  },
};
</script>

<style scoped>
.overlay {
  position: absolute;
  width: 100vw;
  height: 100vh;
  z-index: 99;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: default;
}

.modal {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 30vw;
  height: 40vh;
  justify-content: space-around;
  align-items: center;
  background: #e8edf1; /*57636b  f1ad2d b1b2b4 e8edf1*/
  z-index: 99;
  border: 1px solid black;
  border-radius: 2px;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  color: #57636b;
}

.modal__header {
  display: flex;
  justify-content: center;
  width: 100%;
  font-size: 30px;
  font-weight: bolder;
}

.modal__background {
  background: #b1b2b4;
  width: 90%;
  height: 90%;
}

.modal__footer {
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  height: 60px;
  padding-bottom: 5px;
}

.closeModal {
  position: absolute;
  top: 2px;
  right: 2px;
  padding: 5px;
  border: 1px solid black;
  box-shadow: 2px 3px 9px 0px rgba(0, 0, 0, 1);
  background: #57636b;
  color: white;
  cursor: pointer;
  font-size: 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
