/**
 * Unwrap values if they are promise or stream
 * @param {any[]} args inputs that may be streams, promises or values
 * @param {(arg: any[]) => any} resolve callback to run when all ready
 * @param {StreamAdapter?} streamAdapter
 */
export default function unbox(args, resolve, streamAdapter) {
  const hasPromise = args.find(a => a instanceof Promise || a?.whenReady);      // Стримы некоторых видов могут делать вид, что они промисы, имея метод whenReady
  const hasStreams = !!streamAdapter && !!args.find(streamAdapter.isStream);

  if (hasStreams) {
    // 1. live all streams ASAP
    args.filter(streamAdapter.isStream).map(streamAdapter.retain);

    // TODO: add loading state
    const evaluatedArgs = args.map(a => streamAdapter.isStream(a) ? streamAdapter.getLastValue(a) : a);

    /**
     * The stream that will be returned
     */
    let outputStream;
    const subscriptions = [];
    /**
     * The stream that might be returned when evaluated inner expression
     * @template T
     * @type {Stream<T>}
     */
    let resultStream;
    let resultStreamSubscription;

    const disposeResultStream = () => {                                                             // handler - dispose resultStream if any
      if (resultStreamSubscription) {
        resultStreamSubscription.dispose?.();
        resultStreamSubscription = null;
      }
      if (resultStream) {
        streamAdapter.release(resultStream);
        resultStream = null;
      }
    }

    const dispose = () => {                                                                         // handler - dispose all dependencies
      disposeResultStream();
      subscriptions.forEach(subscription => subscription?.dispose?.());                             // unsubscribe all subscriptions
      args.filter(a => streamAdapter?.isStream(a)).forEach(streamAdapter.release);                  // and free streams
    };

    /**
     * send the value down
     * @param value
     */
    const onNextValue = (value) => {                                                                // when we have extracted value from result
      streamAdapter.next(outputStream, value);
    }

    const onNextResult = (result) => {                                                              // will be called on next result to be pushed into stream
      if (streamAdapter.isStream(result)) {                                                         // when result is stream itself
        if (resultStream !== result) {                                                              // and only when new stream is received
          disposeResultStream();
          resultStream = result;
          streamAdapter.retain(resultStream);                                                       // we need it for some time
          onNextValue(streamAdapter.getLastValue(resultStream));
          resultStreamSubscription = streamAdapter.subscribe(resultStream, onNextValue);
        }
      } else {                                                                                      // when result is just value (TODO: Promise)
        disposeResultStream();                                                                      // we don't need stream any more if it was on previous result
        onNextValue(result);
      }
    }

    outputStream = streamAdapter.createStream(undefined, dispose);
    onNextResult(resolve(evaluatedArgs));

    args.forEach((a, idx) => {
      if (streamAdapter.isStream(a)) {
        subscriptions.push(                                                                         // save subscription in order to dispose later
            streamAdapter.subscribe(a, (value) => {
              evaluatedArgs[idx] = value;                                                             // update arguments
              onNextResult(resolve(evaluatedArgs))
            }));
      }
    });

    return outputStream;

  } else if (hasPromise) {
    // Возможно, пришли стримы. Постулируем что может быть метод whenReady у стримов, который работает как пропим
    return Promise.all(args.map(r => r?.whenReady?.() ?? r)).then(resolve);

  } else {
    return resolve(args);                                                                           // TODO check if stream or promise returned
  }
}
