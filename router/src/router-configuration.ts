import { AppRouter } from "./app-router";
import { RouteConfig, ViewPortConfig } from "./interfaces";
import { NavigationInstruction } from "./navigation-instruction";
import { PipelineStep } from "./pipeline";
import { Router } from "./router";

/**
 * Class used to configure a [[Router]] instance.
 */
export class RouterConfiguration {
  public instructions: ((router: Router) => void)[] = [];
  public options: any = {};
  public pipelineSteps: ({ name: string; step: Function | PipelineStep })[] = [];
  public title: string;
  public unknownRouteConfig: any;
  public viewPortDefaults: any;

  // tslint:disable-next-line:variable-name
  private _fallbackRoute: string;

  /**
   * Adds a step to be run during the [[Router]]'s navigation pipeline.
   *
   * @param name The name of the pipeline slot to insert the step into.
   * @param step The pipeline step.
   * @chainable
   */
  public addPipelineStep(name: string, step: Function | PipelineStep): RouterConfiguration {
    this.pipelineSteps.push({ name, step });

    return this;
  }

  /**
   * Adds a step to be run during the [[Router]]'s authorize pipeline slot.
   *
   * @param step The pipeline step.
   * @chainable
   */
  public addAuthorizeStep(step: Function | PipelineStep): RouterConfiguration {
    return this.addPipelineStep("authorize", step);
  }

  /**
   * Adds a step to be run during the [[Router]]'s preActivate pipeline slot.
   *
   * @param step The pipeline step.
   * @chainable
   */
  public addPreActivateStep(step: Function | PipelineStep): RouterConfiguration {
    return this.addPipelineStep("preActivate", step);
  }

  /**
   * Adds a step to be run during the [[Router]]'s preRender pipeline slot.
   *
   * @param step The pipeline step.
   * @chainable
   */
  public addPreRenderStep(step: Function | PipelineStep): RouterConfiguration {
    return this.addPipelineStep("preRender", step);
  }

  /**
   * Adds a step to be run during the [[Router]]'s postRender pipeline slot.
   *
   * @param step The pipeline step.
   * @chainable
   */
  public addPostRenderStep(step: Function | PipelineStep): RouterConfiguration {
    return this.addPipelineStep("postRender", step);
  }

  /**
   * Configures a route that will be used if there is no previous location available on navigation cancellation.
   *
   * @param fragment The URL fragment to use as the navigation destination.
   * @chainable
   */
  public fallbackRoute(fragment: string): RouterConfiguration {
    this._fallbackRoute = fragment;

    return this;
  }

  /**
   * Maps one or more routes to be registered with the router.
   *
   * @param route The [[RouteConfig]] to map, or an array of [[RouteConfig]] to map.
   * @chainable
   */
  public map(route: RouteConfig | RouteConfig[]): RouterConfiguration {
    if (Array.isArray(route)) {
      route.forEach(this.map.bind(this));

      return this;
    }

    return this.mapRoute(route);
  }

  /**
   * Configures defaults to use for any view ports.
   *
   * @param viewPortConfig a view port configuration object to use as a
   *  default, of the form { viewPortName: { moduleId } }.
   * @chainable
   */
  public useViewPortDefaults(viewPortConfig: ViewPortConfig): RouterConfiguration {
    this.viewPortDefaults = viewPortConfig;

    return this;
  }

  /**
   * Maps a single route to be registered with the router.
   *
   * @param route The [[RouteConfig]] to map.
   * @chainable
   */
  public mapRoute(config: RouteConfig): RouterConfiguration {
    this.instructions.push((router: Router) => {
      const routeConfigs = [];

      if (Array.isArray(config.route)) {
        for (const route of config.route) {
          routeConfigs.push({ ...config, route });
        }
      } else {
        routeConfigs.push({ ...config });
      }

      let navModel;
      for (const routeConfig of routeConfigs) {
        routeConfig.settings = routeConfig.settings || {};
        if (!navModel) {
          navModel = router.createNavModel(routeConfig);
        }

        router.addRoute(routeConfig, navModel);
      }
    });

    return this;
  }

  /**
   * Registers an unknown route handler to be run when the URL fragment doesn't match any registered routes.
   *
   * @param config A string containing a moduleId to load, or a [[RouteConfig]], or a function that takes the
   *  [[NavigationInstruction]] and selects a moduleId to load.
   * @chainable
   */
  public mapUnknownRoutes(
    config:
      | string
      | RouteConfig
      | ((instruction: NavigationInstruction) => string | RouteConfig | Promise<string | RouteConfig>)
  ): RouterConfiguration {
    this.unknownRouteConfig = config;

    return this;
  }

  /**
   * Applies the current configuration to the specified [[Router]].
   *
   * @param router The [[Router]] to apply the configuration to.
   */
  public exportToRouter(router: Router): void {
    const instructions = this.instructions;
    for (const instruction of instructions) {
      instruction(router);
    }

    if (this.title) {
      router.title = this.title;
    }

    if (this.unknownRouteConfig) {
      router.handleUnknownRoutes(this.unknownRouteConfig);
    }

    if (this._fallbackRoute) {
      router.fallbackRoute = this._fallbackRoute;
    }

    if (this.viewPortDefaults) {
      router.useViewPortDefaults(this.viewPortDefaults);
    }

    router.options = this.options;

    const pipelineSteps = this.pipelineSteps;
    if (pipelineSteps.length) {
      if (!router.isRoot) {
        throw new Error("Pipeline steps can only be added to the root router");
      }

      const pipelineProvider = (router as AppRouter).pipelineProvider;
      for (const { name, step } of pipelineSteps) {
        pipelineProvider.addStep(name, step as PipelineStep);
      }
    }
  }
}
