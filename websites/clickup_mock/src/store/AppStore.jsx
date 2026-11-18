import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { loadState, saveState } from "../utils/dataManager.js";
import { createInitialData } from "../data/seed.js";
import { reducer } from "./reducer.js";
export const AppContext = createContext(null);
const Context = AppContext;
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null),
    last = useRef(null);
  useEffect(() => {
    let active = true;
    loadState("clickup", createInitialData).then((s) => {
      if (active) dispatch({ type: "HYDRATE", state: s });
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!state) return;
    if (!last.current) {
      last.current = state;
      return;
    }
    if (last.current !== state) {
      saveState("clickup", state);
      last.current = state;
    }
  }, [state]);
  if (!state)
    return (
      <div className="loading">
        <span className="spinner" />
      </div>
    );
  const act = (type, payload) => dispatch({ type, payload });
  const actions = {
    act,
    createTask: (p) => act("CREATE_TASK", p),
    updateTask: (id, patch) => act("UPDATE_TASK", { id, patch }),
    createDoc: (p) => act("CREATE_DOC", p),
  };
  return (
    <Context.Provider value={{ state, dispatch, actions }}>
      {children}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
