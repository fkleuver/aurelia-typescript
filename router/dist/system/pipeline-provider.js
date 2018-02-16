System.register(["aurelia-dependency-injection", "./activation", "./navigation-instruction", "./navigation-plan", "./pipeline", "./route-loading"], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var aurelia_dependency_injection_1, activation_1, navigation_instruction_1, navigation_plan_1, pipeline_1, route_loading_1, PipelineSlot, PipelineProvider;
    return {
        setters: [
            function (aurelia_dependency_injection_1_1) {
                aurelia_dependency_injection_1 = aurelia_dependency_injection_1_1;
            },
            function (activation_1_1) {
                activation_1 = activation_1_1;
            },
            function (navigation_instruction_1_1) {
                navigation_instruction_1 = navigation_instruction_1_1;
            },
            function (navigation_plan_1_1) {
                navigation_plan_1 = navigation_plan_1_1;
            },
            function (pipeline_1_1) {
                pipeline_1 = pipeline_1_1;
            },
            function (route_loading_1_1) {
                route_loading_1 = route_loading_1_1;
            }
        ],
        execute: function () {
            PipelineSlot = class PipelineSlot {
                constructor(container, name, alias) {
                    this.steps = [];
                    this.container = container;
                    this.slotName = name;
                    this.slotAlias = alias;
                }
                getSteps() {
                    return this.steps.map((x) => this.container.get(x));
                }
            };
            exports_1("PipelineSlot", PipelineSlot);
            /**
             * Class responsible for creating the navigation pipeline.
             */
            PipelineProvider = class PipelineProvider {
                static get inject() {
                    return [aurelia_dependency_injection_1.Container];
                }
                constructor(container) {
                    this.container = container;
                    this.steps = [
                        navigation_plan_1.BuildNavigationPlanStep,
                        activation_1.CanDeactivatePreviousStep,
                        route_loading_1.LoadRouteStep,
                        this._createPipelineSlot("authorize"),
                        activation_1.CanActivateNextStep,
                        this._createPipelineSlot("preActivate", "modelbind"),
                        //NOTE: app state changes start below - point of no return
                        activation_1.DeactivatePreviousStep,
                        activation_1.ActivateNextStep,
                        this._createPipelineSlot("preRender", "precommit"),
                        navigation_instruction_1.CommitChangesStep,
                        this._createPipelineSlot("postRender", "postcomplete")
                    ];
                }
                /**
                 * Create the navigation pipeline.
                 */
                createPipeline() {
                    const pipeline = new pipeline_1.Pipeline();
                    this.steps.forEach((step) => pipeline.addStep(this.container.get(step)));
                    return pipeline;
                }
                /**
                 * Adds a step into the pipeline at a known slot location.
                 */
                addStep(name, step) {
                    const found = this._findStep(name);
                    if (found) {
                        if (!found.steps.includes(step)) {
                            // prevent duplicates
                            found.steps.push(step);
                        }
                    }
                    else {
                        throw new Error(`Invalid pipeline slot name: ${name}.`);
                    }
                }
                /**
                 * Removes a step from a slot in the pipeline
                 */
                removeStep(name, step) {
                    const slot = this._findStep(name);
                    if (slot) {
                        slot.steps.splice(slot.steps.indexOf(step), 1);
                    }
                }
                /**
                 * Clears all steps from a slot in the pipeline
                 */
                // tslint:disable-next-line:function-name
                _clearSteps(name = "") {
                    const slot = this._findStep(name);
                    if (slot) {
                        slot.steps = [];
                    }
                }
                /**
                 * Resets all pipeline slots
                 */
                // tslint:disable-next-line:typedef
                reset() {
                    this._clearSteps("authorize");
                    this._clearSteps("preActivate");
                    this._clearSteps("preRender");
                    this._clearSteps("postRender");
                }
                // tslint:disable-next-line:function-name
                _createPipelineSlot(name, alias) {
                    return new PipelineSlot(this.container, name, alias);
                }
                // tslint:disable-next-line:function-name
                _findStep(name) {
                    return this.steps.find((x) => x.slotName === name || x.slotAlias === name);
                }
            };
            exports_1("PipelineProvider", PipelineProvider);
        }
    };
});
//# sourceMappingURL=pipeline-provider.js.map