define(["require", "exports", "aurelia-logging"], function (require, exports, LogManager) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const logger = LogManager.getLogger("event-aggregator");
    /** @internal */
    class Handler {
        constructor(messageType, callback) {
            this.messageType = messageType;
            this.callback = callback;
        }
        handle(message) {
            if (message instanceof this.messageType) {
                this.callback.call(null, message);
            }
        }
    }
    exports.Handler = Handler;
    function invokeCallback(callback, data, event) {
        try {
            callback(data, event);
        }
        catch (e) {
            logger.error(e);
        }
    }
    function invokeHandler(handler, data) {
        try {
            handler.handle(data);
        }
        catch (e) {
            logger.error(e);
        }
    }
    /**
     * Enables loosely coupled publish/subscribe messaging.
     */
    class EventAggregator {
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
        publish(event, data) {
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
            }
            else {
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
        subscribe(event, callback) {
            let handler;
            let subscribers;
            if (!event) {
                throw new Error("Event channel/type was invalid.");
            }
            if (typeof event === "string") {
                handler = callback;
                subscribers = this.eventLookup[event] || (this.eventLookup[event] = []);
            }
            else {
                handler = new Handler(event, callback);
                subscribers = this.messageHandlers;
            }
            subscribers.push(handler);
            return {
                dispose() {
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
        subscribeOnce(event, callback) {
            // tslint:disable-next-line:no-unnecessary-local-variable
            const sub = this.subscribe(event, (a, b) => {
                sub.dispose();
                return callback(a, b);
            });
            return sub;
        }
    }
    exports.EventAggregator = EventAggregator;
    /**
     * Includes EA functionality into an object instance.
     * @param obj The object to mix Event Aggregator functionality into.
     */
    function includeEventsIn(obj) {
        const ea = new EventAggregator();
        obj.subscribeOnce = (event, callback) => {
            return ea.subscribeOnce(event, callback);
        };
        obj.subscribe = (event, callback) => {
            return ea.subscribe(event, callback);
        };
        obj.publish = (event, data) => {
            ea.publish(event, data);
        };
        return ea;
    }
    exports.includeEventsIn = includeEventsIn;
    /**
     * Configures a global EA by merging functionality into the Aurelia instance.
     * @param config The Aurelia Framework configuration object used to configure the plugin.
     */
    function configure(config) {
        config.instance(EventAggregator, includeEventsIn(config.aurelia));
    }
    exports.configure = configure;
});
//# sourceMappingURL=index.js.map