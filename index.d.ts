declare type Reducer<S, A> = (preState: S, action: A) => Promise<S>;
declare type CheckReducer<R extends Reducer<any, any>> = R extends (state: infer S, action: any) => Promise<any> ? S extends object ? R : Reducer<{
    [key: string]: any;
}, any> : Reducer<{
    [key: string]: any;
}, any>;
declare type GetStoreType<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : any;
declare type GetActionType<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : any;
declare type ActionCreator<S, A> = (preState: S) => A | null;
declare type RequestStatus = "start" | "success" | "cancel" | "error";
declare type ListenRequestCallback = (request: string, status: RequestStatus) => void;
export interface Clutch<StoreType, ActionType> {
    state: StoreType;
    request: <T>(req: string, promiseCreator: () => Promise<T>) => Promise<T | null>;
    cancelRequest: (request: string) => boolean;
    listenRequest: (cb: ListenRequestCallback) => () => void;
    isProgress: (request?: string) => boolean;
    pipe: (request: string, ...funcs: Array<ActionCreator<StoreType, ActionType>>) => Promise<void>;
    dispatch: (request: string, action: ActionType) => Promise<void>;
}
declare const useClutch: <R extends Reducer<any, any>>(asyncReducer: CheckReducer<R>, initializeState: GetStoreType<R>) => Clutch<GetStoreType<R>, GetActionType<R>>;
export { useClutch };
export default useClutch;
