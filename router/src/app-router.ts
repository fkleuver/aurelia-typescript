import { Container } from "aurelia-dependency-injection";
import { EventAggregator } from "aurelia-event-aggregator";
import { History } from "aurelia-history";
import * as LogManager from "aurelia-logging";
import { ViewPort } from "./interfaces";
import { isNavigationCommand } from "./navigation-commands";
import { NavigationInstruction } from "./navigation-instruction";
import { PipelineResult } from "./pipeline";
import { PipelineProvider } from "./pipeline-provider";
import { Router } from "./router";
import { RouterConfiguration } from "./router-configuration";

const logger = LogManager.getLogger("app-router");

/**
 * The main application router.
 */
export class AppRouter extends Router {
  public pipelineProvider: PipelineProvider;
  public events: EventAggregator;

  public maxInstructionCount: number;
  public isActive: boolean;

  // tslint:disable-next-line:function-name
  public static get inject(): Function[] {
    return [Container, History, PipelineProvider, EventAggregator];
  }

  // tslint:disable-next-line:variable-name
  private _queue: NavigationInstruction[];

  constructor(container: Container, history: History, pipelineProvider: PipelineProvider, events: EventAggregator) {
    super(container, history); //Note the super will call reset internally.
    this.pipelineProvider = pipelineProvider;
    this.events = events;
  }

  /**
   * Fully resets the router's internal state. Primarily used internally by the framework when multiple calls to setRoot are made.
   * Use with caution (actually, avoid using this). Do not use this to simply change your navigation model.
   */
  public reset(): void {
    super.reset();
    this.maxInstructionCount = 10;
    if (!this._queue) {
      this._queue = [];
    } else {
      this._queue.length = 0;
    }
  }

  /**
   * Loads the specified URL.
   *
   * @param url The URL fragment to load.
   */
  public async loadUrl(url: string): Promise<PipelineResult | void> {
    try {
      const instruction = await this._createNavigationInstruction(url);

      return this._queueInstruction(instruction);
    } catch (error) {
      logger.error(error);
      restorePreviousLocation(this);
    }
  }

  /**
   * Registers a viewPort to be used as a rendering target for activated routes.
   *
   * @param viewPort The viewPort.
   * @param name The name of the viewPort. 'default' if unspecified.
   */
  public async registerViewPort(viewPort: ViewPort, name: string): Promise<void> {
    super.registerViewPort(viewPort, name);

    if (!this.isActive) {
      const viewModel = this._findViewModel(viewPort);
      if ("configureRouter" in viewModel) {
        if (!this.isConfigured) {
          const resolveConfiguredPromise = this._resolveConfiguredPromise;
          // tslint:disable-next-line:no-empty
          this._resolveConfiguredPromise = (): void => {};

          await this.configure((config: RouterConfiguration) => viewModel.configureRouter(config, this));
          this.activate();
          resolveConfiguredPromise();
        }
      } else {
        this.activate();
      }
    } else {
      this._dequeueInstruction();
    }
  }

