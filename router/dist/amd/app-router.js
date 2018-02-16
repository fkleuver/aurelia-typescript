var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "aurelia-dependency-injection", "aurelia-event-aggregator", "aurelia-history", "aurelia-logging", "./navigation-commands", "./pipeline-provider", "./router"], function (require, exports, aurelia_dependency_injection_1, aurelia_event_aggregator_1, aurelia_history_1, LogManager, navigation_commands_1, pipeline_provider_1, router_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const logger = LogManager.getLogger("app-router");
    /**
     * The main application router.
     */
    class AppRouter extends router_1.Router {
        // tslint:disable-next-line:function-name
        static get inject() {
            return [aurelia_dependency_injection_1.Container, aurelia_history_1.History, pipeline_provider_1.PipelineProvider, aurelia_event_aggregator_1.EventAggregator];
        }
        constructor(container, history, pipelineProvider, events) {
            super(container, history); //Note the super will call reset internally.
            this.pipelineProvider = pipelineProvider;
            this.events = events;
        }
        /**
         * Fully resets the router's internal state. Primarily used internally by the framework when multiple calls to setRoot are made.
         * Use with caution (actually, avoid using this). Do not use this to simply change your navigation model.
         */
        reset() {
            super.reset();
            this.maxInstructionCount = 10;
            if (!this._queue) {
                this._queue = [];
            }
            else {
                this._queue.length = 0;
            }
        }
        /**
         * Loads the specified URL.
         *
         * @param url The URL fragment to load.
         */
        loadUrl(url) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const instruction = yield this._createNavigationInstruction(url);
                    return this._queueInstruction(instruction);
                }
                catch (error) {
                    logger.error(error);
                    restorePreviousLocation(this);
                }
            });
        }
        /**
         * Registers a viewPort to be used as a rendering target for activated routes.
         *
         * @param viewPort The viewPort.
         * @param name The name of the viewPort. 'default' if unspecified.
         */
        registerViewPort(viewPort, name) {
            const _super = name => super[name];
            return __awaiter(this, void 0, void 0, function* () {
                _super("registerViewPort").call(this, viewPort, name);
                if (!this.isActive) {
                    const viewModel = this._findViewModel(viewPort);
                    if ("configureRouter" in viewModel) {
                        if (!this.isConfigured) {
                            const resolveConfiguredPromise = this._resolveConfiguredPromise;
                            // tslint:disable-next-line:no-empty
                            this._resolveConfiguredPromise = () => { };
                            yield this.configure((config) => viewModel.configureRouter(config, this));
                            this.activate();
                            resolveConfiguredPromise();
                        }
                    }
                    else {
                        this.activate();
                    }
                }
                else {
                    this._dequeueInstruction();
                }
            });
        }
        /**
         * Activates the router. This instructs the router to begin listening for history changes and processing instructions.
         *
         * @params options The set of options to activate the router with.
         */
        activate(options) {
            if (this.isActive) {
                return;
            }
            this.isActive = true;
            this.options = Object.assign({ routeHandler: this.loadUrl.bind(this) }, this.options, options);
            this.history.activate(this.options);
            this._dequeueInstruction();
        }
        /**
         * Deactivates the router.
         */
        deactivate() {
            this.isActive = false;
            this.history.deactivate();
        }
        // tslint:disable-next-line:function-name
        _queueInstruction(instruction) {
            return __awaiter(this, void 0, void 0, function* () {
                // tslint:disable-next-line:promise-must-complete
                return new Promise((resolve) => {
                    instruction.resolve = resolve;
                    this._queue.unshift(instruction);
                    this._dequeueInstruction();
                });
            });
        }
        // tslint:disable-next-line:function-name
        _dequeueInstruction(instructionCount = 0) {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.isNavigating && !instructionCount) {
                    return undefined;
                }
                const instruction = this._queue.shift();
                this._queue.length = 0;
                if (!instruction) {
                    return undefined;
                }
                this.isNavigating = true;
                let navtracker = this.history.getState("NavigationTracker");
                if (!navtracker && !this.currentNavigationTracker) {
                    this.isNavigatingFirst = true;
                    this.isNavigatingNew = true;
                }
                else if (!navtracker) {
                    this.isNavigatingNew = true;
                }
                else if (!this.currentNavigationTracker) {
                    this.isNavigatingRefresh = true;
                }
                else if (this.currentNavigationTracker < navtracker) {
                    this.isNavigatingForward = true;
                }
                else if (this.currentNavigationTracker > navtracker) {
                    this.isNavigatingBack = true;
                }
                if (!navtracker) {
                    navtracker = Date.now();
                    this.history.setState("NavigationTracker", navtracker);
                }
                this.currentNavigationTracker = navtracker;
                instruction.previousInstruction = this.currentInstruction;
                if (!instructionCount) {
                    this.events.publish("router:navigation:processing", { instruction });
                }
                else if (instructionCount === this.maxInstructionCount - 1) {
                    logger.error(`${instructionCount +
                        1} navigation instructions have been attempted without success. Restoring last known good location.`);
                    restorePreviousLocation(this);
                    return this._dequeueInstruction(instructionCount + 1);
                }
                else if (instructionCount > this.maxInstructionCount) {
                    throw new Error("Maximum navigation attempts exceeded. Giving up.");
                }
                const pipeline = this.pipelineProvider.createPipeline();
                let result;
                try {
                    result = yield pipeline.run(instruction);
                    result = yield processResult(instruction, result, instructionCount, this);
                }
                catch (error) {
                    return { output: error instanceof Error ? error : new Error(error) };
                }
                return resolveInstruction(instruction, result, !!instructionCount, this);
            });
        }
        // tslint:disable-next-line:function-name
        _findViewModel(viewPort) {
            if (this.container.viewModel) {
                return this.container.viewModel;
            }
            if (viewPort.container) {
                let container = viewPort.container;
                while (container) {
                    if (container.viewModel) {
                        this.container.viewModel = container.viewModel;
                        return container.viewModel;
                    }
                    container = container.parent;
                }
            }
            return undefined;
        }
    }
    exports.AppRouter = AppRouter;
    function processResult(
    // tslint:disable-next-line:variable-name
    _instruction, result, instructionCount, router) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(result && "completed" in result && "output" in result)) {
                // tslint:disable-next-line:no-parameter-reassignment
                result = result || {};
                result.output = new Error(`Expected router pipeline to return a navigation result, but got [${JSON.stringify(result)}] instead.`);
            }
            let finalResult = null;
            if (navigation_commands_1.isNavigationCommand(result.output)) {
                result.output.navigate(router);
            }
            else {
                finalResult = result;
                if (!result.completed) {
                    if (result.output instanceof Error) {
                        logger.error(result.output);
                    }
                    restorePreviousLocation(router);
                }
            }
            const innerResult = yield router._dequeueInstruction(instructionCount + 1);
            return finalResult || innerResult || result;
        });
    }
    function resolveInstruction(instruction, result, isInnerInstruction, router) {
        instruction.resolve(result);
        const eventArgs = { instruction, result };
        if (!isInnerInstruction) {
            router.isNavigating = false;
            router.isExplicitNavigation = false;
            router.isExplicitNavigationBack = false;
            router.isNavigatingFirst = false;
            router.isNavigatingNew = false;
            router.isNavigatingRefresh = false;
            router.isNavigatingForward = false;
            router.isNavigatingBack = false;
            let eventName;
            if (result.output instanceof Error) {
                eventName = "error";
            }
            else if (!result.completed) {
                eventName = "canceled";
            }
            else {
                const queryString = instruction.queryString ? `?${instruction.queryString}` : "";
                router.history.previousLocation = instruction.fragment + queryString;
                eventName = "success";
            }
            router.events.publish(`router:navigation:${eventName}`, eventArgs);
            router.events.publish("router:navigation:complete", eventArgs);
        }
        else {
            router.events.publish("router:navigation:child:complete", eventArgs);
        }
        return result;
    }
    function restorePreviousLocation(router) {
        const previousLocation = router.history.previousLocation;
        if (previousLocation) {
            router.navigate(previousLocation, { trigger: false, replace: true });
        }
        else if (router.fallbackRoute) {
            router.navigate(router.fallbackRoute, { trigger: true, replace: true });
        }
        else {
            logger.error("Router navigation failed, and no previous location or fallbackRoute could be restored.");
        }
    }
});
//# sourceMappingURL=app-router.js.map