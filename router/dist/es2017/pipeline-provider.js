import { Container } from "aurelia-dependency-injection";
import { ActivateNextStep, CanActivateNextStep, CanDeactivatePreviousStep, DeactivatePreviousStep } from "./activation";
import { CommitChangesStep } from "./navigation-instruction";
import { BuildNavigationPlanStep } from "./navigation-plan";
import { Pipeline } from "./pipeline";
import { LoadRouteStep } from "./route-loading";
export class PipelineSlot {
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
/**
 * Class responsible for creating the navigation pipeline.
 */
export class PipelineProvider {
    static get inject() {
        return [Container];
    }
    constructor(container) {
        this.container = container;
        this.steps = [
            BuildNavigationPlanStep,
            CanDeactivatePreviousStep,
            LoadRouteStep,
            this._createPipelineSlot("authorize"),
            CanActivateNextStep,
            this._createPipelineSlot("preActivate", "modelbind"),
            //NOTE: app state changes start below - point of no return
            DeactivatePreviousStep,
            ActivateNextStep,
            this._createPipelineSlot("preRender", "precommit"),
            CommitChangesStep,
            this._createPipelineSlot("postRender", "postcomplete")
        ];
    }
    /**
     * Create the navigation pipeline.
     */
    createPipeline() {
        const pipeline = new Pipeline();
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
//# sourceMappingURL=pipeline-provider.js.map