  /**
   * Activates the router. This instructs the router to begin listening for history changes and processing instructions.
   *
   * @params options The set of options to activate the router with.
   */
  public activate(options?: Object): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.options = { routeHandler: this.loadUrl.bind(this), ...this.options, ...options };
    this.history.activate(this.options);
    this._dequeueInstruction();
  }

  /**
   * Deactivates the router.
   */
  public deactivate(): void {
    this.isActive = false;
    this.history.deactivate();
  }

  // tslint:disable-next-line:function-name
  public async _queueInstruction(instruction: NavigationInstruction): Promise<PipelineResult> {
    // tslint:disable-next-line:promise-must-complete
    return new Promise((resolve: (value?: PipelineResult) => void): void => {
      instruction.resolve = resolve;
      this._queue.unshift(instruction);
      this._dequeueInstruction();
    });
  }

  // tslint:disable-next-line:function-name
  public async _dequeueInstruction(instructionCount: number = 0): Promise<any> {
    if (this.isNavigating && !instructionCount) {
      return undefined;
    }

    const instruction = this._queue.shift();
    this._queue.length = 0;

    if (!instruction) {
      return undefined;
    }

    this.isNavigating = true;

    let navtracker: number = this.history.getState("NavigationTracker");
    if (!navtracker && !this.currentNavigationTracker) {
      this.isNavigatingFirst = true;
      this.isNavigatingNew = true;
    } else if (!navtracker) {
      this.isNavigatingNew = true;
    } else if (!this.currentNavigationTracker) {
      this.isNavigatingRefresh = true;
    } else if (this.currentNavigationTracker < navtracker) {
      this.isNavigatingForward = true;
    } else if (this.currentNavigationTracker > navtracker) {
      this.isNavigatingBack = true;
    }
    if (!navtracker) {
      navtracker = Date.now();
      this.history.setState("NavigationTracker", navtracker);
    }
    this.currentNavigationTracker = navtracker;

    instruction.previousInstruction = this.currentInstruction;

    if (!instructionCount) {
      this.events.publish("router:navigation:processing", { instruction });
    } else if (instructionCount === this.maxInstructionCount - 1) {
      logger.error(
        `${instructionCount +
          1} navigation instructions have been attempted without success. Restoring last known good location.`
      );
      restorePreviousLocation(this);

      return this._dequeueInstruction(instructionCount + 1);
    } else if (instructionCount > this.maxInstructionCount) {
      throw new Error("Maximum navigation attempts exceeded. Giving up.");
    }

    const pipeline = this.pipelineProvider.createPipeline();
    let result: PipelineResult;
    try {
      result = await pipeline.run(instruction);
      result = await processResult(instruction, result, instructionCount, this);
    } catch (error) {
      return { output: error instanceof Error ? error : new Error(error) };
    }

    return resolveInstruction(instruction, result, !!instructionCount, this);
  }

  // tslint:disable-next-line:function-name
  private _findViewModel(viewPort: ViewPort): any {
    if ((this.container as any).viewModel) {
      return (this.container as any).viewModel;
    }

    if (viewPort.container) {
      let container = viewPort.container;

      while (container) {
        if ((container as any).viewModel) {
          (this.container as any).viewModel = (container as any).viewModel;

          return (container as any).viewModel;
        }

        container = container.parent;
      }
    }

    return undefined;
  }
}

async function processResult(
  // tslint:disable-next-line:variable-name
  _instruction: NavigationInstruction,
  result: PipelineResult,
  instructionCount: number,
  router: AppRouter
): Promise<PipelineResult> {
  if (!(result && "completed" in result && "output" in result)) {
    // tslint:disable-next-line:no-parameter-reassignment
    result = result || ({} as any);
    result.output = new Error(
      `Expected router pipeline to return a navigation result, but got [${JSON.stringify(result)}] instead.`
    );
  }

  let finalResult = null as any;
  if (isNavigationCommand(result.output)) {
    result.output.navigate(router);
  } else {
    finalResult = result;

    if (!result.completed) {
      if (result.output instanceof Error) {
        logger.error(result.output as any);
      }

      restorePreviousLocation(router);
    }
  }

  const innerResult = await router._dequeueInstruction(instructionCount + 1);

  return finalResult || innerResult || result;
}

function resolveInstruction(
  instruction: NavigationInstruction,
  result: PipelineResult,
  isInnerInstruction: boolean,
  router: AppRouter
): PipelineResult {
  instruction.resolve(result);

  const eventArgs = { instruction, result };
  if (!isInnerInstruction) {
    router.isNavigating = false;
    router.isExplicitNavigation = false;
    router.isExplicitNavigationBack = false;
    router.isNavigatingFirst = false;
    router.isNavigatingNew = false;
    router.isNavigatingRefresh = false;
    router.isNavigatingForward = false;
    router.isNavigatingBack = false;

    let eventName;

    if (result.output instanceof Error) {
      eventName = "error";
    } else if (!result.completed) {
      eventName = "canceled";
    } else {
      const queryString = instruction.queryString ? `?${instruction.queryString}` : "";
      (router.history as any).previousLocation = instruction.fragment + queryString;
      eventName = "success";
    }

    router.events.publish(`router:navigation:${eventName}`, eventArgs);
    router.events.publish("router:navigation:complete", eventArgs);
  } else {
    router.events.publish("router:navigation:child:complete", eventArgs);
  }

  return result;
}

function restorePreviousLocation(router: Router): void {
  const previousLocation = (router.history as any).previousLocation;
  if (previousLocation) {
    router.navigate(previousLocation, { trigger: false, replace: true });
  } else if (router.fallbackRoute) {
    router.navigate(router.fallbackRoute, { trigger: true, replace: true });
  } else {
    logger.error("Router navigation failed, and no previous location or fallbackRoute could be restored.");
  }
}
