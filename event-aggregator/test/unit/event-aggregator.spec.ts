import { EventAggregator } from "../../src/index";

// tslint:disable:no-empty
// tslint:disable:typedef

describe("event aggregator", () => {
  describe("subscribe", () => {
    describe("string events", () => {
      it("should not remove another callback when execute called twice", () => {
        const ea = new EventAggregator();
        let data = 0;

        const subscription = ea.subscribe("dinner", () => {});
        ea.subscribe("dinner", () => {
          data = 1;
        });

        subscription.dispose();
        subscription.dispose();

        ea.publish("dinner");

        expect(data).toBe(1);
      });

      it("adds event with callback to the eventLookup object", () => {
        const ea = new EventAggregator();
        const callback = () => {};
        ea.subscribe("dinner", callback);

        expect(ea.eventLookup.dinner.length).toBe(1);
        expect(ea.eventLookup.dinner[0]).toBe(callback);
      });

      it("adds multiple callbacks the same event", () => {
        const ea = new EventAggregator();
        const callback = () => {};
        ea.subscribe("dinner", callback);

        const callback2 = () => {};
        ea.subscribe("dinner", callback2);

        expect(ea.eventLookup.dinner.length).toBe(2);
        expect(ea.eventLookup.dinner[0]).toBe(callback);
        expect(ea.eventLookup.dinner[1]).toBe(callback2);
      });

      it("removes the callback after execution", () => {
        const ea = new EventAggregator();

        const callback = () => {};
        const subscription = ea.subscribe("dinner", callback);

        const callback2 = () => {};
        const subscription2 = ea.subscribe("dinner", callback2);

        expect(ea.eventLookup.dinner.length).toBe(2);
        expect(ea.eventLookup.dinner[0]).toBe(callback);
        expect(ea.eventLookup.dinner[1]).toBe(callback2);

        subscription.dispose();

        expect(ea.eventLookup.dinner.length).toBe(1);
        expect(ea.eventLookup.dinner[0]).toBe(callback2);

        subscription2.dispose();
        expect(ea.eventLookup.dinner.length).toBe(0);
      });

      it("will respond to an event any time it is published", () => {
        const ea = new EventAggregator();
        const callback = () => {};
        ea.subscribe("dinner", callback);

        expect(ea.eventLookup.dinner.length).toBe(1);
        expect(ea.eventLookup.dinner[0]).toBe(callback);

        ea.publish("dinner");
        ea.publish("dinner");
        ea.publish("dinner");

        expect(ea.eventLookup.dinner.length).toBe(1);
        expect(ea.eventLookup.dinner[0]).toBe(callback);
      });

      it("will pass published data to the callback function", () => {
        const ea = new EventAggregator();
        let data: any = null;
        const callback = (d: any) => {
          data = d;
        };
        ea.subscribe("dinner", callback);

        expect(ea.eventLookup.dinner.length).toBe(1);
        expect(ea.eventLookup.dinner[0]).toBe(callback);

        ea.publish("dinner", { foo: "bar" });
        expect(data.foo).toBe("bar");
      });
    });

    describe("handler events", () => {
      it("should not remove another handler when execute called twice", () => {
        const ea = new EventAggregator();
        let data = 0;

        const subscription = ea.subscribe(DinnerEvent, () => {});
        ea.subscribe(AnotherDinnerEvent, () => {
          data = 1;
        });

        subscription.dispose();
        subscription.dispose();

        ea.publish(new AnotherDinnerEvent(""));

        expect(data).toBe(1);
      });

      it("adds handler with messageType and callback to the messageHandlers array", () => {
        const ea = new EventAggregator();
        const callback = () => {};
        ea.subscribe(DinnerEvent, callback);

        expect(ea.messageHandlers.length).toBe(1);
        expect(ea.messageHandlers[0].messageType).toBe(DinnerEvent);
        expect(ea.messageHandlers[0].callback).toBe(callback);
      });

      it("removes the handler after execution", () => {
        const ea = new EventAggregator();
        const callback = () => {};
        const subscription = ea.subscribe(DinnerEvent, callback);

        expect(ea.messageHandlers.length).toBe(1);
        subscription.dispose();
        expect(ea.messageHandlers.length).toBe(0);
      });
    });
  });

  describe("subscribeOnce", () => {
    describe("string events", () => {
      it("adds event with an anynomous function that will execute the callback to the eventLookup object", () => {
        const ea = new EventAggregator();
        const callback = () => {};
        ea.subscribeOnce("dinner", callback);

        expect(ea.eventLookup.dinner.length).toBe(1);
        expect(ea.eventLookup.dinner[0]).not.toBe(callback);
        expect(typeof ea.eventLookup.dinner[0]).toBe("function");
      });

      it("adds multiple callbacks the same event", () => {
        const ea = new EventAggregator();
        const callback = () => {};
        ea.subscribeOnce("dinner", callback);

        const callback2 = () => {};
        ea.subscribeOnce("dinner", callback2);

        expect(ea.eventLookup.dinner.length).toBe(2);
        expect(ea.eventLookup.dinner[0]).not.toBe(callback);
        expect(typeof ea.eventLookup.dinner[0]).toBe("function");
        expect(ea.eventLookup.dinner[1]).not.toBe(callback);
        expect(typeof ea.eventLookup.dinner[1]).toBe("function");
      });

      it("removes the callback after execution", () => {
        const ea = new EventAggregator();
        const callback = () => {};
        const subscription = ea.subscribeOnce("dinner", callback);

        const callback2 = () => {};
        const subscription2 = ea.subscribeOnce("dinner", callback2);

        expect(ea.eventLookup.dinner.length).toBe(2);
        expect(ea.eventLookup.dinner[0]).not.toBe(callback);
        expect(typeof ea.eventLookup.dinner[0]).toBe("function");
        expect(ea.eventLookup.dinner[1]).not.toBe(callback2);
        expect(typeof ea.eventLookup.dinner[1]).toBe("function");

        subscription.dispose();

        expect(ea.eventLookup.dinner.length).toBe(1);
        expect(typeof ea.eventLookup.dinner[0]).toBe("function");

        subscription2.dispose();
        expect(ea.eventLookup.dinner.length).toBe(0);
      });

      it("will respond to an event only once", () => {
        const ea = new EventAggregator();
        let data: any = null;

        const callback = () => {
          data = "something";
        };
        ea.subscribeOnce("dinner", callback);

        expect(ea.eventLookup.dinner.length).toBe(1);
        expect(ea.eventLookup.dinner[0]).not.toBe(callback);
        expect(typeof ea.eventLookup.dinner[0]).toBe("function");

        ea.publish("dinner");
        expect(data).toBe("something");

        expect(ea.eventLookup.dinner.length).toBe(0);

        data = null;
        ea.publish("dinner");
        expect(data).toBe(null);
      });

      it("will pass published data to the callback function", () => {
        const ea = new EventAggregator();

        let data: any = null;
        const callback = (d: any) => {
          data = d;
        };
        ea.subscribeOnce("dinner", callback);

        expect(ea.eventLookup.dinner.length).toBe(1);
        expect(ea.eventLookup.dinner[0]).not.toBe(callback);
        expect(typeof ea.eventLookup.dinner[0]).toBe("function");

        ea.publish("dinner", { foo: "bar" });
        expect(data.foo).toBe("bar");

        data = null;
        ea.publish("dinner");
        expect(data).toBe(null);
      });
    });

    describe("handler events", () => {
      it("adds handler with messageType and callback to the messageHandlers array", () => {
        const ea = new EventAggregator();

        const callback = () => {};
        ea.subscribeOnce(DinnerEvent, callback);

        expect(ea.messageHandlers.length).toBe(1);
        expect(ea.messageHandlers[0].messageType).toBe(DinnerEvent);
        expect(ea.messageHandlers[0].callback).not.toBe(callback);
        expect(typeof ea.messageHandlers[0].callback).toBe("function");
      });

      it("removes the handler after execution", () => {
        const ea = new EventAggregator();
        const callback = () => {};
        const subscription = ea.subscribeOnce(DinnerEvent, callback);

        expect(ea.messageHandlers.length).toBe(1);
        subscription.dispose();
        expect(ea.messageHandlers.length).toBe(0);
      });
    });
  });

  describe("publish", () => {
    describe("string events", () => {
      it("calls the callback functions for the event", () => {
        const ea = new EventAggregator();

        let someData: any;
        let someData2: any;

        const callback = (d: any) => {
          someData = d;
        };
        ea.subscribe("dinner", callback);

        const callback2 = (d: any) => {
          someData2 = d;
        };
        ea.subscribe("dinner", callback2);

        const data = { foo: "bar" };
        ea.publish("dinner", data);

        expect(someData).toBe(data);
        expect(someData2).toBe(data);
      });

      it("does not call the callback functions if subscriber does not exist", () => {
        const ea = new EventAggregator();

        let someData;

        const callback = (data: any) => {
          someData = data;
        };
        ea.subscribe("dinner", callback);

        ea.publish("garbage", {});

        expect(someData).toBeUndefined();
      });

      it("handles errors in subscriber callbacks", () => {
        const ea = new EventAggregator();

        let someMessage: any;

        const crash = () => {
          throw new Error("oops");
        };

        const callback = (message: any) => {
          someMessage = message;
        };

        const data = { foo: "bar" };

        ea.subscribe("dinner", crash);
        ea.subscribe("dinner", callback);
        ea.subscribe("dinner", crash);

        ea.publish("dinner", data);

        expect(someMessage).toBe(data);
      });
    });

    describe("handler events", () => {
      it("calls the callback functions for the event", () => {
        const ea = new EventAggregator();

        let someMessage: any;

        const callback = (message: any) => {
          someMessage = message;
        };
        ea.subscribe(DinnerEvent, callback);

        const americanDinner = new DinnerEvent("Cajun chicken");
        ea.publish(americanDinner);

        expect(someMessage.message).toBe("Cajun chicken");

        const swedishDinner = new DinnerEvent("Meatballs");
        ea.publish(swedishDinner);

        expect(someMessage.message).toBe("Meatballs");
      });

      it("does not call the callback funtions if message is not an instance of the messageType", () => {
        const ea = new EventAggregator();

        let someMessage;

        const callback = (message: string) => {
          someMessage = message;
        };
        ea.subscribe(DinnerEvent, callback);

        ea.publish(new DrinkingEvent());

        expect(someMessage).toBeUndefined();
      });

      it("handles errors in subscriber callbacks", () => {
        const ea = new EventAggregator();

        let someMessage: any;

        const crash = () => {
          throw new Error("oops");
        };

        const callback = (message: string) => {
          someMessage = message;
        };

        const data: any = { foo: "bar" };

        ea.subscribe(DinnerEvent, crash);
        ea.subscribe(DinnerEvent, callback);

        ea.publish(new DinnerEvent(data));

        expect(someMessage.message).toBe(data);
      });
    });
  });
});

class DinnerEvent {
  // tslint:disable-next-line:variable-name
  private _message: string;

  get message(): string {
    return this._message;
  }

  constructor(message: string) {
    this._message = message;
  }
}

class AnotherDinnerEvent {
  // tslint:disable-next-line:variable-name
  private _message: string;

  get message(): string {
    return this._message;
  }

  constructor(message: string) {
    this._message = message;
  }
}

// tslint:disable-next-line:no-unnecessary-class
class DrinkingEvent {}
