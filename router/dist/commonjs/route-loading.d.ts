import { NavigationInstruction } from "./navigation-instruction";
import { Next } from "./pipeline";
export declare class RouteLoader {
    loadRoute(_router: any, _config: any, _navigationInstruction: any): Promise<any>;
}
export declare class LoadRouteStep {
    static readonly inject: Function[];
    routeLoader: RouteLoader;
    constructor(routeLoader: RouteLoader);
    run(navigationInstruction: NavigationInstruction, next: Next): Promise<any>;
}
