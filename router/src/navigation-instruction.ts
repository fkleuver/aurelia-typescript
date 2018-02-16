import { RouteConfig, ViewPort } from "./interfaces";
import { NavModel } from "./nav-model";
import { activationStrategy } from "./navigation-plan";
import { Next, PipelineResult } from "./pipeline";
import { Router } from "./router";

export interface NavigationInstructionInit {
  fragment: string;
  queryString: string;
  params: Object;
  queryParams: Object;
  config: RouteConfig;
  parentInstruction: NavigationInstruction;
  previousInstruction: NavigationInstruction;
  router: Router;
  options: Object;
}

export class CommitChangesStep {
  public async run(navigationInstruction: NavigationInstruction, next: Next): Promise<any> {
    await navigationInstruction._commitChanges(true);
    navigationInstruction._updateTitle();

    return next();
  }
}

/**
 * Class used to represent an instruction during a navigation.
 */
export class NavigationInstruction {
  /**
   * The URL fragment.
   */
  public fragment: string;

  /**
   * The query string.
   */
  public queryString: string;

  /**
   * Parameters extracted from the route pattern.
   */
  public params: any;

  /**
   * Parameters extracted from the query string.
   */
  public queryParams: any;

  /**
   * The route config for the route matching this instruction.
   */
  public config: RouteConfig;

  /**
   * The parent instruction, if this instruction was created by a child router.
   */
  public parentInstruction: NavigationInstruction;

  /**
   * The instruction being replaced by this instruction in the current router.
   */
  public previousInstruction: NavigationInstruction;

  /**
   * viewPort instructions to used activation.
   */
  public viewPortInstructions: any;

  /**
   * The router instance.
   */
  public router: Router;

  public plan: Object = null as any;

  public options: Object = {};

  public resolve: (value?: PipelineResult) => void;

  public lifecycleArgs: any[];

  constructor(init: NavigationInstructionInit) {
    Object.assign(this, init);

    this.params = this.params || {};
    this.viewPortInstructions = {};

    const ancestorParams = [];
    // tslint:disable-next-line:no-this-assignment
    let current = this;
    do {
      const currentParams = { ...current.params };
      if (current.config && current.config.hasChildRouter) {
        // remove the param for the injected child route segment
        delete currentParams[current.getWildCardName()];
      }

      ancestorParams.unshift(currentParams);
      current = current.parentInstruction as any;
    } while (current);

    const allParams = Object.assign({}, this.queryParams, ...ancestorParams);
    this.lifecycleArgs = [allParams, this.config, this];
  }

  /**
   * Gets an array containing this instruction and all child instructions for the current navigation.
   */
  public getAllInstructions(): NavigationInstruction[] {
    const instructions = [this];
    for (const key of Object.keys(this.viewPortInstructions)) {
      const childInstruction = this.viewPortInstructions[key].childNavigationInstruction;
      if (childInstruction) {
        instructions.push(...childInstruction.getAllInstructions());
      }
    }

    return instructions;
  }

  /**
   * Gets an array containing the instruction and all child instructions for the previous navigation.
   * Previous instructions are no longer available after navigation completes.
   */
  public getAllPreviousInstructions(): NavigationInstruction[] {
    return this.getAllInstructions()
      .map((c: NavigationInstruction) => c.previousInstruction)
      .filter((c: NavigationInstruction) => c);
  }

  /**
   * Adds a viewPort instruction.
   */
  public addViewPortInstruction(viewPortName: string, strategy: string, moduleId: string, component: any): any {
    const config = { ...this.lifecycleArgs[1], currentViewPort: viewPortName };
    // tslint:disable-next-line:no-unnecessary-local-variable
    const viewportInstruction = (this.viewPortInstructions[viewPortName] = {
      name: viewPortName,
      strategy: strategy,
      moduleId: moduleId,
      component: component,
      childRouter: component.childRouter,
      lifecycleArgs: [].concat(this.lifecycleArgs[0], config, this.lifecycleArgs[2])
    });

    return viewportInstruction;
  }

  /**
   * Gets the name of the route pattern's wildcard parameter, if applicable.
   */
  public getWildCardName(): string {
    const wildcardIndex = this.config.route.lastIndexOf("*");

    return (this.config.route as string).substr(wildcardIndex + 1);
  }

