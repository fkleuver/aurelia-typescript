import { Container } from "aurelia-dependency-injection";
import { History } from "aurelia-history";
import { RouteRecognizer } from "aurelia-route-recognizer";
import { RouteConfig, ViewPort, ViewPortConfig } from "./interfaces";
import { NavModel } from "./nav-model";
import { NavigationInstruction } from "./navigation-instruction";
import { RouterConfiguration } from "./router-configuration";
import { _createRootedPath, _normalizeAbsolutePath, _resolveUrl } from "./util";

/**
 * The primary class responsible for handling routing and navigation.
 */
export class Router {
  public catchAllHandler: (instruction: NavigationInstruction) => Promise<NavigationInstruction>;
  public container: Container;
  public history: History;
  public viewPorts: { [name: string]: ViewPort };
  public routes: RouteConfig[];

  /**
   * The [[Router]]'s current base URL, typically based on the [[Router.currentInstruction]].
   */
  public baseUrl: string;

  /**
   * True if the [[Router]] has been configured.
   */
  public isConfigured: boolean;

  /**
   * True if the [[Router]] is currently processing a navigation.
   */
  public isNavigating: boolean;

  /**
   * True if the [[Router]] is navigating due to explicit call to navigate function(s).
   */
  public isExplicitNavigation: boolean;

  /**
   * True if the [[Router]] is navigating due to explicit call to navigateBack function.
   */
  public isExplicitNavigationBack: boolean;

  /**
   * True if the [[Router]] is navigating into the app for the first time in the browser session.
   */
  public isNavigatingFirst: boolean;

  /**
   * True if the [[Router]] is navigating to a page instance not in the browser session history.
   */
  public isNavigatingNew: boolean;

  /**
   * True if the [[Router]] is navigating forward in the browser session history.
   */
  public isNavigatingForward: boolean;

  /**
   * True if the [[Router]] is navigating back in the browser session history.
   */
  public isNavigatingBack: boolean;

  /**
   * True if the [[Router]] is navigating due to a browser refresh.
   */
  public isNavigatingRefresh: boolean;

  /**
   * The currently active navigation tracker.
   */
  public currentNavigationTracker: number;

  /**
   * The navigation models for routes that specified [[RouteConfig.nav]].
   */
  public navigation: NavModel[];

  /**
   * The currently active navigation instruction.
   */
  public currentInstruction: NavigationInstruction;

  /**
   * The parent router, or null if this instance is not a child router.
   */
  public parent: Router = null as any;

  public options: any = {};
  public title: string;
  public fallbackRoute: string;

  /**
   * The defaults used when a viewport lacks specified content
   */
  public viewPortDefaults: ViewPortConfig = {};

  // tslint:disable:variable-name
  protected _fallbackOrder: number;
  protected _recognizer: RouteRecognizer;
  protected _childRecognizer: RouteRecognizer;
  protected _configuredPromise: Promise<any>;
  protected _resolveConfiguredPromise: (value?: any) => void;
  // tslint:enable:variable-name

  /**
   * @param container The [[Container]] to use when child routers.
   * @param history The [[History]] implementation to delegate navigation requests to.
   */
  constructor(container: Container, history: History) {
    this.container = container;
    this.history = history;
    this.reset();
  }

  /**
   * Extension point to transform the document title before it is built and displayed.
   * By default, child routers delegate to the parent router, and the app router
   * returns the title unchanged.
   */
  public transformTitle: (title: string) => string = (title: string) => {
    if (this.parent) {
      return this.parent.transformTitle(title);
    }

    return title;
  }

  /**
   * Fully resets the router's internal state. Primarily used internally by the framework when multiple calls to setRoot are made.
   * Use with caution (actually, avoid using this). Do not use this to simply change your navigation model.
   */
  public reset(): void {
    this.viewPorts = {};
    this.routes = [];
    this.baseUrl = "";
    this.isConfigured = false;
    this.isNavigating = false;
    this.isExplicitNavigation = false;
    this.isExplicitNavigationBack = false;
    this.isNavigatingFirst = false;
    this.isNavigatingNew = false;
    this.isNavigatingRefresh = false;
    this.isNavigatingForward = false;
    this.isNavigatingBack = false;
    this.navigation = [];
    this.currentInstruction = null as any;
    this.viewPortDefaults = {};
    this._fallbackOrder = 100;
    this._recognizer = new RouteRecognizer();
    this._childRecognizer = new RouteRecognizer();
    // tslint:disable-next-line:promise-must-complete
    this._configuredPromise = new Promise((resolve: (value?: any) => void): void => {
      this._resolveConfiguredPromise = resolve;
    });
  }

