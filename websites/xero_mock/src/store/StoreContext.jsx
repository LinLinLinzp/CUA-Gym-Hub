import React, { createContext, useContext, useEffect, useReducer, useRef, useCallback, useMemo } from 'react';
import { loadState, saveState } from '../utils/dataManager.js';
import { createInitialData } from '../data/seed.js';
import { reduceAction, newId } from './reducer.js';
export const StoreContext = createContext(null);
let loading;
export function StoreProvider({
  children
}) {
  const [state, replace] = useReducer((_, next) => next, null),
    ref = useRef(null);
  useEffect(() => {
    let active = true;
    loading ||= loadState('xero', createInitialData);
    loading.then(s => {
      if (active) {
        ref.current = s;
        replace(s);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  const dispatch = useCallback(action => {
    const next = reduceAction(ref.current, action);
    if (next !== ref.current) {
      saveState('xero', next);
      ref.current = next;
      replace(next);
    }
    return next;
  }, []);
  const actions = useMemo(() => ({
    createInvoice(data, status = 'DRAFT') {
      const id = newId('inv');
      dispatch({
        type: 'saveDocument',
        newId: id,
        kind: 'invoice',
        data,
        status
      });
      return id;
    },
    approveInvoice(id) {
      return dispatch({
        type: 'documentAction',
        kind: 'invoice',
        id,
        event: 'approve'
      });
    },
    createBill(data, status = 'DRAFT') {
      const id = newId('bill');
      dispatch({
        type: 'saveDocument',
        newId: id,
        kind: 'bill',
        data,
        status
      });
      return id;
    },
    approveBill(id) {
      return dispatch({
        type: 'documentAction',
        kind: 'bill',
        id,
        event: 'approve'
      });
    },
    recordPayment(data) {
      return dispatch({
        type: 'payment',
        data
      });
    },
    reconcileLine(id, data) {
      return dispatch({
        type: 'reconcile',
        id,
        data
      });
    },
    saveReport(data) {
      const id = newId('rep');
      dispatch({
        type: 'saveReport',
        newId: id,
        data
      });
      return id;
    }
  }), [dispatch]);
  if (!state) return <><div className="loading-header" /><div className="loading">Loading…</div></>;
  return <StoreContext.Provider value={{
    state,
    dispatch,
    ...actions
  }}>{children}</StoreContext.Provider>;
}
export const useStore = () => useContext(StoreContext);
