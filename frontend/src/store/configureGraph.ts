import { createStore, createLogger } from "vuex";
import axios from "axios";
import { IState } from "@/interfaces/TaskGraphInterface";

const state: IState = {
  isLoading: false,
  currentTask: "Dummy",
  layoutSize: "lg",
  currentNode: 0,
  previousNode: 0,
  rootNode: 0,
  topology: [],
  edges: {},
  nodes: {
    "0": {
      zoomScale: 1,
      interjections: [
        { method: "matrixSelfMultiplication", dependencies: { baseMatrix: "nodes__0__components__1", n: "taskData__longestPath" } },
      ],
      layouts: {
        sm: [],
        md: [],
        lg: [
          { x: 32, y: 30, w: 2, h: 2, i: 0, static: false },
          { x: 34, y: 30, w: 2, h: 2, i: 1, static: false },
        ],
      },
      hints: {
        active: false,
        current: 0,
        descriptions: [
          "Bestimme anhand der Parameter die Komplexität des zu generierenden Gozintographen.",
          'Viel Erfolg! <br><br> <img width="100px;" height="100px"; src="https://images.emojiterra.com/twitter/512px/1f340.png" />',
        ],
      },
      components: {
        "0": {
          name: "Direktbedarfsmatrix",
          type: "Matrix",
          isValid: false,
          dependencies: { Matrix: { data: "taskData__adjacencyMatrix" } },
          methods: { fillZeros: "Ergänze Nullen", showSolution: "Zeige Lösung", copyToClipboard: "Kopieren" },
          component: {
            initialize: {
              validation: {
                operations: [],
                paths: ["taskData__adjacencyMatrix"],
              },
              user: {
                operations: [{ name: "getValueInitializedMatrix", args: [null] }],
                paths: ["taskData__adjacencyMatrix"],
              },
            },
            userData: null,
            validationData: null,
            readOnly: false,
            rowLabel: "taskData__labelVector",
            columnLabel: "taskData__labelVector",
          },
        },
        "1": {
          type: "TaskConfiguration",
          name: "Konfiguration",
          isValid: false,
          component: {
            title: "Parameter Konfiguration",
            actions: [
              {
                instruction: "generateGraph",
                type: "fetchData",
                label: "Generieren!",
                dependsOn: ["nodeAmount", "edgeWeightRange", "nodeValueRange", "edgeDensity"],
              },
            ],
            form: {
              nodeAmount: {
                formType: "ValueFormField",
                label: "Knotenanzahl",
                type: "number",
                step: 1,
                boundaries: { min: 5, max: 30 },
                description: "Bestimmt die Menge der Knoten",
                value: 10,
                validate: true,
                presets: {
                  easy: 5,
                  medium: 10,
                  hard: 20,
                },
              },
              edgeWeightRange: {
                formType: "RangeFormField",
                label: "Kantengewichte",
                type: "number",
                description: "Bestimmt den Wertebereich der Kantengewichte",
                boundaries: { min: 1, max: 200 },
                step: 1,
                initial: {
                  lowerValue: 1,
                  upperValue: 10,
                },
                presets: {
                  easy: [2, 10],
                  medium: 3,
                  hard: 5,
                },
              },
              nodeValueRange: {
                formType: "RangeFormField",
                label: "Knotenwerte",
                type: "number",
                description: "Bestimmt den Wertebereich der Knotenwerte",
                boundaries: { min: 1, max: 200 },
                step: 1,
                initial: {
                  lowerValue: 1,
                  upperValue: 10,
                },
                presets: {
                  easy: 2,
                  medium: 3,
                  hard: 5,
                },
              },
              edgeDensity: {
                formType: "ValueFormField",
                label: "Kantendichte",
                type: "number",
                step: 0.01,
                boundaries: { min: 0, max: 1 },
                description: "Bestimmt die Anzahl an Kanten",
                value: 0.3,
                validate: true,
                presets: {
                  easy: 0.2,
                  medium: 0.3,
                  hard: 0.5,
                },
              },
              seed: {
                formType: "ValueFormField",
                label: "Seed",
                type: "text",
                description: "Setze einen beliebigen Wert um die Generierung deterministisch und reproduzierbar zu machen",
                value: "",
                validate: false,
                presets: {
                  easy: "",
                  medium: "",
                  hard: "",
                },
              },
            },
          },
        },
      },
    },
  },
  taskData: {
    labelVector: ["K0", "K1", "R0", "R1", "P0", "B0", "B1", "P1"],
    adjacencyMatrix: [
      ["0", "0", "0", "0", "0", "0", "0", "0"],
      ["0", "0", "0", "0", "0", "0", "0", "0"],
      ["0", "0", "0", "0", "0", "0", "0", "0"],
      ["0", "0", "0", "0", "0", "0", "0", "0"],
      ["0", "0", "5", "8", "0", "0", "0", "0"],
      ["0", "3", "0", "0", "0", "0", "0", "0"],
      ["4", "5", "0", "0", "0", "10", "0", "0"],
      ["0", "0", "0", "9", "0", "0", "14", "0"],
    ],
  },
};

const mutations = {
  SET_PROPERTY(state: IState, payload: { path: string; value: any }) {
    const { path, value } = payload;
    const splitPath = path.split("__");

    let subState = state;
    for (let depth = 0; depth < splitPath.length; depth++) {
      if (depth === splitPath.length - 1) subState[splitPath[depth]] = value;
      else subState = subState[splitPath[depth]];
    }
  },
};
const actions = {
  fetchTaskData: async ({ commit }, payloadObject: { [key: string]: any }) => {
    const { endpoint, payload } = payloadObject;
    const result = await axios.post(`/api/${endpoint}`, payload);
    commit("SET_PROPERTY", { path: "taskData", value: JSON.parse(result.data) });
  },
  fetchTaskGraph: async ({ commit }, payload: { task: string }) => {
    try {
      const result = await axios.post("/api/fetchTaskGraph", payload);
      const { UI } = JSON.parse(result.data);
      const { topology, edges, nodes, rootNode } = UI;
      commit("SET_PROPERTY", { path: "topology", value: topology });
      commit("SET_PROPERTY", { path: "edges", value: edges });
      commit("SET_PROPERTY", { path: "nodes", value: nodes });
      commit("SET_PROPERTY", { path: "rootNode", value: rootNode });
      commit("SET_PROPERTY", { path: "currentNode", value: rootNode });
    } catch (error) {
      // console.log(error);
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

export const configurationStore = createStore<IState>({
  state,
  mutations,
  actions,
  getters,
  plugins: [createLogger()],
});
