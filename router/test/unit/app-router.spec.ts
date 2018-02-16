// tslint:disable
import { History } from "aurelia-history";
import { Container } from "aurelia-dependency-injection";
import { AppRouter } from "../../src/app-router";
import { RouteLoader } from "../../src/route-loading";
import { Pipeline } from "../../src/pipeline";

class MockHistory extends History {
  activate(): any {}
  deactivate() {}
  navigate(): any {}
  navigateBack() {}
  setState(key: any, value: any) {}
  getState(key: any) {
    return null;
  }
}

class MockLoader extends RouteLoader {
  loadRoute(router: any, config: any) {
    return Promise.resolve({
      viewModel: {}
    });
  }
}

describe("app-router", () => {
  let router: any;
  let history: any;
  let ea: any;
  let viewPort: any;
  let container: any;
  let instruction: any;
  let provider: any;
  let pipelineStep: any;

  beforeEach(() => {
    history = new MockHistory();
    container = new Container();
    container.registerSingleton(RouteLoader, MockLoader);
    ea = { publish() {} };
    viewPort = {
      process(viewPortInstruction: any) {
        viewPortInstruction.behavior = {};
        return Promise.resolve();
      },
      swap() {}
    };

    instruction = { resolve() {} };
    provider = {
      createPipeline() {
        let p = new Pipeline();
        p.addStep({
          run(inst, next) {
            return pipelineStep(inst, next);
          }
        });
        return p;
      }
    };

    router = new AppRouter(container, history, provider, ea);
  });

  it("configures from root view model configureRouter method", done => {
    let routeConfig = { route: "", moduleId: "./test" };
    let viewModel = {
      configureRouter(config: any) {
        config.map([routeConfig]);
      }
    };

    spyOn(viewModel, "configureRouter").and.callThrough();

    container.viewModel = viewModel;

    expect(router.isConfigured).toBe(false);
    expect(router.routes.length).toBe(0);

    Promise.resolve(router.registerViewPort(viewPort)).then(result => {
      expect(viewModel.configureRouter).toHaveBeenCalled();
      expect(router.isConfigured).toBe(true);
      expect(router.routes.length).toBe(1);
      expect(router.routes[0]).toEqual(jasmine.objectContaining(routeConfig));
      done();
    });
  });

  it("configures only once with multiple viewPorts", done => {
    let routeConfig = { route: "", moduleId: "./test" };
    let viewModel = {
      configureRouter(config: any) {
        config.map([routeConfig]);
      }
    };

    spyOn(viewModel, "configureRouter").and.callThrough();

    container.viewModel = viewModel;

    Promise.all([router.registerViewPort(viewPort), router.registerViewPort(viewPort, "second")]).then(result => {
      expect((viewModel.configureRouter as any).calls.count()).toBe(1);
      expect(router.isConfigured).toBe(true);
      expect(router.routes.length).toBe(1);
      done();
    });
  });

  describe("dequeueInstruction", () => {
    let processingResult: any;
    let completedResult: any;

    beforeEach(() => {
      router._queue.push(instruction);

      spyOn(ea, "publish");
      processingResult = jasmine.objectContaining({ instruction });
      completedResult = jasmine.objectContaining({ instruction, result: jasmine.objectContaining({}) });
    });

    it("triggers events on successful navigations", done => {
      pipelineStep = (ctx: any, next: any) => next.complete({});

      router
        ._dequeueInstruction()
        .then((result: any) => {
          expect(ea.publish).toHaveBeenCalledWith("router:navigation:processing", processingResult);
          expect(ea.publish).toHaveBeenCalledWith("router:navigation:success", completedResult);
          expect(ea.publish).toHaveBeenCalledWith("router:navigation:complete", completedResult);
        })
        .catch(expectSuccess)
        .then(done);
    });

    it("returns expected results from successful navigations", done => {
      let output = {};
      pipelineStep = (ctx: any, next: any) => next.complete(output);

      router
        ._dequeueInstruction()
        .then((result: any) => {
          expect(result.completed).toBe(true);
          expect(result.status).toBe("completed");
          expect(result.output).toBe(output);
        })
        .catch(expectSuccess)
        .then(done);
    });

    it("triggers events on canceled navigations", done => {
      pipelineStep = (ctx: any, next: any) => next.cancel("test");

      router
        ._dequeueInstruction()
        .then((result: any) => {
          expect(ea.publish).toHaveBeenCalledWith("router:navigation:processing", processingResult);
          expect(ea.publish).toHaveBeenCalledWith("router:navigation:canceled", completedResult);
          expect(ea.publish).toHaveBeenCalledWith("router:navigation:complete", completedResult);
        })
        .catch(expectSuccess)
        .then(done);
    });

    it("returns expected results from canceled navigations", done => {
      let output = {};
      pipelineStep = (ctx: any, next: any) => next.cancel(output);

      router
        ._dequeueInstruction()
        .then((result: any) => {
          expect(result.completed).toBe(false);
          expect(result.status).toBe("canceled");
          expect(result.output).toBe(output);
        })
        .catch(expectSuccess)
        .then(done);
    });

    it("triggers events on error navigations", done => {
      pipelineStep = (ctx: any, next: any) => {
        throw new Error("test");
      };

      router
        ._dequeueInstruction()
        .then((result: any) => {
          expect(ea.publish).toHaveBeenCalledWith("router:navigation:processing", processingResult);
          expect(ea.publish).toHaveBeenCalledWith("router:navigation:error", completedResult);
          expect(ea.publish).toHaveBeenCalledWith("router:navigation:complete", completedResult);
        })
        .catch(expectSuccess)
        .then(done);
    });

    it("returns expected results from error navigations", done => {
      let output = new Error("test");
      pipelineStep = (ctx: any, next: any) => next.reject(output);

      router
        ._dequeueInstruction()
        .then((result: any) => {
          expect(result.completed).toBe(false);
          expect(result.status).toBe("rejected");
          expect(result.output).toBe(output);
        })
        .catch(expectSuccess)
        .then(done);
    });
  });

  describe("loadUrl", () => {
    it("restores previous location when route not found", done => {
      spyOn(history, "navigate");

      router.history.previousLocation = "prev";
      router
        .loadUrl("next")
        .then((result: any) => {
          expect(result).toBeFalsy();
          expect(history.navigate).toHaveBeenCalledWith("#/prev", { trigger: false, replace: true });
        })
        .catch((result: any) => expect(true).toBeFalsy("should have succeeded"))
        .then(done);
    });

    it("navigate to fallback route when route not found and there is no previous location", done => {
      spyOn(history, "navigate");

      router.history.previousLocation = null;
      router.fallbackRoute = "fallback";
      router
        .loadUrl("next")
        .then((result: any) => {
          expect(result).toBeFalsy();
          expect(history.navigate).toHaveBeenCalledWith("#/fallback", { trigger: true, replace: true });
        })
        .catch((result: any) => expect(true).toBeFalsy("should have succeeded"))
        .then(done);
    });

    it("restores previous location on error", done => {
      spyOn(history, "navigate");

      router.history.previousLocation = "prev";
      router.activate();
      router.configure((config: any) => {
        config.map([{ name: "test", route: "", moduleId: "./test" }]);
      });

      router
        .loadUrl("next")
        .then((result: any) => {
          expect(result).toBeFalsy();
          expect(history.navigate).toHaveBeenCalledWith("#/prev", { trigger: false, replace: true });
        })
        .catch((result: any) => expect(true).toBeFalsy("should have succeeded"))
        .then(done);
    });
  });
});

function expectSuccess(result: any) {
  expect(result).not.toBe(result, "should have succeeded");
}
