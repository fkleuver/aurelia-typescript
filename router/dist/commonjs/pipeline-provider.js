"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aurelia_dependency_injection_1 = require("aurelia-dependency-injection");
const activation_1 = require("./activation");
const navigation_instruction_1 = require("./navigation-instruction");
const navigation_plan_1 = require("./navigation-plan");
const pipeline_1 = require("./pipeline");
const route_loading_1 = require("./route-loading");
class PipelineSlot {
    constructor(container, name, alias) {
        this.steps = [];
        this.container = container;
        this.slotName = name;
        this.slotAlias = alias;
    }
    getSteps() {
        return this.steps.map((x) => this.container.get(x));
    }
}
exports.PipelineSlot = PipelineSlot;
/**
 * Class responsible for creating the navigation pipeline.
 */
class PipelineProvider {
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
}
exports.PipelineProvider = PipelineProvider;
//# sourceMappingURL=pipeline-provider.js.map