import { useRef, useState } from "react";

type Reducer<S, A> = (preState: S, action: A) => Promise<S>;

type CheckReducer<R extends Reducer<any, any>> = R extends (
  state: infer S,
  action: any
) => Promise<any>
  ? S extends object
    ? R
    : Reducer<{ [key: string]: any }, any>
  : Reducer<{ [key: string]: any }, any>;

type GetStoreType<R extends Reducer<any, any>> = R extends Reducer<infer S, any>
  ? S
  : any;

type GetActionType<R extends Reducer<any, any>> = R extends Reducer<
  any,
  infer A
>
  ? A
  : any;

type ActionCreator<S, A> = (preState: S) => A | null;

type RequestStatus = "start" | "success" | "cancel" | "error";

type ListenRequestCallback = (request: string, status: RequestStatus) => void;

type CancelCallback = () => void;

export interface Clutch<StoreType, ActionType> {
  state: StoreType;
  request: <T>(
    req: string,
    promiseCreator: () => Promise<T>
  ) => Promise<T | null>;
  cancelRequest: (request: string) => boolean;
  listenRequest: (cb: ListenRequestCallback) => () => void;
  isProgress: (request?: string) => boolean;
  pipe: (
    request: string,
    ...funcs: Array<ActionCreator<StoreType, ActionType>>
  ) => Promise<void>;
  dispatch: (request: string, action: ActionType) => Promise<void>;
}

interface StateType extends Iterable<any> {
  [key: string]: any;
}

const isDiff = (oldValue: StateType, newValue: StateType): boolean => {
  const oldKeys = Object.keys(oldValue);
  const newKeys = Object.keys(newValue);

  oldKeys.forEach(key => {
    if (newKeys.indexOf(key) === -1) {
      throw new Error(
        "The value of State is not compatible. Check the return value of reducer."
      );
    }
  });

  for (const key in newValue) {
    if (newValue[key] !== oldValue[key]) {
      return true;
    }
  }

  return false;
};

const useClutch = <R extends Reducer<any, any>>(
  asyncReducer: CheckReducer<R>,
  initializeState: GetStoreType<R>
): Clutch<GetStoreType<R>, GetActionType<R>> => {
  type StoreType = GetStoreType<R>;
  type ActionType = GetActionType<R>;

  if (typeof asyncReducer !== "function") {
    throw new Error("Only function can be set to the value of reducer");
  }

  if (typeof initializeState !== "object" || Array.isArray(initializeState)) {
    throw new Error("Only object can be set to the value of state");
  }

  const [pureState, setState] = useState<StoreType>(initializeState);

  const {
    progressCancel,
    progressPromise,
    listenCallbacks,
    notifyRequest,
    resolveAsync,
    updateState,
    clutch
  } = useRef({
    progressCancel: new Map<string, CancelCallback>(),
    progressPromise: new Map<string, Promise<any>>(),
    listenCallbacks: new Set<ListenRequestCallback>(),

    notifyRequest: (request: string, status: RequestStatus) => {
      listenCallbacks.forEach(cb => cb(request, status));
    },

    resolveAsync: <T>(
      request: string,
      cb: () => Promise<T>
    ): Promise<T | null> => {
      notifyRequest(request, "start");

      const cancelCallback = new Promise<"cancel">(re => {
        progressCancel.set(request, () => re("cancel"));
      });

      const progress = Promise.race([cb(), cancelCallback])
        .then(result => {
          notifyRequest(request, result === "cancel" ? "cancel" : "success");

          progressCancel.delete(request);
          progressPromise.delete(request);

          return result === "cancel" ? null : result;
        })
        .catch(e => {
          notifyRequest(request, "error");

          progressCancel.delete(request);
          progressPromise.delete(request);

          return Promise.reject(e);
        });

      progressPromise.set(request, progress);

      return progress;
    },

    updateState: async (
      request: string,
      oldState: StoreType,
      promiseCreator: (oldState: StoreType) => Promise<StoreType>
    ) => {
      const newState = await resolveAsync(request, () =>
        promiseCreator(oldState)
      );

      if (typeof newState !== "object" || Array.isArray(newState)) {
        throw new Error(
          "The returned State value is invalid. State can only be set as object"
        );
      }

      if (newState && isDiff(clutch.state, newState)) {
        clutch.state = { ...newState };
        setState(clutch.state);
      }
    },

    clutch: {
      state: pureState,

      isProgress: (request?: string): boolean => {
        if (request) {
          return progressPromise.has(request);
        }

        return !!progressPromise.size;
      },

      request: <T>(
        req: string,
        promiseCreator: () => Promise<T>
      ): Promise<T | null> => {
        return resolveAsync<T>(req, promiseCreator);
      },

      cancelRequest: (request: string): boolean => {
        const cancel = progressCancel.get(request);

        if (cancel) {
          cancel();
          return true;
        } else {
          return false;
        }
      },

      listenRequest: (cb: ListenRequestCallback): (() => void) => {
        listenCallbacks.add(cb);
        return () => listenCallbacks.delete(cb);
      },

      pipe: async (
        request: string,
        ...funcs: Array<ActionCreator<StoreType, ActionType>>
      ): Promise<void> => {
        const promise = progressPromise.get(request);

        if (promise) {
          return;
        }

        const promiseCreator = async (oldState: StoreType) => {
          for (const fn of funcs) {
            const action = fn(oldState);

            if (action) {
              oldState = await asyncReducer(oldState, action);
            }
          }

          return oldState;
        };

        await updateState(request, { ...clutch.state }, promiseCreator);
      },

      dispatch: async (request: string, action: ActionType): Promise<void> => {
        const promise = progressPromise.get(request);

        if (promise) {
          return;
        }

        const promiseCreator = (oldState: StoreType) => {
          return asyncReducer(oldState, action);
        };

        await updateState(request, { ...clutch.state }, promiseCreator);
      }
    }
  }).current;

  return clutch;
};

export { useClutch };

export default useClutch;
