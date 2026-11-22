import { createElement, useEffect, useLayoutEffect, useRef, useState, createContext, useContext } from 'react';

export function createLog() {
  const log = [];
  return {
    add(entry) {
      log.push(entry);
    },
    getLog() {
      return [...log];
    },
    clearLog() {
      log.length = 0;
    },
  };
}

export function createMountOrderTest(logger) {
  function Parent() {
    useLayoutEffect(() => {
      logger.add('Parent useLayoutEffect setup');
      return () => {
        logger.add('Parent useLayoutEffect cleanup');
      };
    }, []);

    useEffect(() => {
      logger.add('Parent useEffect setup');
      return () => {
        logger.add('Parent useEffect cleanup');
      };
    }, []);

    return createElement('div', { 'data-testid': 'parent' },
      createElement(Child1),
      createElement(Child2)
    );
  }

  function Child1() {
    useLayoutEffect(() => {
      logger.add('Child1 useLayoutEffect setup');
      return () => {
        logger.add('Child1 useLayoutEffect cleanup');
      };
    }, []);

    useEffect(() => {
      logger.add('Child1 useEffect setup');
      return () => {
        logger.add('Child1 useEffect cleanup');
      };
    }, []);

    return createElement('div', { 'data-testid': 'child1' },
      createElement(GrandChild1)
    );
  }

  function Child2() {
    useLayoutEffect(() => {
      logger.add('Child2 useLayoutEffect setup');
      return () => {
        logger.add('Child2 useLayoutEffect cleanup');
      };
    }, []);

    useEffect(() => {
      logger.add('Child2 useEffect setup');
      return () => {
        logger.add('Child2 useEffect cleanup');
      };
    }, []);

    return createElement('div', { 'data-testid': 'child2' });
  }

  function GrandChild1() {
    useLayoutEffect(() => {
      logger.add('GrandChild1 useLayoutEffect setup');
      return () => {
        logger.add('GrandChild1 useLayoutEffect cleanup');
      };
    }, []);

    useEffect(() => {
      logger.add('GrandChild1 useEffect setup');
      return () => {
        logger.add('GrandChild1 useEffect cleanup');
      };
    }, []);

    return createElement('div', { 'data-testid': 'grandchild1' });
  }

  return Parent;
}

export function createNaiveFailureTest(logger) {
  function Parent() {
    const registryRef = useRef(null);

    useEffect(() => {
      logger.add('Parent useEffect: creating registry');
      registryRef.current = {
        items: [],
        register(id) {
          logger.add(`Parent registry.register called with id: ${id}`);
          this.items.push(id);
        },
      };
      return () => {
        logger.add('Parent useEffect cleanup');
        registryRef.current = null;
      };
    }, []);

    return createElement('div', { 'data-testid': 'naive-parent' },
      createElement(NaiveChild, { registryRef })
    );
  }

  function NaiveChild({ registryRef }) {
    useEffect(() => {
      logger.add('Child useEffect: attempting to register');
      if (registryRef.current === null) {
        logger.add('ERROR: registry is null at child useEffect');
      } else {
        try {
          registryRef.current.register('child-1');
        } catch (err) {
          logger.add(`ERROR: ${err.message}`);
        }
      }
      return () => {
        logger.add('Child useEffect cleanup');
      };
    }, [registryRef]);

    return createElement('div', { 'data-testid': 'naive-child' });
  }

  return Parent;
}

