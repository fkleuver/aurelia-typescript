import { RouteConfig } from "./interfaces";
import { Router } from "./router";
/**
 * Class for storing and interacting with a route's navigation settings.
 */
export declare class NavModel {
    /**
     * True if this nav item is currently active.
     */
    isActive: boolean;
    /**
     * The title.
     */
    title: string;
    /**
     * This nav item's absolute href.
     */
    href: string;
    /**
     * This nav item's relative href.
     */
    relativeHref: string;
    /**
     * Data attached to the route at configuration time.
     */
    settings: any;
    /**
     * The route config.
     */
    config: RouteConfig | null;
    /**
     * The router associated with this navigation model.
     */
    router: Router;
    order: number;
    constructor(router: Router, relativeHref: string);
    /**
     * Sets the route's title and updates document.title.
     *  If the a navigation is in progress, the change will be applied
     *  to document.title when the navigation completes.
     *
     * @param title The new title.
     */
    setTitle(title: string): void;
}
