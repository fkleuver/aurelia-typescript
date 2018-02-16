var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
function loadNewRoute(routeLoader, navigationInstruction) {
    return __awaiter(this, void 0, void 0, function* () {
        const toLoad = determineWhatToLoad(navigationInstruction);
        for (const current of toLoad) {
            yield loadRoute(routeLoader, current.navigationInstruction, current.viewPortPlan);
        }
    });
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
function loadRoute(routeLoader, navigationInstruction, viewPortPlan) {
    return __awaiter(this, void 0, void 0, function* () {
        const moduleId = viewPortPlan.config ? viewPortPlan.config.moduleId : null;
        const component = yield loadComponent(routeLoader, navigationInstruction, viewPortPlan.config);
        const viewPortInstruction = navigationInstruction.addViewPortInstruction(viewPortPlan.name, viewPortPlan.strategy, moduleId, component);
        const childRouter = component.childRouter;
        if (childRouter) {
            const path = navigationInstruction.getWildcardPath();
            const childInstruction = yield childRouter._createNavigationInstruction(path, navigationInstruction);
            viewPortPlan.childNavigationInstruction = childInstruction;
            const childPlan = yield _buildNavigationPlan(childInstruction);
            childInstruction.plan = childPlan;
            viewPortInstruction.childNavigationInstruction = childInstruction;
            return loadNewRoute(routeLoader, childInstruction);
        }
    });
}
function loadComponent(routeLoader, navigationInstruction, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const { router, lifecycleArgs } = navigationInstruction;
        const component = yield routeLoader.loadRoute(router, config, navigationInstruction);
        const { viewModel, childContainer } = component;
        component.router = router;
        component.config = config;
        if ("configureRouter" in viewModel) {
            const childRouter = childContainer.getChildRouter();
            component.childRouter = childRouter;
            yield childRouter.configure((c) => viewModel.configureRouter(c, childRouter, ...lifecycleArgs));
        }
        return component;
    });
}
//# sourceMappingURL=route-loading.js.map