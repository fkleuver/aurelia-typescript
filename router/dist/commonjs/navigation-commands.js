"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Determines if the provided object is a navigation command.
 * A navigation command is anything with a navigate method.
 *
 * @param obj The object to check.
 */
function isNavigationCommand(obj) {
    return obj && typeof obj.navigate === "function";
}
exports.isNavigationCommand = isNavigationCommand;
/**
 * Used during the activation lifecycle to cause a redirect.
 */
class Redirect {
    /**
     * @param url The URL fragment to use as the navigation destination.
     * @param options The navigation options.
     */
    constructor(url, options = {}) {
        this.url = url;
        this.options = Object.assign({ trigger: true, replace: true }, options);
        this.shouldContinueProcessing = false;
    }
    /**
     * Called by the activation system to set the child router.
     *
     * @param router The router.
     */
    setRouter(router) {
        this.router = router;
    }
    /**
     * Called by the navigation pipeline to navigate.
     *
     * @param appRouter The router to be redirected.
     */
    navigate(appRouter) {
        const navigatingRouter = this.options.useAppRouter ? appRouter : this.router || appRouter;
        navigatingRouter.navigate(this.url, this.options);
    }
}
exports.Redirect = Redirect;
/**
 * Used during the activation lifecycle to cause a redirect to a named route.
 */
class RedirectToRoute {
    /**
     * @param route The name of the route.
     * @param params The parameters to be sent to the activation method.
     * @param options The options to use for navigation.
     */
    constructor(route, params = {}, options = {}) {
        this.route = route;
        this.params = params;
        this.options = Object.assign({ trigger: true, replace: true }, options);
        this.shouldContinueProcessing = false;
    }
    /**
     * Called by the activation system to set the child router.
     *
     * @param router The router.
     */
    setRouter(router) {
        this.router = router;
    }
    /**
     * Called by the navigation pipeline to navigate.
     *
     * @param appRouter The router to be redirected.
     */
    navigate(appRouter) {
        const navigatingRouter = this.options.useAppRouter ? appRouter : this.router || appRouter;
        navigatingRouter.navigateToRoute(this.route, this.params, this.options);
    }
}
exports.RedirectToRoute = RedirectToRoute;
//# sourceMappingURL=navigation-commands.js.map