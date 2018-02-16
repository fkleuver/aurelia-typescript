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
export function isNavigationCommand(obj: any): boolean {
  return obj && typeof obj.navigate === "function";
}

/**
 * Used during the activation lifecycle to cause a redirect.
 */
export class Redirect {
  public url: string;
  public options: any;
  public shouldContinueProcessing: boolean;
  public router: Router;

  /**
   * @param url The URL fragment to use as the navigation destination.
   * @param options The navigation options.
   */
  constructor(url: string, options: any = {}) {
    this.url = url;
    this.options = { trigger: true, replace: true, ...options};
    this.shouldContinueProcessing = false;
  }

  /**
   * Called by the activation system to set the child router.
   *
   * @param router The router.
   */
  public setRouter(router: Router): void {
    this.router = router;
  }

  /**
   * Called by the navigation pipeline to navigate.
   *
   * @param appRouter The router to be redirected.
   */
  public navigate(appRouter: Router): void {
    const navigatingRouter = this.options.useAppRouter ? appRouter : this.router || appRouter;
    navigatingRouter.navigate(this.url, this.options);
  }
}

/**
 * Used during the activation lifecycle to cause a redirect to a named route.
 */
export class RedirectToRoute {
  public route: string;
  public params: any;
  public options: any;
  public shouldContinueProcessing: boolean;
  public router: Router;

  /**
   * @param route The name of the route.
   * @param params The parameters to be sent to the activation method.
   * @param options The options to use for navigation.
   */
  constructor(route: string, params: any = {}, options: any = {}) {
    this.route = route;
    this.params = params;
    this.options = { trigger: true, replace: true, ...options};
    this.shouldContinueProcessing = false;
  }

  /**
   * Called by the activation system to set the child router.
   *
   * @param router The router.
   */
  public setRouter(router: Router): void {
    this.router = router;
  }

  /**
   * Called by the navigation pipeline to navigate.
   *
   * @param appRouter The router to be redirected.
   */
  public navigate(appRouter: Router): void {
    const navigatingRouter = this.options.useAppRouter ? appRouter : this.router || appRouter;
    navigatingRouter.navigateToRoute(this.route, this.params, this.options);
  }
}