export function createDesignATest(logger) {
  function Parent() {
    const registryRef = useRef(null);

    useLayoutEffect(() => {
      logger.add('Parent useLayoutEffect: creating registry');
      registryRef.current = {
        items: [],
        register(id) {
          logger.add(`Parent registry.register called with id: ${id}`);
          this.items.push(id);
        },
      };
      return () => {
        logger.add('Parent useLayoutEffect cleanup');
        registryRef.current = null;
      };
    }, []);

    return createElement('div', { 'data-testid': 'design-a-parent' },
      createElement(ChildWithLayoutEffect, { registryRef }),
      createElement(ChildWithEffect, { registryRef })
    );
  }

  function ChildWithLayoutEffect({ registryRef }) {
    useLayoutEffect(() => {
      logger.add('ChildWithLayoutEffect useLayoutEffect: checking registry');
      if (registryRef.current === null) {
        logger.add('ERROR: registry is null at child useLayoutEffect');
      } else {
        registryRef.current.register('child-layout');
      }
      return () => {
        logger.add('ChildWithLayoutEffect useLayoutEffect cleanup');
      };
    }, [registryRef]);

    return createElement('div', { 'data-testid': 'child-layout' });
  }

  function ChildWithEffect({ registryRef }) {
    useEffect(() => {
      logger.add('ChildWithEffect useEffect: checking registry');
      if (registryRef.current === null) {
        logger.add('ERROR: registry is null at child useEffect');
      } else {
        registryRef.current.register('child-effect');
      }
      return () => {
        logger.add('ChildWithEffect useEffect cleanup');
      };
    }, [registryRef]);

    return createElement('div', { 'data-testid': 'child-effect' });
  }

  return Parent;
}

export function createDesignBTest(logger) {
  const RegistryContext = createContext(null);

  function Parent() {
    const [registry] = useState(() => {
      logger.add('Parent useState initializer: creating registry');
      return {
        items: [],
        register(id) {
          logger.add(`Parent registry.register called with id: ${id}`);
          this.items.push(id);
        },
        dispose() {
          logger.add('Parent registry.dispose called');
          this.items = [];
        },
      };
    });

    useEffect(() => {
      logger.add('Parent useEffect setup');
      return () => {
        logger.add('Parent useEffect cleanup: disposing registry');
        registry.dispose();
      };
    }, [registry]);

    return createElement(RegistryContext.Provider, { value: registry },
      createElement('div', { 'data-testid': 'design-b-parent' },
        createElement(ChildFromContext, { id: 'child-layout' }),
        createElement(ChildFromContext, { id: 'child-effect' })
      )
    );
  }

  function ChildFromContext({ id }) {
    const registry = useContext(RegistryContext);

    useLayoutEffect(() => {
      logger.add(`${id} useLayoutEffect: registering`);
      if (registry === null) {
        logger.add(`ERROR: registry is null at ${id} useLayoutEffect`);
      } else {
        registry.register(id);
      }
      return () => {
        logger.add(`${id} useLayoutEffect cleanup`);
      };
    }, [id, registry]);

    useEffect(() => {
      logger.add(`${id} useEffect: checking registry`);
      if (registry === null) {
        logger.add(`ERROR: registry is null at ${id} useEffect`);
      }
      return () => {
        logger.add(`${id} useEffect cleanup`);
      };
    }, [id, registry]);

    return createElement('div', { 'data-testid': id });
  }

  return Parent;
}

export function createDesignCTest(logger) {
  function Parent() {
    const childIdsRef = useRef([]);

    useEffect(() => {
      logger.add(`Parent useEffect: processing ${childIdsRef.current.length} registrations`);
      childIdsRef.current.forEach(id => {
        logger.add(`Parent processing registration: ${id}`);
      });
      return () => {
        logger.add('Parent useEffect cleanup');
      };
    });

    function registerChild(id) {
      logger.add(`Child ${id} calling registerChild (render phase)`);
      if (!childIdsRef.current.includes(id)) {
        childIdsRef.current.push(id);
      }
    }

    return createElement('div', { 'data-testid': 'design-c-parent' },
      createElement(ChildWithCallback, { id: 'child-1', registerChild }),
      createElement(ChildWithCallback, { id: 'child-2', registerChild })
    );
  }

  function ChildWithCallback({ id, registerChild }) {
    registerChild(id);

    useEffect(() => {
      logger.add(`${id} useEffect setup`);
      return () => {
        logger.add(`${id} useEffect cleanup`);
      };
    }, [id]);

    return createElement('div', { 'data-testid': id });
  }

  return Parent;
}