  /**
   * Gets a value indicating whether or not this [[Router]] is the root in the router tree. I.e., it has no parent.
   */
  public get isRoot(): boolean {
    return !this.parent;
  }

  /**
   * Registers a viewPort to be used as a rendering target for activated routes.
   *
   * @param viewPort The viewPort.
   * @param name The name of the viewPort. 'default' if unspecified.
   */
  public registerViewPort(viewPort: ViewPort, name?: string): void {
    // tslint:disable-next-line:no-parameter-reassignment
    name = name || "default";
    this.viewPorts[name] = viewPort;
  }

  /**
   * Returns a Promise that resolves when the router is configured.
   */
  public ensureConfigured(): Promise<void> {
    return this._configuredPromise;
  }

  /**
   * Configures the router.
   *
   * @param callbackOrConfig The [[RouterConfiguration]] or a callback that takes a [[RouterConfiguration]].
   */
  public async configure(
    callbackOrConfig: RouterConfiguration | ((config: RouterConfiguration) => RouterConfiguration)
  ): Promise<void> {
    this.isConfigured = true;

    let result = callbackOrConfig as RouterConfiguration;
    let config: RouterConfiguration = {} as any;
    if (typeof callbackOrConfig === "function") {
      config = new RouterConfiguration();
      result = callbackOrConfig(config);
    }

    const c = await Promise.resolve(result);
    if (c && c.exportToRouter) {
      config = c;
    }
    config.exportToRouter(this);

    this.isConfigured = true;
    this._resolveConfiguredPromise();
  }

  /**
   * Navigates to a new location.
   *
   * @param fragment The URL fragment to use as the navigation destination.
   * @param options The navigation options. See [[History.NavigationOptions]] for all available options.
   */
  public navigate(fragment: string, options?: any): boolean {
    if (!this.isConfigured && this.parent) {
      return this.parent.navigate(fragment, options);
    }

    this.isExplicitNavigation = true;

    return this.history.navigate(_resolveUrl(fragment, this.baseUrl, (this.history as any)._hasPushState), options);
  }

  /**
   * Navigates to a new location corresponding to the route and params specified. Equivallent to [[Router.generate]] followed
   * by [[Router.navigate]].
   *
   * @param route The name of the route to use when generating the navigation location.
   * @param params The route parameters to be used when populating the route pattern.
   * @param options The navigation options. See [[History.NavigationOptions]] for all available options.
   */
  public navigateToRoute(route: string, params?: any, options?: any): boolean {
    const path = this.generate(route, params);

    return this.navigate(path, options);
  }

  /**
   * Navigates back to the most recent location in history.
   */
  public navigateBack(): void {
    this.isExplicitNavigationBack = true;
    this.history.navigateBack();
  }

  /**
   * Creates a child router of the current router.
   *
   * @param container The [[Container]] to provide to the child router. Uses the current [[Router]]'s [[Container]] if unspecified.
   * @returns The new child Router.
   */
  public createChild(container?: Container): Router {
    const childRouter = new Router(container || this.container.createChild(), this.history);
    childRouter.parent = this;

    return childRouter;
  }

  /**
   * Generates a URL fragment matching the specified route pattern.
   *
   * @param name The name of the route whose pattern should be used to generate the fragment.
   * @param params The route params to be used to populate the route pattern.
   * @param options If options.absolute = true, then absolute url will be generated; otherwise, it will be relative url.
   * @returns A string containing the generated URL fragment.
   */
  public generate(name: string, params?: any, options: any = {}): string {
    const hasRoute = this._recognizer.hasRoute(name);
    if ((!this.isConfigured || !hasRoute) && this.parent) {
      return this.parent.generate(name, params);
    }

    if (!hasRoute) {
      throw new Error(
        `A route with name '${name}' could not be found. Check that \`name: '${name}'\` was specified in the route's config.`
      );
    }

    const path = this._recognizer.generate(name, params);
    const rootedPath = _createRootedPath(path, this.baseUrl, (this.history as any)._hasPushState, options.absolute);

    return options.absolute ? `${this.history.getAbsoluteRoot()}${rootedPath}` : rootedPath;
  }

  /**
   * Creates a [[NavModel]] for the specified route config.
   *
   * @param config The route config.
   */
  public createNavModel(config: RouteConfig): NavModel {
    const navModel = new NavModel(this, ("href" in config ? config.href : config.route) as string);
    navModel.title = config.title as string;
    navModel.order = config.nav as number;
    navModel.href = config.href as string;
    navModel.settings = config.settings;
    navModel.config = config;

    return navModel;
  }

