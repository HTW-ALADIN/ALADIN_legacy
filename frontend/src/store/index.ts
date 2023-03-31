import { createStore } from "vuex";

export default createStore({
  modules: {
    taskGraph: require("./taskGraph.ts"),
    taskOverview: require("./taskOverview.ts"),
  },
});
