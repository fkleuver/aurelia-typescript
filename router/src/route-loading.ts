import { NavigationInstruction } from "./navigation-instruction";
import { _buildNavigationPlan, activationStrategy } from "./navigation-plan";
import { Next } from "./pipeline";
import { Router } from "./router";
import { RouterConfiguration } from "./router-configuration";

export class RouteLoader {
  // tslint:disable
  public loadRoute(_router: any, _config: any, _navigationInstruction: any): Promise<any> {
    throw Error('Route loaders must implement "loadRoute(router, config, navigationInstruction)".');
  }
  // tslint:enable
}

export class LoadRouteStep {
  public static get inject(): Function[] {
    return [RouteLoader];
  }

  public routeLoader: RouteLoader;

  constructor(routeLoader: RouteLoader) {
    this.routeLoader = routeLoader;
  }

  public run(navigationInstruction: NavigationInstruction, next: Next): Promise<any> {
    return loadNewRoute(this.routeLoader, navigationInstruction)
      .then(next)
      .catch(next.cancel);
  }
}

async function loadNewRoute(routeLoader: RouteLoader, navigationInstruction: NavigationInstruction): Promise<any> {
  const toLoad = determineWhatToLoad(navigationInstruction) as any[];

  for (const current of toLoad) {
    await loadRoute(routeLoader, current.navigationInstruction, current.viewPortPlan);
  }
}

function determineWhatToLoad(navigationInstruction: NavigationInstruction, toLoad: Object[] = []): Object[] {
  const plan = navigationInstruction.plan as any;

  for (const viewPortName of Object.keys(plan)) {
    const viewPortPlan = plan[viewPortName];

    if (viewPortPlan.strategy === activationStrategy.replace) {
      toLoad.push({ viewPortPlan, navigationInstruction });

      if (viewPortPlan.childNavigationInstruction) {
        determineWhatToLoad(viewPortPlan.childNavigationInstruction, toLoad);
      }
    } else {
      const viewPortInstruction = navigationInstruction.addViewPortInstruction(
        viewPortName,
        viewPortPlan.strategy,
        viewPortPlan.prevModuleId,
        viewPortPlan.prevComponent
      );

      if (viewPortPlan.childNavigationInstruction) {
        viewPortInstruction.childNavigationInstruction = viewPortPlan.childNavigationInstruction;
        determineWhatToLoad(viewPortPlan.childNavigationInstruction, toLoad);
      }
    }
  }

  return toLoad;
}

async function loadRoute(
  routeLoader: RouteLoader,
  navigationInstruction: NavigationInstruction,
  viewPortPlan: any
): Promise<any> {
  const moduleId = viewPortPlan.config ? viewPortPlan.config.moduleId : null;

  const component = await loadComponent(routeLoader, navigationInstruction, viewPortPlan.config);
  const viewPortInstruction = navigationInstruction.addViewPortInstruction(
    viewPortPlan.name,
    viewPortPlan.strategy,
    moduleId,
    component
  );

  const childRouter = component.childRouter;
  if (childRouter) {
    const path = navigationInstruction.getWildcardPath();

    const childInstruction = await childRouter._createNavigationInstruction(path, navigationInstruction);
    viewPortPlan.childNavigationInstruction = childInstruction;

    const childPlan = await _buildNavigationPlan(childInstruction);
    childInstruction.plan = childPlan;
    viewPortInstruction.childNavigationInstruction = childInstruction;

    return loadNewRoute(routeLoader, childInstruction);
  }
}

async function loadComponent(
  routeLoader: RouteLoader,
  navigationInstruction: NavigationInstruction,
  config: any
): Promise<any> {
  const { router, lifecycleArgs } = navigationInstruction as any;

  const component = await routeLoader.loadRoute(router, config, navigationInstruction);
  const { viewModel, childContainer } = component;
  component.router = router;
  component.config = config;

  if ("configureRouter" in viewModel) {
    const childRouter = childContainer.getChildRouter() as Router;
    component.childRouter = childRouter;

    await childRouter.configure((c: RouterConfiguration) =>
      viewModel.configureRouter(c, childRouter, ...lifecycleArgs)
    );
  }

  return component;
}