  /**
   * Registers a new route with the router.
   *
   * @param config The [[RouteConfig]].
   * @param navModel The [[NavModel]] to use for the route. May be omitted for single-pattern routes.
   */
  public addRoute(config: RouteConfig, navModel?: NavModel): void {
    validateRouteConfig(config, this.routes);

    if (!("viewPorts" in config) && !config.navigationStrategy) {
      config.viewPorts = {
        default: {
          moduleId: config.moduleId,
          view: config.view
        }
      };
    }

    if (!navModel) {
      // tslint:disable-next-line:no-parameter-reassignment
      navModel = this.createNavModel(config);
    }

    this.routes.push(config);

    let path = config.route as string;
    if (path.charAt(0) === "/") {
      path = path.substr(1);
    }
    const caseSensitive = config.caseSensitive === true;
    const state = this._recognizer.add({ path, handler: config, caseSensitive } as any);

    if (path) {
      const settings = config.settings;
      delete config.settings;
      const withChild = JSON.parse(JSON.stringify(config));
      config.settings = settings;
      withChild.route = `${path}/*childRoute`;
      withChild.hasChildRouter = true;
      this._childRecognizer.add({
        path: withChild.route,
        handler: withChild,
        caseSensitive: caseSensitive
      });

      withChild.navModel = navModel;
      withChild.settings = config.settings;
      withChild.navigationStrategy = config.navigationStrategy;
    }

    config.navModel = navModel;

    if ((navModel.order || navModel.order === 0) && this.navigation.indexOf(navModel) === -1) {
      if (!navModel.href && navModel.href !== "" && ((state as any).types.dynamics || (state as any).types.stars)) {
        throw new Error(
          `Invalid route config for "${
            config.route
          }" : dynamic routes must specify an "href:" to be included in the navigation model.`
        );
      }

      if (typeof navModel.order !== "number") {
        navModel.order = ++this._fallbackOrder;
      }

      this.navigation.push(navModel);
      this.navigation = this.navigation.sort((a: NavModel, b: NavModel) => a.order - b.order);
    }
  }

  /**
   * Gets a value indicating whether or not this [[Router]] or one of its ancestors has a route registered with the specified name.
   *
   * @param name The name of the route to check.
   */
  public hasRoute(name: string): boolean {
    return !!(this._recognizer.hasRoute(name) || (this.parent && this.parent.hasRoute(name)));
  }

  /**
   * Gets a value indicating whether or not this [[Router]] has a route registered with the specified name.
   *
   * @param name The name of the route to check.
   */
  public hasOwnRoute(name: string): boolean {
    return this._recognizer.hasRoute(name);
  }

  /**
   * Register a handler to use when the incoming URL fragment doesn't match any registered routes.
   *
   * @param config The moduleId, or a function that selects the moduleId, or a [[RouteConfig]].
   */
  public handleUnknownRoutes(config?: string | Function | RouteConfig): void {
    if (!config) {
      throw new Error("Invalid unknown route handler");
    }

    this.catchAllHandler = async (instruction: NavigationInstruction): Promise<NavigationInstruction> => {
      instruction.config = await this._createRouteConfig(config, instruction);

      return instruction;
    };
  }

  /**
   * Updates the document title using the current navigation instruction.
   */
  public updateTitle(): void {
    if (this.parent) {
      return this.parent.updateTitle();
    }

    if (this.currentInstruction) {
      this.currentInstruction._updateTitle();
    }

    return undefined;
  }

  /**
   * Updates the navigation routes with hrefs relative to the current location.
   * Note: This method will likely move to a plugin in a future release.
   */
  public refreshNavigation(): void {
    const history = this.history as any;
    for (const nav of this.navigation) {
      const config = nav.config as RouteConfig;
      if (!config.href) {
        nav.href = _createRootedPath(nav.relativeHref, this.baseUrl, history._hasPushState);
      } else {
        nav.href = _normalizeAbsolutePath(config.href as string, history._hasPushState);
      }
    }
  }

  /**
   * Sets the default configuration for the view ports. This specifies how to
   *  populate a view port for which no module is specified. The default is
   *  an empty view/view-model pair.
   */
  public useViewPortDefaults(viewPortDefaults: ViewPortConfig): void {
    for (const viewPortName of Object.keys(viewPortDefaults)) {
      const viewPortConfig = viewPortDefaults[viewPortName];
      this.viewPortDefaults[viewPortName] = {
        moduleId: viewPortConfig.moduleId
      };
    }
  }

  // tslint:disable-next-line:function-name
  public _findParentInstructionFromRouter(
    router: Router,
    instruction: NavigationInstruction
  ): NavigationInstruction | undefined {
    if (instruction.router === router) {
      instruction.fragment = router.baseUrl; //need to change the fragment in case of a redirect instead of moduleId

      return instruction;
    } else if (instruction.parentInstruction) {
      return this._findParentInstructionFromRouter(router, instruction.parentInstruction);
    }

    return undefined;
  }

