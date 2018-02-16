System.register(["./navigation-commands", "./util"], function (exports_1, context_1) {
    "use strict";
    var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __moduleName = context_1 && context_1.id;
    // tslint:disable-next-line:function-name
    function _buildNavigationPlan(instruction, forceLifecycleMinimum) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = instruction.config;
            if ("redirect" in config) {
                let redirectLocation = util_1._resolveUrl(config.redirect, getInstructionBaseUrl(instruction));
                if (instruction.queryString) {
                    redirectLocation += `?${instruction.queryString}`;
                }
                throw new navigation_commands_1.Redirect(redirectLocation);
            }
            const prev = instruction.previousInstruction;
            const plan = {};
            const defaults = instruction.router.viewPortDefaults;
            if (prev) {
                const newParams = hasDifferentParameterValues(prev, instruction);
                const pending = [];
                for (const viewPortName of Object.keys(prev.viewPortInstructions)) {
                    const prevViewPortInstruction = prev.viewPortInstructions[viewPortName];
                    let nextViewPortConfig = viewPortName in config.viewPorts ? config.viewPorts[viewPortName] : prevViewPortInstruction;
                    if (nextViewPortConfig.moduleId === null && viewPortName in instruction.router.viewPortDefaults) {
                        nextViewPortConfig = defaults[viewPortName];
                    }
                    const viewPortPlan = (plan[viewPortName] = {
                        name: viewPortName,
                        config: nextViewPortConfig,
                        prevComponent: prevViewPortInstruction.component,
                        prevModuleId: prevViewPortInstruction.moduleId
                    });
                    if (prevViewPortInstruction.moduleId !== nextViewPortConfig.moduleId) {
                        viewPortPlan.strategy = activationStrategy.replace;
                    }
                    else if ("determineActivationStrategy" in prevViewPortInstruction.component.viewModel) {
                        viewPortPlan.strategy = prevViewPortInstruction.component.viewModel.determineActivationStrategy(...instruction.lifecycleArgs);
                    }
                    else if (config.activationStrategy) {
                        viewPortPlan.strategy = config.activationStrategy;
                    }
                    else if (newParams || forceLifecycleMinimum) {
                        viewPortPlan.strategy = activationStrategy.invokeLifecycle;
                    }
                    else {
                        viewPortPlan.strategy = activationStrategy.noChange;
                    }
                    if (viewPortPlan.strategy !== activationStrategy.replace && prevViewPortInstruction.childRouter) {
                        const path = instruction.getWildcardPath();
                        const childInstruction = yield prevViewPortInstruction.childRouter._createNavigationInstruction(path, instruction);
                        viewPortPlan.childNavigationInstruction = childInstruction;
                        const childPlan = yield _buildNavigationPlan(childInstruction, viewPortPlan.strategy === activationStrategy.invokeLifecycle);
                        childInstruction.plan = childPlan;
                    }
                }
                return plan;
            }
            for (const viewPortName of Object.keys(config.viewPorts)) {
                let viewPortConfig = config.viewPorts[viewPortName];
                if (viewPortConfig.moduleId === null && viewPortName in instruction.router.viewPortDefaults) {
                    viewPortConfig = defaults[viewPortName];
                }
                plan[viewPortName] = {
                    name: viewPortName,
                    strategy: activationStrategy.replace,
                    config: viewPortConfig
                };
            }
            return plan;
        });
    }
    exports_1("_buildNavigationPlan", _buildNavigationPlan);
    function hasDifferentParameterValues(prev, next) {
        const prevParams = prev.params;
        const nextParams = next.params;
        const nextWildCardName = next.config.hasChildRouter ? next.getWildCardName() : null;
        for (const key of Object.keys(nextParams)) {
            if (key === nextWildCardName) {
                continue;
            }
            if (prevParams[key] !== nextParams[key]) {
                return true;
            }
        }
        for (const key of Object.keys(prevParams)) {
            if (key === nextWildCardName) {
                continue;
            }
            if (prevParams[key] !== nextParams[key]) {
                return true;
            }
        }
        if (!next.options.compareQueryParams) {
            return false;
        }
        const prevQueryParams = prev.queryParams;
        const nextQueryParams = next.queryParams;
        for (const key of Object.keys(nextQueryParams)) {
            if (prevQueryParams[key] !== nextQueryParams[key]) {
                return true;
            }
        }
        for (const key of Object.keys(prevQueryParams)) {
            if (prevQueryParams[key] !== nextQueryParams[key]) {
                return true;
            }
        }
        return false;
    }
    // tslint:disable:no-parameter-reassignment
    function getInstructionBaseUrl(instruction) {
        const instructionBaseUrlParts = [];
        instruction = instruction.parentInstruction;
        while (instruction) {
            instructionBaseUrlParts.unshift(instruction.getBaseUrl());
            instruction = instruction.parentInstruction;
        }
        instructionBaseUrlParts.unshift("/");
        return instructionBaseUrlParts.join("");
    }
    var navigation_commands_1, util_1, activationStrategy, BuildNavigationPlanStep;
    return {
        setters: [
            function (navigation_commands_1_1) {
                navigation_commands_1 = navigation_commands_1_1;
            },
            function (util_1_1) {
                util_1 = util_1_1;
            }
        ],
        execute: function () {
            /**
             * The strategy to use when activating modules during navigation.
             */
            exports_1("activationStrategy", activationStrategy = {
                noChange: "no-change",
                invokeLifecycle: "invoke-lifecycle",
                replace: "replace"
            });
            BuildNavigationPlanStep = class BuildNavigationPlanStep {
                run(navigationInstruction, next) {
                    return __awaiter(this, void 0, void 0, function* () {
                        try {
                            const plan = yield _buildNavigationPlan(navigationInstruction);
                            navigationInstruction.plan = plan;
                            return next();
                        }
                        catch (error) {
                            return next.cancel(error);
                        }
                    });
                }
            };
            exports_1("BuildNavigationPlanStep", BuildNavigationPlanStep);
        }
    };
});
//# sourceMappingURL=navigation-plan.js.map