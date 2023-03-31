<template>
  <ContextMenu :componentId="componentID" :methods="selectedMethods" :storeObject="storeObject">
    <div class="editor_wrapper">
      <ActionButtons v-if="!hideActions" :actions="actions" :actionTypes="actionTypes" />
      <div :id="`editor__${componentID}`" class="codeEditor"></div>
    </div>
  </ContextMenu>
</template>

<script lang="ts">
import { computed, onMounted, watch } from "vue";
import ace from "ace-builds";
import ContextMenu from "@/components/taskComponents/mixins/ContextMenu.vue";
import ActionButtons from "@/components/taskComponents/mixins/ActionButtons.vue";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/ext-modelist.js";
import "ace-builds/src-noconflict/theme-dracula";

// TODO add contextmenu methods, (showSolution), add conditional action-button (send Code)

export default {
  name: "CodeEditor",
  props: {
    componentID: Number,
    storeObject: Object,
    codeProp: Object,
    languageProp: String,
    hideActions: Boolean,
  },
  components: {
    ContextMenu,
    ActionButtons,
  },
  setup(props) {
    const { store, getProperty, setProperty } = props.storeObject;
    const currentNode = computed(() => getProperty("currentNode"));
    const currentTask = computed(() => getProperty("currentTask"));
    const path = `nodes__${currentNode.value}__components__${props.componentID}`;
    const componentPath = `${path}__component`;

    const code = computed(() => {
      const path = `${componentPath}__code`;
      return props.codeProp ? JSON.stringify(props.codeProp, null, "\t") : getProperty(path);
    });

    const language = computed(() => {
      return props.languageProp ? props.languageProp : getProperty(`${componentPath}__language`);
    });

    let timer;
    let editor;

    onMounted(() => {
      const modelist = ace.require("ace/ext/modelist");
      const mode = modelist.getModeForPath(language.value);

      editor = ace.edit(`editor__${props.componentID}`, {
        mode: mode.mode,
        theme: "ace/theme/dracula",
        fontSize: 18,
        tabSize: 2,
        showGutter: true,
        showPrintMargin: false,
        wrap: true,
      });
      editor.getSession().setValue(code.value);

      editor.on("change", () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          const content: string = editor.getValue();

          if (props.codeProp) {
            if (content && typeof content === "string" && content !== code.value) {
              Object.entries(JSON.parse(content)).forEach(([key, value]) => {
                setProperty({ path: key, value });
              });
            }
          } else {
            if (content !== code.value) setProperty({ path: `${componentPath}__code`, value: content });
          }
        }, 100);
      });
    });

    watch(code, () => {
      const { row, column } = editor.selection.getCursor();
      editor.getSession().setValue(code.value);
      editor.clearSelection();
      editor.gotoLine(row + 1, column);
    });

    const preparePayload = (instruction, parameters) => {
      const parsedParameters = (parameters) => {
        return Object.entries(parameters).reduce((parsedParameters, [name, path]) => {
          parsedParameters[name] = getProperty(path);
          return parsedParameters;
        }, {});
      };
      const payload = {
        type: currentTask.value,
        task: currentTask.value,
        instruction,
        code: code.value,
        parameters: parsedParameters(parameters),
      };
      return payload;
    };

    const execute = (instruction, parameters) => {
      const payload = preparePayload(instruction, parameters);
      return store.dispatch("fetchTaskData", { payload, endpoint: `${currentTask.value}/${instruction}` });
    };

    const actionTypes = {
      execute,
    };

    const methods = {
      showSolution: () => {
        const solutionPath = getProperty(`${path}__dependencies__CodeEditor__validCode`);
        const solution = getProperty(solutionPath) || "";
        setProperty({ path: `${componentPath}__code`, value: solution });
      },
      copyToClipboard: () => {},
    };

    const selectedMethods = () => {
      const serialisedMethods = getProperty(`nodes__${currentNode.value}__components__${props.componentID}__methods`);
      if (!serialisedMethods) return {};
      return Object.entries(serialisedMethods).reduce(
        (selectedMethods, [name, description]: [string, string]) => ({ ...selectedMethods, [description]: methods[name] }),
        {}
      );
    };

    const actions = computed(() => getProperty(`${path}__actions`));

    return { code, selectedMethods: selectedMethods(), actionTypes, actions };
  },
};
</script>

<style scoped>
.editor_wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.codeEditor {
  width: 100%;
  height: 100%;
}
</style>