  // tslint:disable-next-line:function-name
  public _parentCatchAllHandler(router: Router): boolean | Router {
    if (router.catchAllHandler) {
      return router;
    } else if (router.parent) {
      return this._parentCatchAllHandler(router.parent);
    }

    return false;
  }

  // tslint:disable-next-line:function-name
  public async _createRouteConfig(
    config: string | Function | RouteConfig,
    instruction: NavigationInstruction
  ): Promise<RouteConfig> {
    let c = config;
    if (typeof c === "function") {
      c = c(instruction);
    }
    if (typeof c === "string") {
      c = { moduleId: c } as any;
    }

    c = c as RouteConfig;
    c.route = instruction.params.path;
    validateRouteConfig(c, this.routes);

    if (!c.navModel) {
      c.navModel = this.createNavModel(c);
    }

    return c;
  }

  // tslint:disable-next-line:function-name
  public _refreshBaseUrl(): void {
    if (this.parent) {
      const baseUrl = this.parent.currentInstruction.getBaseUrl();
      this.baseUrl = this.parent.baseUrl + baseUrl;
    }
  }

  // tslint:disable-next-line:function-name
  protected _createNavigationInstruction(
    url: string = "",
    parentInstruction: NavigationInstruction = null as any
  ): Promise<NavigationInstruction> {
    let fragment = url;
    let queryString = "";

    const queryIndex = url.indexOf("?");
    if (queryIndex !== -1) {
      fragment = url.substr(0, queryIndex);
      queryString = url.substr(queryIndex + 1);
    }

    let results = this._recognizer.recognize(url);
    if (!results || !results.length) {
      results = this._childRecognizer.recognize(url);
    }

    const instructionInit = {
      fragment,
      queryString,
      config: null,
      parentInstruction,
      previousInstruction: this.currentInstruction,
      router: this,
      options: {
        compareQueryParams: this.options.compareQueryParams
      }
    };

    if (results && results.length) {
      const first = results[0];
      const instruction = new NavigationInstruction({
        ...instructionInit,
        params: first.params,
        queryParams: (first as any).queryParams || (results as any).queryParams,
        config: (first as any).config || first.handler
      });

      if (typeof first.handler === "function") {
        return evaluateNavigationStrategy(instruction, first.handler, first);
      } else if (first.handler && typeof (first.handler as any).navigationStrategy === "function") {
        return evaluateNavigationStrategy(instruction, (first.handler as any).navigationStrategy, first.handler);
      }

      return Promise.resolve(instruction);
    } else if (this.catchAllHandler) {
      const instruction = new NavigationInstruction({
        ...instructionInit,
        params: { path: fragment },
        queryParams: results ? (results as any).queryParams : {},
        config: null as any // config will be created by the catchAllHandler
      });

      return evaluateNavigationStrategy(instruction, this.catchAllHandler);
    } else if (this.parent) {
      const router = this._parentCatchAllHandler(this.parent) as Router;

      if (router) {
        const newParentInstruction = this._findParentInstructionFromRouter(router, parentInstruction);

        const instruction = new NavigationInstruction({
          ...instructionInit,
          params: { path: fragment },
          queryParams: results ? (results as any).queryParams : {},
          router: router,
          parentInstruction: newParentInstruction,
          parentCatchHandler: true,
          config: null // config will be created by the chained parent catchAllHandler
        } as any);

        return evaluateNavigationStrategy(instruction, router.catchAllHandler);
      }
    }

    return Promise.reject(new Error(`Route not found: ${url}`));
  }
}

// tslint:disable-next-line:variable-name
function validateRouteConfig(config: RouteConfig, _routes: Object[]): void {
  if (typeof config !== "object") {
    throw new Error("Invalid Route Config");
  }

  if (typeof config.route !== "string") {
    const name = config.name || "(no name)";
    throw new Error(`Invalid Route Config for "${name}": You must specify a "route:" pattern.`);
  }

  if (!("redirect" in config || config.moduleId || config.navigationStrategy || config.viewPorts)) {
    throw new Error(
      `Invalid Route Config for "${
        config.route
      }": You must specify a "moduleId:", "redirect:", "navigationStrategy:", or "viewPorts:".`
    );
  }
}

function evaluateNavigationStrategy(
  instruction: NavigationInstruction,
  evaluator: Function,
  context?: any
): Promise<NavigationInstruction> {
  return Promise.resolve(evaluator.call(context, instruction)).then(() => {
    if (!("viewPorts" in instruction.config)) {
      instruction.config.viewPorts = {
        default: {
          moduleId: instruction.config.moduleId
        }
      };
    }

    return instruction;
  });
}
