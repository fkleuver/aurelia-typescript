System.register(["./navigation-commands", "./navigation-plan"], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    function processDeactivatable(navigationInstruction, callbackName, next, ignoreResult) {
        const plan = navigationInstruction.plan;
        const infos = findDeactivatable(plan, callbackName);
        let i = infos.length; //query from inside out
        function inspect(val) {
            if (ignoreResult || shouldContinue(val)) {
                return iterate();
            }
            return next.cancel(val);
        }
        function iterate() {
            if (i--) {
                try {
                    const viewModel = infos[i];
                    const result = viewModel[callbackName](navigationInstruction);
                    return processPotential(result, inspect, next.cancel);
                }
                catch (error) {
                    return next.cancel(error);
                }
            }
            return next();
        }
        return iterate();
    }
    function findDeactivatable(plan, callbackName, list = []) {
        for (const viewPortName of Object.keys(plan)) {
            const viewPortPlan = plan[viewPortName];
            const prevComponent = viewPortPlan.prevComponent;
            if ((viewPortPlan.strategy === navigation_plan_1.activationStrategy.invokeLifecycle ||
                viewPortPlan.strategy === navigation_plan_1.activationStrategy.replace) &&
                prevComponent) {
                const viewModel = prevComponent.viewModel;
                if (callbackName in viewModel) {
                    list.push(viewModel);
                }
            }
            if (viewPortPlan.strategy === navigation_plan_1.activationStrategy.replace && prevComponent) {
                addPreviousDeactivatable(prevComponent, callbackName, list);
            }
            else if (viewPortPlan.childNavigationInstruction) {
                findDeactivatable(viewPortPlan.childNavigationInstruction.plan, callbackName, list);
            }
        }
        return list;
    }
    function addPreviousDeactivatable(component, callbackName, list) {
        const childRouter = component.childRouter;
        if (childRouter && childRouter.currentInstruction) {
            const viewPortInstructions = childRouter.currentInstruction.viewPortInstructions;
            for (const viewPortName of Object.keys(viewPortInstructions)) {
                const viewPortInstruction = viewPortInstructions[viewPortName];
                const prevComponent = viewPortInstruction.component;
                const prevViewModel = prevComponent.viewModel;
                if (callbackName in prevViewModel) {
                    list.push(prevViewModel);
                }
                addPreviousDeactivatable(prevComponent, callbackName, list);
            }
        }
    }
    function processActivatable(navigationInstruction, callbackName, next, ignoreResult) {
        const infos = findActivatable(navigationInstruction, callbackName);
        const length = infos.length;
        let i = -1; //query from top down
        function inspect(val, router) {
            if (ignoreResult || shouldContinue(val, router)) {
                return iterate();
            }
            return next.cancel(val);
        }
        function iterate() {
            i++;
            if (i < length) {
                try {
                    const current = infos[i];
                    const result = current.viewModel[callbackName](...current.lifecycleArgs);
                    return processPotential(result, (val) => inspect(val, current.router), next.cancel);
                }
                catch (error) {
                    return next.cancel(error);
                }
            }
            return next();
        }
        return iterate();
    }
    function findActivatable(navigationInstruction, callbackName, list = [], router) {
        const plan = navigationInstruction.plan;
        Object.keys(plan).filter((viewPortName) => {
            const viewPortPlan = plan[viewPortName];
            const viewPortInstruction = navigationInstruction.viewPortInstructions[viewPortName];
            const viewModel = viewPortInstruction.component.viewModel;
            if ((viewPortPlan.strategy === navigation_plan_1.activationStrategy.invokeLifecycle ||
                viewPortPlan.strategy === navigation_plan_1.activationStrategy.replace) &&
                callbackName in viewModel) {
                list.push({
                    viewModel,
                    lifecycleArgs: viewPortInstruction.lifecycleArgs,
                    router
                });
            }
            if (viewPortPlan.childNavigationInstruction) {
                findActivatable(viewPortPlan.childNavigationInstruction, callbackName, list, viewPortInstruction.component.childRouter || router);
            }
        });
        return list;
    }
    function shouldContinue(output, router) {
        if (output instanceof Error) {
            return false;
        }
        if (navigation_commands_1.isNavigationCommand(output)) {
            if (typeof output.setRouter === "function") {
                output.setRouter(router);
            }
            return !!output.shouldContinueProcessing;
        }
        if (output === undefined) {
            return true;
        }
        return output;
    }
    function processPotential(obj, resolve, reject) {
        if (obj && typeof obj.then === "function") {
            return Promise.resolve(obj)
                .then(resolve)
                .catch(reject);
        }
        if (obj && typeof obj.subscribe === "function") {
            const obs = obj;
            return new SafeSubscription((sub) => obs.subscribe({
                next() {
                    if (sub.subscribed) {
                        sub.unsubscribe();
                        resolve(obj);
                    }
                },
                error(error) {
                    if (sub.subscribed) {
                        sub.unsubscribe();
                        reject(error);
                    }
                },
                complete() {
                    if (sub.subscribed) {
                        sub.unsubscribe();
                        resolve(obj);
                    }
                }
            }));
        }
        try {
            return resolve(obj);
        }
        catch (error) {
            return reject(error);
        }
    }
    var navigation_commands_1, navigation_plan_1, CanDeactivatePreviousStep, CanActivateNextStep, DeactivatePreviousStep, ActivateNextStep, SafeSubscription;
    return {
        setters: [
            function (navigation_commands_1_1) {
                navigation_commands_1 = navigation_commands_1_1;
            },
            function (navigation_plan_1_1) {
                navigation_plan_1 = navigation_plan_1_1;
            }
        ],
        execute: function () {
            CanDeactivatePreviousStep = class CanDeactivatePreviousStep {
                run(navigationInstruction, next) {
                    return processDeactivatable(navigationInstruction, "canDeactivate", next);
                }
            };
            exports_1("CanDeactivatePreviousStep", CanDeactivatePreviousStep);
            CanActivateNextStep = class CanActivateNextStep {
                run(navigationInstruction, next) {
                    return processActivatable(navigationInstruction, "canActivate", next);
                }
            };
            exports_1("CanActivateNextStep", CanActivateNextStep);
            DeactivatePreviousStep = class DeactivatePreviousStep {
                run(navigationInstruction, next) {
                    return processDeactivatable(navigationInstruction, "deactivate", next, true);
                }
            };
            exports_1("DeactivatePreviousStep", DeactivatePreviousStep);
            ActivateNextStep = class ActivateNextStep {
                run(navigationInstruction, next) {
                    return processActivatable(navigationInstruction, "activate", next, true);
                }
            };
            exports_1("ActivateNextStep", ActivateNextStep);
            /**
             * wraps a subscription, allowing unsubscribe calls even if
             * the first value comes synchronously
             */
            SafeSubscription = class SafeSubscription {
                // tslint:enable:variable-name
                constructor(subscriptionFunc) {
                    this._subscribed = true;
                    this._subscription = subscriptionFunc(this);
                    if (!this._subscribed) {
                        this.unsubscribe();
                    }
                }
                get subscribed() {
                    return this._subscribed;
                }
                unsubscribe() {
                    if (this._subscribed && this._subscription) {
                        this._subscription.unsubscribe();
                    }
                    this._subscribed = false;
                }
            };
        }
    };
});
//# sourceMappingURL=activation.js.map