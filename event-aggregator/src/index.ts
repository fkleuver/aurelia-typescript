import * as LogManager from "aurelia-logging";

const logger = LogManager.getLogger("event-aggregator");

/** @internal */
export class Handler {
  public messageType: Function;
  public callback: Function;

  constructor(messageType: Function, callback: Function) {
    this.messageType = messageType;
    this.callback = callback;
  }

  public handle(message: any): void {
    if (message instanceof this.messageType) {
      this.callback.call(null, message);
    }
  }
}

function invokeCallback(callback: Function, data: any, event: any): void {
  try {
    callback(data, event);
  } catch (e) {
    logger.error(e);
  }
}

function invokeHandler(handler: Handler, data: any): void {
  try {
    handler.handle(data);
  } catch (e) {
    logger.error(e);
  }
}

/**
 * Represents a disposable subsciption to an EventAggregator event.
 */
export interface Subscription {
  /**
   * Disposes the subscription.
   */
  dispose(): void;
}

/**
 * Enables loosely coupled publish/subscribe messaging.
 */
export class EventAggregator {
  /** @internal */
  public eventLookup: { [event: string]: any };
  /** @internal */
  public messageHandlers: Handler[];

  /**
   * Creates an instance of the EventAggregator class.
   */
  constructor() {
    this.eventLookup = {};
    this.messageHandlers = [];
  }

  /**
   * Publishes a message.
   * @param event The event or channel to publish to.
   * @param data The data to publish on the channel.
   */
  public publish(event: string | any, data?: any): void {
    let subscribers;
    let i;

    if (!event) {
      throw new Error("Event was invalid.");
    }

    if (typeof event === "string") {
      subscribers = this.eventLookup[event];
      if (subscribers) {
        subscribers = subscribers.slice();
        i = subscribers.length;

        while (i--) {
          invokeCallback(subscribers[i], data, event);
        }
      }
    } else {
      subscribers = this.messageHandlers.slice();
      i = subscribers.length;

      while (i--) {
        invokeHandler(subscribers[i], event);
      }
    }
  }

  /**
   * Subscribes to a message channel or message type.
   * @param event The event channel or event data type.
   * @param callback The callback to be invoked when when the specified message is published.
   */
  public subscribe(event: string | Function, callback: Function): Subscription {
    let handler: Function | Handler;
    let subscribers: (Function | Handler)[];

    if (!event) {
      throw new Error("Event channel/type was invalid.");
    }

    if (typeof event === "string") {
      handler = callback;
      subscribers = this.eventLookup[event] || (this.eventLookup[event] = []);
    } else {
      handler = new Handler(event, callback);
      subscribers = this.messageHandlers;
    }

    subscribers.push(handler);

    return {
      dispose(): void {
        const idx = subscribers.indexOf(handler);
        if (idx !== -1) {
          subscribers.splice(idx, 1);
        }
      }
    };
  }

  /**
   * Subscribes to a message channel or message type, then disposes the subscription automatically after the first message is received.
   * @param event The event channel or event data type.
   * @param callback The callback to be invoked when when the specified message is published.
   */
  public subscribeOnce(event: string | Function, callback: Function): Subscription {
    // tslint:disable-next-line:no-unnecessary-local-variable
    const sub = this.subscribe(event, (a: any, b: any) => {
      sub.dispose();

      return callback(a, b);
    });

    return sub;
  }
}

/**
 * Includes EA functionality into an object instance.
 * @param obj The object to mix Event Aggregator functionality into.
 */
export function includeEventsIn(obj: any): EventAggregator {
  const ea = new EventAggregator();

  obj.subscribeOnce = (event: string | Function, callback: Function): Subscription => {
    return ea.subscribeOnce(event, callback);
  };

  obj.subscribe = (event: string | Function, callback: Function): Subscription => {
    return ea.subscribe(event, callback);
  };

  obj.publish = (event: string | Function, data: Function): void => {
    ea.publish(event, data);
  };

  return ea;
}

/**
 * Configures a global EA by merging functionality into the Aurelia instance.
 * @param config The Aurelia Framework configuration object used to configure the plugin.
 */
export function configure(config: { aurelia: any; instance(key: any, instance: any): any }): void {
  config.instance(EventAggregator, includeEventsIn(config.aurelia));
}
