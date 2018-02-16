"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const navigation_plan_1 = require("./navigation-plan");
class CommitChangesStep {
    run(navigationInstruction, next) {
        return __awaiter(this, void 0, void 0, function* () {
            yield navigationInstruction._commitChanges(true);
            navigationInstruction._updateTitle();
            return next();
        });
    }
}
exports.CommitChangesStep = CommitChangesStep;
/**
 * Class used to represent an instruction during a navigation.
 */
class NavigationInstruction {
    constructor(init) {
        this.plan = null;
        this.options = {};
        Object.assign(this, init);
        this.params = this.params || {};
        this.viewPortInstructions = {};
        const ancestorParams = [];
        // tslint:disable-next-line:no-this-assignment
        let current = this;
        do {
            const currentParams = Object.assign({}, current.params);
            if (current.config && current.config.hasChildRouter) {
                // remove the param for the injected child route segment
                delete currentParams[current.getWildCardName()];
            }
            ancestorParams.unshift(currentParams);
            current = current.parentInstruction;
        } while (current);
        const allParams = Object.assign({}, this.queryParams, ...ancestorParams);
        this.lifecycleArgs = [allParams, this.config, this];
    }
    /**
     * Gets an array containing this instruction and all child instructions for the current navigation.
     */
    getAllInstructions() {
        const instructions = [this];
        for (const key of Object.keys(this.viewPortInstructions)) {
            const childInstruction = this.viewPortInstructions[key].childNavigationInstruction;
            if (childInstruction) {
                instructions.push(...childInstruction.getAllInstructions());
            }
        }
        return instructions;
    }
    /**
     * Gets an array containing the instruction and all child instructions for the previous navigation.
     * Previous instructions are no longer available after navigation completes.
     */
    getAllPreviousInstructions() {
        return this.getAllInstructions()
            .map((c) => c.previousInstruction)
            .filter((c) => c);
    }
    /**
     * Adds a viewPort instruction.
     */
    addViewPortInstruction(viewPortName, strategy, moduleId, component) {
        const config = Object.assign({}, this.lifecycleArgs[1], { currentViewPort: viewPortName });
        // tslint:disable-next-line:no-unnecessary-local-variable
        const viewportInstruction = (this.viewPortInstructions[viewPortName] = {
            name: viewPortName,
            strategy: strategy,
            moduleId: moduleId,
            component: component,
            childRouter: component.childRouter,
            lifecycleArgs: [].concat(this.lifecycleArgs[0], config, this.lifecycleArgs[2])
        });
        return viewportInstruction;
    }
    /**
     * Gets the name of the route pattern's wildcard parameter, if applicable.
     */
    getWildCardName() {
        const wildcardIndex = this.config.route.lastIndexOf("*");
        return this.config.route.substr(wildcardIndex + 1);
    }
    /**
     * Gets the path and query string created by filling the route
     * pattern's wildcard parameter with the matching param.
     */
    getWildcardPath() {
        const wildcardName = this.getWildCardName();
        let path = this.params[wildcardName] || "";
        if (this.queryString) {
            path += `?${this.queryString}`;
        }
        return path;
    }
    /**
     * Gets the instruction's base URL, accounting for wildcard route parameters.
     */
    getBaseUrl() {
        let fragment = decodeURI(this.fragment);
        if (fragment === "") {
            const nonEmptyRoute = this.router.routes.find((route) => {
                return route.name === this.config.name && route.route !== "";
            });
            if (nonEmptyRoute) {
                fragment = nonEmptyRoute.route;
            }
        }
        if (!this.params) {
            return encodeURI(fragment);
        }
        const wildcardName = this.getWildCardName();
        const path = this.params[wildcardName] || "";
        if (!path) {
            return encodeURI(fragment);
        }
        return encodeURI(fragment.substr(0, fragment.lastIndexOf(path)));
    }
    // tslint:disable-next-line:function-name
    _commitChanges(waitToSwap) {
        return __awaiter(this, void 0, void 0, function* () {
            const router = this.router;
            router.currentInstruction = this;
            if (this.previousInstruction) {
                this.previousInstruction.config.navModel.isActive = false;
            }
            this.config.navModel.isActive = true;
            router._refreshBaseUrl();
            router.refreshNavigation();
            const loads = [];
            const delaySwaps = [];
            for (const viewPortName of Object.keys(this.viewPortInstructions)) {
                const viewPortInstruction = this.viewPortInstructions[viewPortName];
                const viewPort = router.viewPorts[viewPortName];
                if (!viewPort) {
                    throw new Error(`There was no router-view found in the view for ${viewPortInstruction.moduleId}.`);
                }
                if (viewPortInstruction.strategy === navigation_plan_1.activationStrategy.replace) {
                    if (viewPortInstruction.childNavigationInstruction &&
                        viewPortInstruction.childNavigationInstruction.parentCatchHandler) {
                        loads.push(viewPortInstruction.childNavigationInstruction._commitChanges(waitToSwap));
                    }
                    else {
                        if (waitToSwap) {
                            delaySwaps.push({ viewPort, viewPortInstruction });
                        }
                        loads.push(viewPort.process(viewPortInstruction, waitToSwap).then(() => {
                            if (viewPortInstruction.childNavigationInstruction) {
                                return viewPortInstruction.childNavigationInstruction._commitChanges(waitToSwap);
                            }
                        }));
                    }
                }
                else {
                    if (viewPortInstruction.childNavigationInstruction) {
                        loads.push(viewPortInstruction.childNavigationInstruction._commitChanges(waitToSwap));
                    }
                }
            }
            for (const load of loads) {
                yield load;
            }
            for (const delaySwap of delaySwaps) {
                yield delaySwap.viewPort.swap(delaySwap.viewPortInstruction);
            }
            prune(this);
        });
    }
    // tslint:disable-next-line:function-name
    _updateTitle() {
        const title = this._buildTitle();
        if (title) {
            this.router.history.setTitle(title);
        }
    }
    // tslint:disable-next-line:function-name
    _buildTitle(separator = " | ") {
        let title = "";
        const childTitles = [];
        if (this.config.navModel.title) {
            title = this.router.transformTitle(this.config.navModel.title);
        }
        for (const viewPortName of Object.keys(this.viewPortInstructions)) {
            const viewPortInstruction = this.viewPortInstructions[viewPortName];
            if (viewPortInstruction.childNavigationInstruction) {
                const childTitle = viewPortInstruction.childNavigationInstruction._buildTitle(separator);
                if (childTitle) {
                    childTitles.push(childTitle);
                }
            }
        }
        if (childTitles.length) {
            title = childTitles.join(separator) + (title ? separator : "") + title;
        }
        if (this.router.title) {
            title += (title ? separator : "") + this.router.transformTitle(this.router.title);
        }
        return title;
    }
}
exports.NavigationInstruction = NavigationInstruction;
function prune(instruction) {
    instruction.previousInstruction = null;
    instruction.plan = null;
}
//# sourceMappingURL=navigation-instruction.js.map