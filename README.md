# Feature

- Not used Redux.
- Simple React Custom Hooks ( Code size is small ).
- All processing can be handled asynchronously, eliminating unnecessary processing.

# DataFlow

![data-flow](https://user-images.githubusercontent.com/50164004/61688924-35597980-ad61-11e9-9292-48d0dbc7939b.jpeg)

# install

```
$> npm install use-clutch
```

or

```
$> yarn add use-clutch
```

# Example

```tsx
import * as React from "react";
import { render } from "react-dom";

type Action = { type: "increment" } | { type: "decrement" };

interface StoreType {
  counter: number;
}

const state: StoreType = {
  counter: 0
};

const sleep = (t: number) => new Promise(r => setTimeout(r, t, t));

const reducer = async (state: number, action: Action): Promise<StoreType> => {
  switch (action.type) {
    case "increment":
      await sleep(5000);
      return state + 1;

    case "decrement":
      await sleep(5000);
      return state - 1;

    default:
      return state;
  }
};

const App: React.FC = () => {
  const clutch = useClutch(reducer, store);
  const increment = () =>
    clutch.dispatch("increment", { type: "increment" }).catch(console.error);
  const decrement = () =>
    clutch.dispatch("decrement", { type: "decrement" }).catch(console.error);

  const add = () =>
    clutch
      .pipe(
        "test",
        state => ({ type: "increment" }),
        state => (state.counter > 10 ? null : { type: "increment" })
      )
      .catch(console.error);

  return (
    <div>
      <p>count : {clutch.counter}</p>
      <button onClick={increment}>add</button>
      <button onClick={decrement}>sub</button>
      <button onClick={add}>if one addition is 10 or less, one more add</button>
    </div>
  );
};

render(<App />, document.getElementById("app"));
```

# Playground

[https://codesandbox.io/embed/use-clutch-playground-wnmyx](https://codesandbox.io/embed/use-clutch-playground-wnmyx)

# Reference

## useClutch

`useClutch` is React Custom Hooks.

```javascript
const clutch = useClutch(asyncReducer, initialValue);
```

### Arguments

- `asyncReducer`

  - Description : Reducer which returns Promise instance.
  - Type : `(state: { [key : string] : any }, action: any) => Promise<{ [key : string] : any }>`

- `initializeValue`

  - Description : Initial value of Store. The value must be Object.
  - Type : `{ [key : string] : any }`

### Return Value

- `clutch`

  - Description : Clutch Object.
  - Type : `object`

## dispatch

Dispatch action. However, if the processing of the same request is in progress, it does not dispatch action.

```javascript
const clutch = useClutch(asyncReducer, store);
const promise = clutch.dispatch(request, action_payload);
```

### Arguments

- `request`

  - Description : Request string.
  - Type : `string`

- `action_payload`

  - Description : Value to pass to the second argument of asyncReducer
  - Type : `any`

### Return Value

- `promise`

  - Description : Promise Instance.
  - Type : `Promise<void>`

## pipe

Connect multiple Actions and dispatch as one Action.

```javascript
const clutch = useClutch(asyncReducer, store);
const promise = clutch.pipe(
  request,
  actionCreator,
  actionCreator2
);
```

### Arguments

- `request`

  - Description : Request string.
  - Type : `string`

- `actionCreator`

  - Description : Function to create action. Do nothing if you return Null. The latest state is passed as an argument.
  - Type : `(state : any) => any | null`

### Return Value

- `promise`

  - Description : Promise Instance.
  - Type : `Promise<void>`

## request

Execute unrelated asynchronous processing with clutch. However, if the processing of the same request is in progress, it does not dispatch action.

```javascript
const clutch = useClutch(asyncReducer, store);
const promiseCreator = () => asyncFunction();
const promise = clutch.request(request, promiseCreator);
```

### Arguments

- `request`

  - Description : Request string.
  - Type : `string`

- `promiseCreator`

  - Description : Fucntion to return Promise Instance.
  - Type : `() => Promise<any>`

### Return Value

- `promise`

  - Description : Promise Instance.
  - Type : `Promise<any | null>`

## cancelRequest

Stop a running asynchronous function.

```javascript
const clutch = useClutch(asyncReducer, store);
const promiseCreator = () => asyncFunction();
const promise = clutch.request(request, promiseCreator);
const result = clutch.cancelRequest(request);
```

### Arguments

- `request`

  - Description : Request string to stop.
  - Type : `string`

### Return Value

- `result`

  - Description : Processing result.
  - Type : `boolean`

## listenRequest

Monitor all request.

```javascript
const clutch = useClutch(asyncReducer, store);
const unsubscribe = clutch.listenRequest(listener);
```

### Arguments

- `listener`

  - Description : Function to monitor a request.
  - Type : `(request: string, status: "start" | "success" | "cancel" | "error") => void`

### Return Value

- `unsubscribe`

  - Description : Function to cancel monitoring.
  - Type : `() => void`

## isProgress

Returns whether the passed request is in progress or not.

```javascript
const clutch = useClutch(asyncReducer, store);
const progress = clutch.isProgress(request);
```

### Arguments

- `requeset`

  - Description : Request string.
  - Type : `string`

### Return Value

- `progress`

  - Description : Progress Status.
  - Type : `boolean`

# License

[MIT](LICENSE "LICENSE")
