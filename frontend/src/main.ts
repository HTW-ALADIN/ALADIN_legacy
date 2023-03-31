import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import "./registerServiceWorker";
import VTooltip from "v-tooltip";

createApp(App).use(store).use(router).use(VTooltip).mount("#app");

declare global {
  interface Window {
    panzoom: any;
    delayed_methods: any;
    MathLex: any;
    MathJax: any;
  }
}
