System.register([], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var NavModel;
    return {
        setters: [],
        execute: function () {
            /**
             * Class for storing and interacting with a route's navigation settings.
             */
            NavModel = class NavModel {
                constructor(router, relativeHref) {
                    /**
                     * True if this nav item is currently active.
                     */
                    this.isActive = false;
                    /**
                     * The title.
                     */
                    this.title = null;
                    /**
                     * This nav item's absolute href.
                     */
                    this.href = null;
                    /**
                     * This nav item's relative href.
                     */
                    this.relativeHref = null;
                    /**
                     * Data attached to the route at configuration time.
                     */
                    this.settings = {};
                    /**
                     * The route config.
                     */
                    this.config = null;
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
                setTitle(title) {
                    this.title = title;
                    if (this.isActive) {
                        this.router.updateTitle();
                    }
                }
            };
            exports_1("NavModel", NavModel);
        }
    };
});
//# sourceMappingURL=nav-model.js.map