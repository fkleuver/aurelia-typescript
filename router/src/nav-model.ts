import { RouteConfig } from "./interfaces";
import { Router } from "./router";

/**
 * Class for storing and interacting with a route's navigation settings.
 */
export class NavModel {
  /**
   * True if this nav item is currently active.
   */
  public isActive: boolean = false;

  /**
   * The title.
   */
  public title: string = null as any;

  /**
   * This nav item's absolute href.
   */
  public href: string = null as any;

  /**
   * This nav item's relative href.
   */
  public relativeHref: string = null as any;

  /**
   * Data attached to the route at configuration time.
   */
  public settings: any = {};

  /**
   * The route config.
   */
  public config: RouteConfig | null = null;

  /**
   * The router associated with this navigation model.
   */
  public router: Router;

  public order: number;

  constructor(router: Router, relativeHref: string) {
    this.router = router;
    this.relativeHref = relativeHref;
  }

  /**
   * Sets the route's title and updates document.title.
   *  If the a navigation is in progress, the change will be applied
   *  to document.title when the navigation completes.
   *
   * @param title The new title.
   */
  public setTitle(title: string): void {
    this.title = title;

    if (this.isActive) {
      this.router.updateTitle();
    }
  }
}
