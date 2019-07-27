"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const isDiff = (oldValue, newValue) => {
    const oldKeys = Object.keys(oldValue);
    const newKeys = Object.keys(newValue);
    oldKeys.forEach(key => {
        if (newKeys.indexOf(key) === -1) {
            throw new Error("The value of State is not compatible. Check the return value of reducer.");
        }
    });
    for (const key in newValue) {
        if (newValue[key] !== oldValue[key]) {
            return true;
        }
    }
    return false;
};
const useClutch = (asyncReducer, initializeState) => {
    if (typeof asyncReducer !== "function") {
        throw new Error("Only function can be set to the value of reducer");
    }
    if (typeof initializeState !== "object" || Array.isArray(initializeState)) {
        throw new Error("Only object can be set to the value of state");
    }
    const [pureState, setState] = react_1.useState(initializeState);
    const { progressCancel, progressPromise, listenCallbacks, notifyRequest, resolveAsync, updateState, clutch } = react_1.useRef({
        progressCancel: new Map(),
        progressPromise: new Map(),
        listenCallbacks: new Set(),
        notifyRequest: (request, status) => {
            listenCallbacks.forEach(cb => cb(request, status));
        },
        resolveAsync: (request, cb) => {
            notifyRequest(request, "start");
            const cancelCallback = new Promise(re => {
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
        updateState: (request, oldState, promiseCreator) => __awaiter(this, void 0, void 0, function* () {
            const newState = yield resolveAsync(request, () => promiseCreator(oldState));
            if (typeof newState !== "object" || Array.isArray(newState)) {
                throw new Error("The returned State value is invalid. State can only be set as object");
            }
            if (newState && isDiff(clutch.state, newState)) {
                clutch.state = Object.assign({}, newState);
                setState(clutch.state);
            }
        }),
        clutch: {
            state: pureState,
            isProgress: (request) => {
                if (request) {
                    return progressPromise.has(request);
                }
                return !!progressPromise.size;
            },
            request: (req, promiseCreator) => {
                const progress = progressPromise.get(req);
                if (progress) {
                    return progress;
                }
                return resolveAsync(req, promiseCreator);
            },
            cancelRequest: (request) => {
                const cancel = progressCancel.get(request);
                if (cancel) {
                    cancel();
                    return true;
                }
                else {
                    return false;
                }
            },
            listenRequest: (cb) => {
                listenCallbacks.add(cb);
                return () => listenCallbacks.delete(cb);
            },
            pipe: (request, ...funcs) => __awaiter(this, void 0, void 0, function* () {
                const promise = progressPromise.get(request);
                if (promise) {
                    return promise;
                }
                const promiseCreator = (state) => __awaiter(this, void 0, void 0, function* () {
                    for (const fn of funcs) {
                        const action = fn(state);
                        if (action) {
                            state = yield asyncReducer(state, action);
                        }
                    }
                    return state;
                });
                yield updateState(request, Object.assign({}, clutch.state), promiseCreator);
            }),
            dispatch: (request, action) => __awaiter(this, void 0, void 0, function* () {
                const promise = progressPromise.get(request);
                if (promise) {
                    return promise;
                }
                const promiseCreator = (oldState) => {
                    return asyncReducer(oldState, action);
                };
                yield updateState(request, Object.assign({}, clutch.state), promiseCreator);
            })
        }
    }).current;
    return clutch;
};
exports.useClutch = useClutch;
exports.default = useClutch;
