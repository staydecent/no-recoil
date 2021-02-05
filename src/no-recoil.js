import { useState, useEffect } from "react";

const atoms = new Map();
const listeners = [];
const IS_STORE = "IS_STORE";

function setAtom(key, val) {
  const sym = Symbol(key);
  atoms.set(sym.description, val);
  return sym;
}

function getAtom(sym, path, def) {
  if (path == null) {
    return atoms.get(sym.description);
  }
  path = path.split('.');
  let val = atoms.get(sym.description);
  for (let x = 0; x < path.length; x++) {
    if (val == null) {
      return def;
    }
    val = val[path[x]];
  }
  return val == null ? def : val;
}

export function store() {
  return {
    getState() {
      return Object.fromEntries(atoms);
    },
    subscribe(fn) {
      listeners.push([IS_STORE, fn]);
      return () => {
        const idx = listeners.findIndex(([sym, l]) => l === fn);
        idx > -1 && listeners.splice(idx, 1);
      };
    },
  };
}

export function atom(key, val) {
  return setAtom(key, val);
}

export function selector(key, getter) {
  return setAtom(key, getter); // ensure uniquely named
}

export function select(selectorSym) {
  const getter = atoms.get(selectorSym.description);
  const get = (...args) => getAtom(...args);
  return (...args) => {
    return getter({ get }, ...args);
  };
}

export function mutation(key, setter) {
  setAtom(key, setter); // ensure uniquely named
  const get = (...args) => getAtom(...args);
  const set = (sym, val) => {
    atoms.set(sym.description, val);
    for (let x = 0; x < listeners.length; x++) {
      const [maybeSym, listener] = listeners[x];
      if (maybeSym != null) {
        if (maybeSym === IS_STORE || maybeSym.description === sym.description) {
          listener(key);
        }
      }
    }
  };
  return (...args) => {
    setter({ get, set }, ...args);
  };
}

export function useSelector(selectorSym) {
  const [sym, setSym] = useState();
  const select = atoms.get(selectorSym.description);
  const get = (atomSym, path, def) => {
    setSym(atomSym);
    return getAtom(atomSym, path, def);
  };
  const state = useState(select({ get }));
  useEffect(() => {
    if (!sym) return;
    const listener = () => {
      state[1](select({ get }));
    };
    listeners.push([sym, listener]);
    return () => {
      const idx = listeners.findIndex(([sym, l]) => l === listener);
      idx > -1 && listeners.splice(idx, 1);
    };
  }, [sym]);
  return state[0];
}
