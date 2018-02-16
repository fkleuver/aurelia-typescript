import { Container } from "aurelia-dependency-injection";
import { Pipeline, PipelineStep } from "./pipeline";
export declare class PipelineSlot {
    steps: (Function | PipelineStep)[];
    container: Container;
    slotName: string;
    slotAlias?: string;
    constructor(container: Container, name: string, alias?: string);
    getSteps(): PipelineStep[];
}
/**
 * Class responsible for creating the navigation pipeline.
 */
export declare class PipelineProvider {
    static readonly inject: Function[];
    container: Container;
    steps: (PipelineStep | PipelineSlot | Function)[];
    constructor(container: Container);
    /**
     * Create the navigation pipeline.
     */
    createPipeline(): Pipeline;
    /**
     * Adds a step into the pipeline at a known slot location.
     */
    addStep(name: string, step: PipelineStep): void;
    /**
     * Removes a step from a slot in the pipeline
     */
    removeStep(name: string, step: PipelineStep): void;
    /**
     * Clears all steps from a slot in the pipeline
     */
    _clearSteps(name?: string): void;
    /**
     * Resets all pipeline slots
     */
    reset(): void;
    private _createPipelineSlot(name, alias?);
    private _findStep(name);
}
