import { createStore, createLogger } from "vuex";
import axios from "axios";
import { IState, IReplay } from "@/interfaces/TaskGraphInterface";

const baseState: IState = {
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
  taskReplay: { steps: [], mouse: [], panning: [], zooming: [], meta: {} },
  restoredFromReplay: false,
};

const extractMetaInformation = (state: IState, replay: IReplay) => {
  const calcDuration = (replay: IReplay) => {
    const times = { start: new Date().getTime(), duration: 0, end: 0, date: "" };
    Object.values(replay).forEach((events: Array<any>) => {
      if (!events.length) return;
      const firstEvent = events[0].timestamp;
      const lastEvent = events[events.length - 1].timestamp;
      if (firstEvent < times.start) times.start = firstEvent;
      if (lastEvent > times.end) times.end = lastEvent;
    });

    times.duration = times.end - times.start;

    times.date = new Date().toISOString();
    return times;
  };

  const task = state.currentTask;
  // 0 = unfinished, 1 = finished successfully, 2 finished with wrong result
  type completionStatus = 0 | 1 | 2;
  const completion: completionStatus = 0;
  const { duration, date } = calcDuration(replay);

  return { task, completion, date, duration };
};

const state: IState = { ...baseState };
const mutations = {
  RESET(state: IState) {
    state = { ...baseState };
  },
  TOGGLE_LOADING(state: IState) {
    state.isLoading = !state.isLoading;
  },
  SET_PROPERTY(state: IState, payload: { path: string; value: any }) {
    const { path, value } = payload;
    const splitPath = path.split("__");

    // for debugging purposes
    console.log(path, value);

    // save state on every mutation as a side effect for task replay
    state.taskReplay.steps.push({ timestamp: new Date().getTime(), ...JSON.parse(JSON.stringify(payload)) });

    let subState = state;
    for (let depth = 0; depth < splitPath.length; depth++) {
      if (depth === splitPath.length - 1) subState[splitPath[depth]] = value;
      else subState = subState[splitPath[depth]];
    }

    // old inperformant way
    // const parsedPath = splitPath.reduce((parsedPath, substring) => {
    //   return `${parsedPath}["${substring}"]`;
    // }, "");
    // const setState = new Function("state", "value", `state${parsedPath} = value;`);
    // setState(state, value);
  },
  TRACK_MOUSE(state: IState, payload: { timestamp: string; x: number; y: number }) {
    state.taskReplay.mouse.push(payload);
  },
  TRACK_PANNING(state: IState, payload: { timestamp: string; x: number; y: number }) {
    state.taskReplay.panning.push(payload);
  },
  TRACK_ZOOMING(state: IState, payload: { timestamp: string; scale: number }) {
    state.taskReplay.zooming.push(payload);
  },
  RESTORED_FROM_REPLAY(state: IState) {
    state.restoredFromReplay = true;
  },
};
const actions = {
  trackMouse: async ({ commit }, payload) => {
    commit("TRACK_MOUSE", payload);
  },
  trackPanning: async ({ commit }, payload) => {
    commit("TRACK_PANNING", payload);
  },
  trackZooming: async ({ commit }, payload) => {
    commit("TRACK_ZOOMING", payload);
  },
  storeReplay: async () => {
    const replay = state.taskReplay;
    replay.meta = extractMetaInformation(state, replay);
    const hash = await axios.post("/api/storeReplay", { replay: JSON.stringify(replay) });
    console.log(hash);
  },
  restoredFromReplay: async ({ commit }) => {
    commit("RESTORED_FROM_REPLAY");
  },
  resetStore: async ({ commit }) => {
    commit("RESET");
  },
  fetchTaskData: async ({ commit, dispatch }, payloadObject: { [key: string]: any }) => {
    // await dispatch("fetchTaskGraph");
    const { endpoint, payload } = payloadObject;
    // TODO extract language to seperate user module
    const result = await axios.post(`/api/${endpoint}`, { ...payload, language: "de" });
    Object.entries(JSON.parse(result.data)).forEach(([key, value]) => {
      commit("SET_PROPERTY", { path: `taskData__${key}`, value: value });
    });
  },
  fetchTaskGraph: async ({ commit }, payload: { task: string }) => {
    try {
      commit("TOGGLE_LOADING");
      commit("RESET");
      const result = await axios.post("/api/fetchTaskGraph", payload);
      const { UI } = JSON.parse(result.data);
      const { topology, edges, nodes, rootNode } = UI;
      commit("SET_PROPERTY", { path: "topology", value: topology });
      commit("SET_PROPERTY", { path: "edges", value: edges });
      commit("SET_PROPERTY", { path: "nodes", value: nodes });
      commit("SET_PROPERTY", { path: "rootNode", value: rootNode });
      commit("SET_PROPERTY", { path: "currentNode", value: rootNode });
      commit("TOGGLE_LOADING");
    } catch (error) {
      console.log(error);
      commit("TOGGLE_LOADING");
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

export const taskStore = createStore<IState>({
  state,
  mutations,
  actions,
  getters,
  // plugins: [createLogger()],
});
