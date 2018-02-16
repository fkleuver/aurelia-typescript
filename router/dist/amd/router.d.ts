import { Container } from "aurelia-dependency-injection";
import { History } from "aurelia-history";
import { RouteRecognizer } from "aurelia-route-recognizer";
import { RouteConfig, ViewPort, ViewPortConfig } from "./interfaces";
import { NavModel } from "./nav-model";
import { NavigationInstruction } from "./navigation-instruction";
import { RouterConfiguration } from "./router-configuration";
/**
 * The primary class responsible for handling routing and navigation.
 */
export declare class Router {
    catchAllHandler: (instruction: NavigationInstruction) => Promise<NavigationInstruction>;
    container: Container;
    history: History;
    viewPorts: {
        [name: string]: ViewPort;
    };
    routes: RouteConfig[];
    /**
     * The [[Router]]'s current base URL, typically based on the [[Router.currentInstruction]].
     */
    baseUrl: string;
    /**
     * True if the [[Router]] has been configured.
     */
    isConfigured: boolean;
    /**
     * True if the [[Router]] is currently processing a navigation.
     */
    isNavigating: boolean;
    /**
     * True if the [[Router]] is navigating due to explicit call to navigate function(s).
     */
    isExplicitNavigation: boolean;
    /**
     * True if the [[Router]] is navigating due to explicit call to navigateBack function.
     */
    isExplicitNavigationBack: boolean;
    /**
     * True if the [[Router]] is navigating into the app for the first time in the browser session.
     */
    isNavigatingFirst: boolean;
    /**
     * True if the [[Router]] is navigating to a page instance not in the browser session history.
     */
    isNavigatingNew: boolean;
    /**
     * True if the [[Router]] is navigating forward in the browser session history.
     */
    isNavigatingForward: boolean;
    /**
     * True if the [[Router]] is navigating back in the browser session history.
     */
    isNavigatingBack: boolean;
    /**
     * True if the [[Router]] is navigating due to a browser refresh.
     */
    isNavigatingRefresh: boolean;
    /**
     * The currently active navigation tracker.
     */
    currentNavigationTracker: number;
    /**
     * The navigation models for routes that specified [[RouteConfig.nav]].
     */
    navigation: NavModel[];
    /**
     * The currently active navigation instruction.
     */
    currentInstruction: NavigationInstruction;
    /**
     * The parent router, or null if this instance is not a child router.
     */
    parent: Router;
    options: any;
    title: string;
    fallbackRoute: string;
    /**
     * The defaults used when a viewport lacks specified content
     */
    viewPortDefaults: ViewPortConfig;
    protected _fallbackOrder: number;
    protected _recognizer: RouteRecognizer;
    protected _childRecognizer: RouteRecognizer;
    protected _configuredPromise: Promise<any>;
    protected _resolveConfiguredPromise: (value?: any) => void;
    /**
     * @param container The [[Container]] to use when child routers.
     * @param history The [[History]] implementation to delegate navigation requests to.
     */
    constructor(container: Container, history: History);
    /**
     * Extension point to transform the document title before it is built and displayed.
     * By default, child routers delegate to the parent router, and the app router
     * returns the title unchanged.
     */
    transformTitle: (title: string) => string;
    /**
     * Fully resets the router's internal state. Primarily used internally by the framework when multiple calls to setRoot are made.
     * Use with caution (actually, avoid using this). Do not use this to simply change your navigation model.
     */
    reset(): void;
    /**
     * Gets a value indicating whether or not this [[Router]] is the root in the router tree. I.e., it has no parent.
     */
    readonly isRoot: boolean;
    /**
     * Registers a viewPort to be used as a rendering target for activated routes.
     *
     * @param viewPort The viewPort.
     * @param name The name of the viewPort. 'default' if unspecified.
     */
    registerViewPort(viewPort: ViewPort, name?: string): void;
    /**
     * Returns a Promise that resolves when the router is configured.
     */
    ensureConfigured(): Promise<void>;
    /**
     * Configures the router.
     *
     * @param callbackOrConfig The [[RouterConfiguration]] or a callback that takes a [[RouterConfiguration]].
     */
    configure(callbackOrConfig: RouterConfiguration | ((config: RouterConfiguration) => RouterConfiguration)): Promise<void>;
    /**
     * Navigates to a new location.
     *
     * @param fragment The URL fragment to use as the navigation destination.
     * @param options The navigation options. See [[History.NavigationOptions]] for all available options.
     */
    navigate(fragment: string, options?: any): boolean;
    /**
     * Navigates to a new location corresponding to the route and params specified. Equivallent to [[Router.generate]] followed
     * by [[Router.navigate]].
     *
     * @param route The name of the route to use when generating the navigation location.
     * @param params The route parameters to be used when populating the route pattern.
     * @param options The navigation options. See [[History.NavigationOptions]] for all available options.
     */
    navigateToRoute(route: string, params?: any, options?: any): boolean;
    /**
     * Navigates back to the most recent location in history.
     */
    navigateBack(): void;
    /**
     * Creates a child router of the current router.
     *
     * @param container The [[Container]] to provide to the child router. Uses the current [[Router]]'s [[Container]] if unspecified.
     * @returns The new child Router.
     */
    createChild(container?: Container): Router;
    /**
     * Generates a URL fragment matching the specified route pattern.
     *
     * @param name The name of the route whose pattern should be used to generate the fragment.
     * @param params The route params to be used to populate the route pattern.
     * @param options If options.absolute = true, then absolute url will be generated; otherwise, it will be relative url.
     * @returns A string containing the generated URL fragment.
     */
    generate(name: string, params?: any, options?: any): string;
    /**
     * Creates a [[NavModel]] for the specified route config.
     *
     * @param config The route config.
     */
    createNavModel(config: RouteConfig): NavModel;
    /**
     * Registers a new route with the router.
     *
     * @param config The [[RouteConfig]].
     * @param navModel The [[NavModel]] to use for the route. May be omitted for single-pattern routes.
     */
    addRoute(config: RouteConfig, navModel?: NavModel): void;
    /**
     * Gets a value indicating whether or not this [[Router]] or one of its ancestors has a route registered with the specified name.
     *
     * @param name The name of the route to check.
     */
    hasRoute(name: string): boolean;
    /**
     * Gets a value indicating whether or not this [[Router]] has a route registered with the specified name.
     *
     * @param name The name of the route to check.
     */
    hasOwnRoute(name: string): boolean;
    /**
     * Register a handler to use when the incoming URL fragment doesn't match any registered routes.
     *
     * @param config The moduleId, or a function that selects the moduleId, or a [[RouteConfig]].
     */
    handleUnknownRoutes(config?: string | Function | RouteConfig): void;
    /**
     * Updates the document title using the current navigation instruction.
     */
    updateTitle(): void;
    /**
     * Updates the navigation routes with hrefs relative to the current location.
     * Note: This method will likely move to a plugin in a future release.
     */
    refreshNavigation(): void;
    /**
     * Sets the default configuration for the view ports. This specifies how to
     *  populate a view port for which no module is specified. The default is
     *  an empty view/view-model pair.
     */
    useViewPortDefaults(viewPortDefaults: ViewPortConfig): void;
    _findParentInstructionFromRouter(router: Router, instruction: NavigationInstruction): NavigationInstruction | undefined;
    _parentCatchAllHandler(router: Router): boolean | Router;
    _createRouteConfig(config: string | Function | RouteConfig, instruction: NavigationInstruction): Promise<RouteConfig>;
    _refreshBaseUrl(): void;
    protected _createNavigationInstruction(url?: string, parentInstruction?: NavigationInstruction): Promise<NavigationInstruction>;
}