  /**
   * Gets the path and query string created by filling the route
   * pattern's wildcard parameter with the matching param.
   */
  public getWildcardPath(): string {
    const wildcardName = this.getWildCardName();
    let path = this.params[wildcardName] || "";

    if (this.queryString) {
      path += `?${this.queryString}`;
    }

    return path;
  }

  /**
   * Gets the instruction's base URL, accounting for wildcard route parameters.
   */
  public getBaseUrl(): string {
    let fragment = decodeURI(this.fragment);

    if (fragment === "") {
      const nonEmptyRoute = this.router.routes.find((route: RouteConfig) => {
        return route.name === this.config.name && route.route !== "";
      });
      if (nonEmptyRoute) {
        fragment = nonEmptyRoute.route as string;
      }
    }

    if (!this.params) {
      return encodeURI(fragment);
    }

    const wildcardName = this.getWildCardName();
    const path = this.params[wildcardName] || "";

    if (!path) {
      return encodeURI(fragment);
    }

    return encodeURI(fragment.substr(0, fragment.lastIndexOf(path)));
  }

  // tslint:disable-next-line:function-name
  public async _commitChanges(waitToSwap: boolean): Promise<void> {
    const router = this.router;
    router.currentInstruction = this;

    if (this.previousInstruction) {
      (this.previousInstruction.config.navModel as NavModel).isActive = false;
    }

    (this.config.navModel as NavModel).isActive = true;

    router._refreshBaseUrl();
    router.refreshNavigation();

    const loads = [];
    const delaySwaps: ({ viewPort: ViewPort; viewPortInstruction: any })[] = [];

    for (const viewPortName of Object.keys(this.viewPortInstructions)) {
      const viewPortInstruction = this.viewPortInstructions[viewPortName];
      const viewPort = router.viewPorts[viewPortName];

      if (!viewPort) {
        throw new Error(`There was no router-view found in the view for ${viewPortInstruction.moduleId}.`);
      }

      if (viewPortInstruction.strategy === activationStrategy.replace) {
        if (
          viewPortInstruction.childNavigationInstruction &&
          viewPortInstruction.childNavigationInstruction.parentCatchHandler
        ) {
          loads.push(viewPortInstruction.childNavigationInstruction._commitChanges(waitToSwap));
        } else {
          if (waitToSwap) {
            delaySwaps.push({ viewPort, viewPortInstruction });
          }
          loads.push(
            viewPort.process(viewPortInstruction, waitToSwap).then(() => {
              if (viewPortInstruction.childNavigationInstruction) {
                return viewPortInstruction.childNavigationInstruction._commitChanges(waitToSwap);
              }
            })
          );
        }
      } else {
        if (viewPortInstruction.childNavigationInstruction) {
          loads.push(viewPortInstruction.childNavigationInstruction._commitChanges(waitToSwap));
        }
      }
    }

    for (const load of loads) {
      await load;
    }
    for (const delaySwap of delaySwaps) {
      await delaySwap.viewPort.swap(delaySwap.viewPortInstruction);
    }
    prune(this);
  }

  // tslint:disable-next-line:function-name
  public _updateTitle(): void {
    const title = this._buildTitle();
    if (title) {
      this.router.history.setTitle(title);
    }
  }

  // tslint:disable-next-line:function-name
  public _buildTitle(separator: string = " | "): string {
    let title = "";
    const childTitles = [];

    if ((this.config.navModel as NavModel).title) {
      title = this.router.transformTitle((this.config.navModel as NavModel).title);
    }

    for (const viewPortName of Object.keys(this.viewPortInstructions)) {
      const viewPortInstruction = this.viewPortInstructions[viewPortName];

      if (viewPortInstruction.childNavigationInstruction) {
        const childTitle = viewPortInstruction.childNavigationInstruction._buildTitle(separator);
        if (childTitle) {
          childTitles.push(childTitle);
        }
      }
    }

    if (childTitles.length) {
      title = childTitles.join(separator) + (title ? separator : "") + title;
    }

    if (this.router.title) {
      title += (title ? separator : "") + this.router.transformTitle(this.router.title);
    }

    return title;
  }
}

function prune(instruction: NavigationInstruction): void {
  instruction.previousInstruction = null as any;
  instruction.plan = null as any;
}
