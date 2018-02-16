import { NavigationInstruction } from "./navigation-instruction";
import { PipelineSlot } from "./pipeline-provider";
/**
 * The status of a Pipeline.
 */
export declare const pipelineStatus: {
    completed: string;
    canceled: string;
    rejected: string;
    running: string;
};
/**
 * A callback to indicate when pipeline processing should advance to the next step
 * or be aborted.
 */
export interface Next {
    /**
     * Indicates the successful completion of the pipeline step.
     */
    (): Promise<any>;
    /**
     * Indicates the successful completion of the entire pipeline.
     */
    complete(result?: any): Promise<any>;
    /**
     * Indicates that the pipeline should cancel processing.
     */
    cancel(result?: any): Promise<any>;
    /**
     * Indicates that pipeline processing has failed and should be stopped.
     */
    reject(result?: any): Promise<any>;
}
/**
 * A step to be run during processing of the pipeline.
 */
export interface PipelineStep {
    /**
     * Execute the pipeline step. The step should invoke next(), next.complete(),
     * next.cancel(), or next.reject() to allow the pipeline to continue.
     *
     * @param instruction The navigation instruction.
     * @param next The next step in the pipeline.
     */
    run(instruction: NavigationInstruction, next: Next): Promise<any>;
}
/**
 * The result of a pipeline run.
 */
export interface PipelineResult {
    status: string;
    instruction?: NavigationInstruction;
    output: any;
    completed: boolean;
}
/**
 * The class responsible for managing and processing the navigation pipeline.
 */
export declare class Pipeline {
    /**
     * The pipeline steps.
     */
    steps: ((instruction: NavigationInstruction, next: Next) => Promise<any>)[];
    /**
     * Adds a step to the pipeline.
     *
     * @param step The pipeline step.
     */
    addStep(step: PipelineStep | PipelineSlot): Pipeline;
    /**
     * Runs the pipeline.
     *
     * @param instruction The navigation instruction to process.
     */
    run(instruction: NavigationInstruction): Promise<PipelineResult>;
}
