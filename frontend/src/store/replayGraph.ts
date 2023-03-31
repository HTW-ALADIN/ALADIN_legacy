import { createStore, createLogger } from "vuex";
import axios from "axios";
import { IState } from "@/interfaces/TaskGraphInterface";

const emptyState = {
  isLoading: false,
  currentTask: null,
  layoutSize: "lg",
  currentNode: null,
  previousNode: null,
  rootNode: null,
  topology: [],
  edges: {},
  nodes: {},
  taskData: {},
};

const state: IState = {
  ...emptyState,
  taskReplay: { steps: [], meta: [] },
};
const mutations = {
  async SET_PROPERTY(state: IState, payload: { path: string; value: any }) {
    let { path, value } = payload;
    const splitPath = path.split("__");

    let subState = state;
    for (let depth = 0; depth < splitPath.length; depth++) {
      if (depth === splitPath.length - 1) subState[splitPath[depth]] = value;
      else subState = subState[splitPath[depth]];
    }
  },
};
const actions = {
  fetchReplayGraph: async ({ commit }, payload: { id: string }) => {
    try {
      const result = await axios.post("/api/fetchReplay", payload);
      const { replay } = JSON.parse(result.data);
      commit("SET_PROPERTY", { path: "taskReplay", value: JSON.parse(replay) });
    } catch (error) {
      // console.log(error);
    }
  },
  clearState: async ({ commit }) => {
    for (let [path, value] of Object.entries(emptyState)) {
      commit("SET_PROPERTY", { path, value });
    }
  },
  setPropertyFromPath: async ({ commit }, payload: { path: string; value: any }) => {
    commit("SET_PROPERTY", payload);
  },
};
const getters = {
  getPropertyFromPath: (state: IState) => (path: string) => {
    const splitPath = path.split("__");
    return splitPath.reduce((value, key) => {
      if (value && Object.keys(value).includes(key)) return value[key];
      else return null;
    }, state);
  },
};

export const replayStore = createStore<IState>({
  state,
  mutations,
  actions,
  getters,
  plugins: [createLogger()],
});
