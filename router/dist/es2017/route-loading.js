import { _buildNavigationPlan, activationStrategy } from "./navigation-plan";
export class RouteLoader {
    // tslint:disable
    loadRoute(_router, _config, _navigationInstruction) {
        throw Error('Route loaders must implement "loadRoute(router, config, navigationInstruction)".');
    }
}
export class LoadRouteStep {
    static get inject() {
        return [RouteLoader];
    }
    constructor(routeLoader) {
        this.routeLoader = routeLoader;
    }
    run(navigationInstruction, next) {
        return loadNewRoute(this.routeLoader, navigationInstruction)
            .then(next)
            .catch(next.cancel);
    }
}
async function loadNewRoute(routeLoader, navigationInstruction) {
    const toLoad = determineWhatToLoad(navigationInstruction);
    for (const current of toLoad) {
        await loadRoute(routeLoader, current.navigationInstruction, current.viewPortPlan);
    }
}
function determineWhatToLoad(navigationInstruction, toLoad = []) {
    const plan = navigationInstruction.plan;
    for (const viewPortName of Object.keys(plan)) {
        const viewPortPlan = plan[viewPortName];
        if (viewPortPlan.strategy === activationStrategy.replace) {
            toLoad.push({ viewPortPlan, navigationInstruction });
            if (viewPortPlan.childNavigationInstruction) {
                determineWhatToLoad(viewPortPlan.childNavigationInstruction, toLoad);
            }
        }
        else {
            const viewPortInstruction = navigationInstruction.addViewPortInstruction(viewPortName, viewPortPlan.strategy, viewPortPlan.prevModuleId, viewPortPlan.prevComponent);
            if (viewPortPlan.childNavigationInstruction) {
                viewPortInstruction.childNavigationInstruction = viewPortPlan.childNavigationInstruction;
                determineWhatToLoad(viewPortPlan.childNavigationInstruction, toLoad);
            }
        }
    }
    return toLoad;
}
async function loadRoute(routeLoader, navigationInstruction, viewPortPlan) {
    const moduleId = viewPortPlan.config ? viewPortPlan.config.moduleId : null;
    const component = await loadComponent(routeLoader, navigationInstruction, viewPortPlan.config);
    const viewPortInstruction = navigationInstruction.addViewPortInstruction(viewPortPlan.name, viewPortPlan.strategy, moduleId, component);
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
async function loadComponent(routeLoader, navigationInstruction, config) {
    const { router, lifecycleArgs } = navigationInstruction;
    const component = await routeLoader.loadRoute(router, config, navigationInstruction);
    const { viewModel, childContainer } = component;
    component.router = router;
    component.config = config;
    if ("configureRouter" in viewModel) {
        const childRouter = childContainer.getChildRouter();
        component.childRouter = childRouter;
        await childRouter.configure((c) => viewModel.configureRouter(c, childRouter, ...lifecycleArgs));
    }
    return component;
}
//# sourceMappingURL=route-loading.js.map