import { useState, useEffect } from 'react' // Can be aliased to `preact` in host project

const atoms = new Map()
const listeners = []

export function atom ({ key, value }) {
  const sym = Symbol(key)
  atoms.set(sym, value)
  return sym
}

export function selector ({ key, get }) {
  const sym = Symbol(key)
  atoms.set(sym, get)
  return sym
}

export function useRecoilState (atomSym) {
  const {value} = atoms.get(atomSym)
  const state = useState(value)
  const setState = val => {
    state[1](val)
    atoms.set(atomSym, val)
    for (let x = 0; x < listeners.length; x++) {
      const [sym, l] = listeners[x];
      if (sym === atomSym) {
        l()
      }
    }
  }
  useEffect(() => {
    const listener = () => {
      if (state[0] !== atoms.get(atomSym)) {
        state[1](atoms.get(atomSym))
      }
    }
    listeners.push([atomSym, listener])
    return () => {
      const idx = listeners.findIndex(([atomSym, l]) => l === listener)
      idx > -1 && listeners.splice(idx, 1)
    }
  }, [atomSym])
  return [atoms.get(atomSym), setState]
}

export function useRecoilValue (selectorSym) {
  const [sym, setSym] = useState()
  const select = atoms.get(selectorSym)
  const get = atomSym => {
    setSym(atomSym)
    return atoms.get(atomSym)
  }
  const state = useState(select({get}))
  useEffect(() => {
    if (!sym) return
    const listener = () => {
      state[1](select({get}))
    }
    listeners.push([sym, listener])
    return () => {
      const idx = listeners.findIndex(([sym, l]) => l === listener)
      idx > -1 && listeners.splice(idx, 1)
    }
  }, [sym])
  return state[0]
}
