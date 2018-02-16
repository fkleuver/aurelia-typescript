import { RouteRecognizer } from "aurelia-route-recognizer";
import { NavModel } from "./nav-model";
import { NavigationInstruction } from "./navigation-instruction";
import { RouterConfiguration } from "./router-configuration";
import { _createRootedPath, _normalizeAbsolutePath, _resolveUrl } from "./util";
/**
 * The primary class responsible for handling routing and navigation.
 */
export class Router {
    // tslint:enable:variable-name
    /**
     * @param container The [[Container]] to use when child routers.
     * @param history The [[History]] implementation to delegate navigation requests to.
     */
    constructor(container, history) {
        /**
         * The parent router, or null if this instance is not a child router.
         */
        this.parent = null;
        this.options = {};
        /**
         * The defaults used when a viewport lacks specified content
         */
        this.viewPortDefaults = {};
        /**
         * Extension point to transform the document title before it is built and displayed.
         * By default, child routers delegate to the parent router, and the app router
         * returns the title unchanged.
         */
        this.transformTitle = (title) => {
            if (this.parent) {
                return this.parent.transformTitle(title);
            }
            return title;
        };
        this.container = container;
        this.history = history;
        this.reset();
    }
    /**
     * Fully resets the router's internal state. Primarily used internally by the framework when multiple calls to setRoot are made.
     * Use with caution (actually, avoid using this). Do not use this to simply change your navigation model.
     */
    reset() {
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
        this.currentInstruction = null;
        this.viewPortDefaults = {};
        this._fallbackOrder = 100;
        this._recognizer = new RouteRecognizer();
        this._childRecognizer = new RouteRecognizer();
        // tslint:disable-next-line:promise-must-complete
        this._configuredPromise = new Promise((resolve) => {
            this._resolveConfiguredPromise = resolve;
        });
    }
    /**
     * Gets a value indicating whether or not this [[Router]] is the root in the router tree. I.e., it has no parent.
     */
    get isRoot() {
        return !this.parent;
    }
    /**
     * Registers a viewPort to be used as a rendering target for activated routes.
     *
     * @param viewPort The viewPort.
     * @param name The name of the viewPort. 'default' if unspecified.
     */
    registerViewPort(viewPort, name) {
        // tslint:disable-next-line:no-parameter-reassignment
        name = name || "default";
        this.viewPorts[name] = viewPort;
    }
    /**
     * Returns a Promise that resolves when the router is configured.
     */
    ensureConfigured() {
        return this._configuredPromise;
    }
    /**
     * Configures the router.
     *
     * @param callbackOrConfig The [[RouterConfiguration]] or a callback that takes a [[RouterConfiguration]].
     */
    async configure(callbackOrConfig) {
        this.isConfigured = true;
        let result = callbackOrConfig;
        let config = {};
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
    navigate(fragment, options) {
        if (!this.isConfigured && this.parent) {
            return this.parent.navigate(fragment, options);
        }
        this.isExplicitNavigation = true;
        return this.history.navigate(_resolveUrl(fragment, this.baseUrl, this.history._hasPushState), options);
    }
    /**
     * Navigates to a new location corresponding to the route and params specified. Equivallent to [[Router.generate]] followed
     * by [[Router.navigate]].
     *
     * @param route The name of the route to use when generating the navigation location.
     * @param params The route parameters to be used when populating the route pattern.
     * @param options The navigation options. See [[History.NavigationOptions]] for all available options.
     */
    navigateToRoute(route, params, options) {
        const path = this.generate(route, params);
        return this.navigate(path, options);
    }
    /**
     * Navigates back to the most recent location in history.
     */
    navigateBack() {
        this.isExplicitNavigationBack = true;
        this.history.navigateBack();
    }
    /**
     * Creates a child router of the current router.
     *
     * @param container The [[Container]] to provide to the child router. Uses the current [[Router]]'s [[Container]] if unspecified.
     * @returns The new child Router.
     */
    createChild(container) {
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
    generate(name, params, options = {}) {
        const hasRoute = this._recognizer.hasRoute(name);
        if ((!this.isConfigured || !hasRoute) && this.parent) {
            return this.parent.generate(name, params);
        }
        if (!hasRoute) {
            throw new Error(`A route with name '${name}' could not be found. Check that \`name: '${name}'\` was specified in the route's config.`);
        }
        const path = this._recognizer.generate(name, params);
        const rootedPath = _createRootedPath(path, this.baseUrl, this.history._hasPushState, options.absolute);
        return options.absolute ? `${this.history.getAbsoluteRoot()}${rootedPath}` : rootedPath;
    }
    /**
     * Creates a [[NavModel]] for the specified route config.
     *
     * @param config The route config.
     */
    createNavModel(config) {
        const navModel = new NavModel(this, ("href" in config ? config.href : config.route));
        navModel.title = config.title;
        navModel.order = config.nav;
        navModel.href = config.href;
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
    addRoute(config, navModel) {
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
        let path = config.route;
        if (path.charAt(0) === "/") {
            path = path.substr(1);
        }
        const caseSensitive = config.caseSensitive === true;
        const state = this._recognizer.add({ path, handler: config, caseSensitive });
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
            if (!navModel.href && navModel.href !== "" && (state.types.dynamics || state.types.stars)) {
                throw new Error(`Invalid route config for "${config.route}" : dynamic routes must specify an "href:" to be included in the navigation model.`);
            }
            if (typeof navModel.order !== "number") {
                navModel.order = ++this._fallbackOrder;
            }
            this.navigation.push(navModel);
            this.navigation = this.navigation.sort((a, b) => a.order - b.order);
        }
    }
    /**
     * Gets a value indicating whether or not this [[Router]] or one of its ancestors has a route registered with the specified name.
     *
     * @param name The name of the route to check.
     */
    hasRoute(name) {
        return !!(this._recognizer.hasRoute(name) || (this.parent && this.parent.hasRoute(name)));
    }
    /**
     * Gets a value indicating whether or not this [[Router]] has a route registered with the specified name.
     *
     * @param name The name of the route to check.
     */
    hasOwnRoute(name) {
        return this._recognizer.hasRoute(name);
    }
    /**
     * Register a handler to use when the incoming URL fragment doesn't match any registered routes.
     *
     * @param config The moduleId, or a function that selects the moduleId, or a [[RouteConfig]].
     */
    handleUnknownRoutes(config) {
        if (!config) {
            throw new Error("Invalid unknown route handler");
        }
        this.catchAllHandler = async (instruction) => {
            instruction.config = await this._createRouteConfig(config, instruction);
            return instruction;
        };
    }
    /**
     * Updates the document title using the current navigation instruction.
     */
    updateTitle() {
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
    refreshNavigation() {
        const history = this.history;
        for (const nav of this.navigation) {
            const config = nav.config;
            if (!config.href) {
                nav.href = _createRootedPath(nav.relativeHref, this.baseUrl, history._hasPushState);
            }
            else {
                nav.href = _normalizeAbsolutePath(config.href, history._hasPushState);
            }
        }
    }
    /**
     * Sets the default configuration for the view ports. This specifies how to
     *  populate a view port for which no module is specified. The default is
     *  an empty view/view-model pair.
     */
    useViewPortDefaults(viewPortDefaults) {
        for (const viewPortName of Object.keys(viewPortDefaults)) {
            const viewPortConfig = viewPortDefaults[viewPortName];
            this.viewPortDefaults[viewPortName] = {
                moduleId: viewPortConfig.moduleId
            };
        }
    }
    // tslint:disable-next-line:function-name
    _findParentInstructionFromRouter(router, instruction) {
        if (instruction.router === router) {
            instruction.fragment = router.baseUrl; //need to change the fragment in case of a redirect instead of moduleId
            return instruction;
        }
        else if (instruction.parentInstruction) {
            return this._findParentInstructionFromRouter(router, instruction.parentInstruction);
        }
        return undefined;
    }
    // tslint:disable-next-line:function-name
    _parentCatchAllHandler(router) {
        if (router.catchAllHandler) {
            return router;
        }
        else if (router.parent) {
            return this._parentCatchAllHandler(router.parent);
        }
        return false;
    }
    // tslint:disable-next-line:function-name
    async _createRouteConfig(config, instruction) {
        let c = config;
        if (typeof c === "function") {
            c = c(instruction);
        }
        if (typeof c === "string") {
            c = { moduleId: c };
        }
        c = c;
        c.route = instruction.params.path;
        validateRouteConfig(c, this.routes);
        if (!c.navModel) {
            c.navModel = this.createNavModel(c);
        }
        return c;
    }
    // tslint:disable-next-line:function-name
    _refreshBaseUrl() {
        if (this.parent) {
            const baseUrl = this.parent.currentInstruction.getBaseUrl();
            this.baseUrl = this.parent.baseUrl + baseUrl;
        }
    }
    // tslint:disable-next-line:function-name
    _createNavigationInstruction(url = "", parentInstruction = null) {
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
            const instruction = new NavigationInstruction(Object.assign({}, instructionInit, { params: first.params, queryParams: first.queryParams || results.queryParams, config: first.config || first.handler }));
            if (typeof first.handler === "function") {
                return evaluateNavigationStrategy(instruction, first.handler, first);
            }
            else if (first.handler && typeof first.handler.navigationStrategy === "function") {
                return evaluateNavigationStrategy(instruction, first.handler.navigationStrategy, first.handler);
            }
            return Promise.resolve(instruction);
        }
        else if (this.catchAllHandler) {
            const instruction = new NavigationInstruction(Object.assign({}, instructionInit, { params: { path: fragment }, queryParams: results ? results.queryParams : {}, config: null // config will be created by the catchAllHandler
             }));
            return evaluateNavigationStrategy(instruction, this.catchAllHandler);
        }
        else if (this.parent) {
            const router = this._parentCatchAllHandler(this.parent);
            if (router) {
                const newParentInstruction = this._findParentInstructionFromRouter(router, parentInstruction);
                const instruction = new NavigationInstruction(Object.assign({}, instructionInit, { params: { path: fragment }, queryParams: results ? results.queryParams : {}, router: router, parentInstruction: newParentInstruction, parentCatchHandler: true, config: null // config will be created by the chained parent catchAllHandler
                 }));
                return evaluateNavigationStrategy(instruction, router.catchAllHandler);
            }
        }
        return Promise.reject(new Error(`Route not found: ${url}`));
    }
}
// tslint:disable-next-line:variable-name
function validateRouteConfig(config, _routes) {
    if (typeof config !== "object") {
        throw new Error("Invalid Route Config");
    }
    if (typeof config.route !== "string") {
        const name = config.name || "(no name)";
        throw new Error(`Invalid Route Config for "${name}": You must specify a "route:" pattern.`);
    }
    if (!("redirect" in config || config.moduleId || config.navigationStrategy || config.viewPorts)) {
        throw new Error(`Invalid Route Config for "${config.route}": You must specify a "moduleId:", "redirect:", "navigationStrategy:", or "viewPorts:".`);
    }
}
function evaluateNavigationStrategy(instruction, evaluator, context) {
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
//# sourceMappingURL=router.js.map