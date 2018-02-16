import { Router } from "./router";
/**
 * When a navigation command is encountered, the current navigation
 * will be cancelled and control will be passed to the navigation
 * command so it can determine the correct action.
 */
export interface NavigationCommand {
    navigate(router: Router): void;
}
/**
 * Determines if the provided object is a navigation command.
 * A navigation command is anything with a navigate method.
 *
 * @param obj The object to check.
 */
export declare function isNavigationCommand(obj: any): boolean;
/**
 * Used during the activation lifecycle to cause a redirect.
 */
export declare class Redirect {
    url: string;
    options: any;
    shouldContinueProcessing: boolean;
    router: Router;
    /**
     * @param url The URL fragment to use as the navigation destination.
     * @param options The navigation options.
     */
    constructor(url: string, options?: any);
    /**
     * Called by the activation system to set the child router.
     *
     * @param router The router.
     */
    setRouter(router: Router): void;
    /**
     * Called by the navigation pipeline to navigate.
     *
     * @param appRouter The router to be redirected.
     */
    navigate(appRouter: Router): void;
}
/**
 * Used during the activation lifecycle to cause a redirect to a named route.
 */
export declare class RedirectToRoute {
    route: string;
    params: any;
    options: any;
    shouldContinueProcessing: boolean;
    router: Router;
    /**
     * @param route The name of the route.
     * @param params The parameters to be sent to the activation method.
     * @param options The options to use for navigation.
     */
    constructor(route: string, params?: any, options?: any);
    /**
     * Called by the activation system to set the child router.
     *
     * @param router The router.
     */
    setRouter(router: Router): void;
    /**
     * Called by the navigation pipeline to navigate.
     *
     * @param appRouter The router to be redirected.
     */
    navigate(appRouter: Router): void;
}
