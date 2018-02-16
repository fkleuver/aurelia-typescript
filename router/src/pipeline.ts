import { NavigationInstruction } from "./navigation-instruction";
import { PipelineSlot } from "./pipeline-provider";

/**
 * The status of a Pipeline.
 */
export const pipelineStatus = {
  completed: "completed",
  canceled: "canceled",
  rejected: "rejected",
  running: "running"
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
export class Pipeline {
  /**
   * The pipeline steps.
   */
  public steps: ((instruction: NavigationInstruction, next: Next) => Promise<any>)[] = [];

  /**
   * Adds a step to the pipeline.
   *
   * @param step The pipeline step.
   */
  public addStep(step: PipelineStep | PipelineSlot): Pipeline {
    let run: (instruction: NavigationInstruction, next: Next) => Promise<any>;

    if (typeof step === "function") {
      run = step;
    } else if (typeof (step as PipelineSlot).getSteps === "function") {
      (step as PipelineSlot).getSteps().forEach((s: PipelineStep) => this.addStep(s));

      return this;
    } else {
      run = (step as PipelineStep).run.bind(step);
    }

    this.steps.push(run);

    return this;
  }

  /**
   * Runs the pipeline.
   *
   * @param instruction The navigation instruction to process.
   */
  public run(instruction: NavigationInstruction): Promise<PipelineResult> {
    let index = -1;
    const steps = this.steps;

    const next: Next = ((): Promise<PipelineResult> => {
      index++;

      if (index < steps.length) {
        const currentStep = steps[index];

        try {
          return currentStep(instruction, next);
        } catch (e) {
          return next.reject(e);
        }
      } else {
        return next.complete();
      }
    }) as any;

    next.complete = createCompletionHandler(next, pipelineStatus.completed);
    next.cancel = createCompletionHandler(next, pipelineStatus.canceled);
    next.reject = createCompletionHandler(next, pipelineStatus.rejected);

    return next();
  }
}

type completionHandler = (output: PipelineResult) => Promise<PipelineResult>;

// tslint:disable-next-line:variable-name
function createCompletionHandler(_next: Next, status: string): completionHandler {
  // tslint:disable-next-line:typedef
  return output => {
    return Promise.resolve({ status, output, completed: status === pipelineStatus.completed });
  };
}