export function createRerenderTest(logger) {
  function Parent() {
    const [count, setCount] = useState(0);

    useLayoutEffect(() => {
      logger.add('Parent useLayoutEffect setup');
      return () => {
        logger.add('Parent useLayoutEffect cleanup');
      };
    }, [count]);

    useEffect(() => {
      logger.add('Parent useEffect setup');
      return () => {
        logger.add('Parent useEffect cleanup');
      };
    }, [count]);

    return createElement('div', { 'data-testid': 'rerender-parent' },
      createElement('button', {
        'data-testid': 'increment-button',
        onClick: () => setCount(c => c + 1),
      }, 'Increment'),
      createElement(ChildWithDeps, { count })
    );
  }

  function ChildWithDeps({ count }) {
    useLayoutEffect(() => {
      logger.add('Child useLayoutEffect setup');
      return () => {
        logger.add('Child useLayoutEffect cleanup');
      };
    }, [count]);

    useEffect(() => {
      logger.add('Child useEffect setup');
      return () => {
        logger.add('Child useEffect cleanup');
      };
    }, [count]);

    return createElement('div', { 'data-testid': 'child-with-deps' }, `Count: ${count}`);
  }

  return Parent;
}

export function createDesignCConditionalTest(logger) {
  function Parent() {
    const [showChild2, setShowChild2] = useState(true);
    const childIdsRef = useRef([]);
    const renderChildIdsRef = useRef([]);

    renderChildIdsRef.current = [];

    useEffect(() => {
      childIdsRef.current = [...renderChildIdsRef.current];
      logger.add(`Parent useEffect: current children: [${childIdsRef.current.join(', ')}]`);
      return () => {
        logger.add('Parent useEffect cleanup');
      };
    });

    function registerChild(id) {
      if (!renderChildIdsRef.current.includes(id)) {
        renderChildIdsRef.current.push(id);
      }
    }

    return createElement('div', { 'data-testid': 'design-c-conditional-parent' },
      createElement('button', {
        'data-testid': 'toggle-button',
        onClick: () => setShowChild2(prev => !prev),
      }, 'Toggle Child2'),
      createElement(ConditionalChild, { id: 'child-1', registerChild }),
      showChild2 && createElement(ConditionalChild, { id: 'child-2', registerChild })
    );
  }

  function ConditionalChild({ id, registerChild }) {
    registerChild(id);

    useEffect(() => {
      logger.add(`${id} useEffect setup`);
      return () => {
        logger.add(`${id} useEffect cleanup`);
      };
    }, [id]);

    return createElement('div', { 'data-testid': id });
  }

  return Parent;
}

export function createDesignCDuplicateTest(logger) {
  function Parent() {
    const registeredIdsRef = useRef(new Set());

    useEffect(() => {
      logger.add(`Parent useEffect: registered ids: [${Array.from(registeredIdsRef.current).join(', ')}]`);
      return () => {
        logger.add('Parent useEffect cleanup');
      };
    });

    function registerChild(id) {
      if (registeredIdsRef.current.has(id)) {
        logger.add(`ERROR: duplicate registration of id: ${id}`);
      } else {
        logger.add(`Registering id: ${id}`);
        registeredIdsRef.current.add(id);
      }
    }

    return createElement('div', { 'data-testid': 'design-c-duplicate-parent' },
      createElement(DuplicateChild, { id: 'same-id', registerChild }),
      createElement(DuplicateChild, { id: 'same-id', registerChild })
    );
  }

  function DuplicateChild({ id, registerChild }) {
    registerChild(id);

    return createElement('div', { 'data-testid': `${id}-child` });
  }

  return Parent;
}
