import { createStore } from "vuex";
import { reactive } from "vue";
import axios from "axios";

const state: IState = {
  taskList: reactive([]),
};
const mutations = {
  SET_TASK_LIST(state: IState, payload: Array<string>) {
    state.taskList = payload.map((task) => ({ name: task }));
  },
};
const actions = {
  async fetchTasks({ commit }) {
    const response = await axios.get("/api/fetchTasklist");
    commit("SET_TASK_LIST", JSON.parse(response.data));
  },
};
const getters = {};

export const store = createStore<IState>({
  state,
  mutations,
  actions,
  getters,
});

interface ITask {
  name: string;
}

interface IState {
  taskList: Array<ITask>;
}
