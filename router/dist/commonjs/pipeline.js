"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The status of a Pipeline.
 */
exports.pipelineStatus = {
    completed: "completed",
    canceled: "canceled",
    rejected: "rejected",
    running: "running"
};
/**
 * The class responsible for managing and processing the navigation pipeline.
 */
class Pipeline {
    constructor() {
        /**
         * The pipeline steps.
         */
        this.steps = [];
    }
    /**
     * Adds a step to the pipeline.
     *
     * @param step The pipeline step.
     */
    addStep(step) {
        let run;
        if (typeof step === "function") {
            run = step;
        }
        else if (typeof step.getSteps === "function") {
            step.getSteps().forEach((s) => this.addStep(s));
            return this;
        }
        else {
            run = step.run.bind(step);
        }
        this.steps.push(run);
        return this;
    }
    /**
     * Runs the pipeline.
     *
     * @param instruction The navigation instruction to process.
     */
    run(instruction) {
        let index = -1;
        const steps = this.steps;
        const next = (() => {
            index++;
            if (index < steps.length) {
                const currentStep = steps[index];
                try {
                    return currentStep(instruction, next);
                }
                catch (e) {
                    return next.reject(e);
                }
            }
            else {
                return next.complete();
            }
        });
        next.complete = createCompletionHandler(next, exports.pipelineStatus.completed);
        next.cancel = createCompletionHandler(next, exports.pipelineStatus.canceled);
        next.reject = createCompletionHandler(next, exports.pipelineStatus.rejected);
        return next();
    }
}
exports.Pipeline = Pipeline;
// tslint:disable-next-line:variable-name
function createCompletionHandler(_next, status) {
    // tslint:disable-next-line:typedef
    return output => {
        return Promise.resolve({ status, output, completed: status === exports.pipelineStatus.completed });
    };
}
//# sourceMappingURL=pipeline.js.map