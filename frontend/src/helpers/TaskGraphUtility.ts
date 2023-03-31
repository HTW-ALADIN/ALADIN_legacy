import { taskStore } from "@/store/taskGraph";
import { replayStore } from "@/store/replayGraph";
import { configurationStore } from "@/store/configureGraph";
import { IState } from "@/interfaces/TaskGraphInterface";
import { Store } from "vuex";

type storeMapEnum = "taskStore" | "replayStore" | "configurationStore";

const storeMap = {
  taskStore,
  replayStore,
  configurationStore,
};

export interface IStore {
  store: Store<IState>;
  getProperty: Function;
  setProperty: Function;
}

// bundle the different stores with the same utility functions to easily exchange them when injecting into the Canvas component
const storeBundler = (storeMap: { [key in storeMapEnum]: Store<IState> }) => {
  const getFactory = (store: Store<IState>) => (path: string) => store.getters.getPropertyFromPath(path);
  const setFactory = (store: Store<IState>) => (payload: { path: string; value: any }) => store.dispatch("setPropertyFromPath", payload);

  return Object.entries(storeMap).reduce((preparedStores, [name, store]) => {
    preparedStores[name] = {
      store,
      getProperty: getFactory(store),
      setProperty: setFactory(store),
    };
    return preparedStores;
  }, {} as { [key in storeMapEnum]: IStore });
};

export default storeBundler(storeMap);
