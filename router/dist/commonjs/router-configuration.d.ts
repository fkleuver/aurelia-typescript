import { RouteConfig, ViewPortConfig } from "./interfaces";
import { NavigationInstruction } from "./navigation-instruction";
import { PipelineStep } from "./pipeline";
import { Router } from "./router";
/**
 * Class used to configure a [[Router]] instance.
 */
export declare class RouterConfiguration {
    instructions: ((router: Router) => void)[];
    options: any;
    pipelineSteps: ({
        name: string;
        step: Function | PipelineStep;
    })[];
    title: string;
    unknownRouteConfig: any;
    viewPortDefaults: any;
    private _fallbackRoute;
    /**
     * Adds a step to be run during the [[Router]]'s navigation pipeline.
     *
     * @param name The name of the pipeline slot to insert the step into.
     * @param step The pipeline step.
     * @chainable
     */
    addPipelineStep(name: string, step: Function | PipelineStep): RouterConfiguration;
    /**
     * Adds a step to be run during the [[Router]]'s authorize pipeline slot.
     *
     * @param step The pipeline step.
     * @chainable
     */
    addAuthorizeStep(step: Function | PipelineStep): RouterConfiguration;
    /**
     * Adds a step to be run during the [[Router]]'s preActivate pipeline slot.
     *
     * @param step The pipeline step.
     * @chainable
     */
    addPreActivateStep(step: Function | PipelineStep): RouterConfiguration;
    /**
     * Adds a step to be run during the [[Router]]'s preRender pipeline slot.
     *
     * @param step The pipeline step.
     * @chainable
     */
    addPreRenderStep(step: Function | PipelineStep): RouterConfiguration;
    /**
     * Adds a step to be run during the [[Router]]'s postRender pipeline slot.
     *
     * @param step The pipeline step.
     * @chainable
     */
    addPostRenderStep(step: Function | PipelineStep): RouterConfiguration;
    /**
     * Configures a route that will be used if there is no previous location available on navigation cancellation.
     *
     * @param fragment The URL fragment to use as the navigation destination.
     * @chainable
     */
    fallbackRoute(fragment: string): RouterConfiguration;
    /**
     * Maps one or more routes to be registered with the router.
     *
     * @param route The [[RouteConfig]] to map, or an array of [[RouteConfig]] to map.
     * @chainable
     */
    map(route: RouteConfig | RouteConfig[]): RouterConfiguration;
    /**
     * Configures defaults to use for any view ports.
     *
     * @param viewPortConfig a view port configuration object to use as a
     *  default, of the form { viewPortName: { moduleId } }.
     * @chainable
     */
    useViewPortDefaults(viewPortConfig: ViewPortConfig): RouterConfiguration;
    /**
     * Maps a single route to be registered with the router.
     *
     * @param route The [[RouteConfig]] to map.
     * @chainable
     */
    mapRoute(config: RouteConfig): RouterConfiguration;
    /**
     * Registers an unknown route handler to be run when the URL fragment doesn't match any registered routes.
     *
     * @param config A string containing a moduleId to load, or a [[RouteConfig]], or a function that takes the
     *  [[NavigationInstruction]] and selects a moduleId to load.
     * @chainable
     */
    mapUnknownRoutes(config: string | RouteConfig | ((instruction: NavigationInstruction) => string | RouteConfig | Promise<string | RouteConfig>)): RouterConfiguration;
    /**
     * Applies the current configuration to the specified [[Router]].
     *
     * @param router The [[Router]] to apply the configuration to.
     */
    exportToRouter(router: Router): void;
}
