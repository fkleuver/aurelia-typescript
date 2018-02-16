import { Container } from "aurelia-dependency-injection";
import { ActivateNextStep, CanActivateNextStep, CanDeactivatePreviousStep, DeactivatePreviousStep } from "./activation";
import { CommitChangesStep } from "./navigation-instruction";
import { BuildNavigationPlanStep } from "./navigation-plan";
import { Pipeline, PipelineStep } from "./pipeline";
import { LoadRouteStep } from "./route-loading";

export class PipelineSlot {
  public steps: (Function | PipelineStep)[] = [];
  public container: Container;
  public slotName: string;
  public slotAlias?: string;

  constructor(container: Container, name: string, alias?: string) {
    this.container = container;
    this.slotName = name;
    this.slotAlias = alias;
  }

  public getSteps(): PipelineStep[] {
    return this.steps.map((x: PipelineStep) => this.container.get(x));
  }
}

/**
 * Class responsible for creating the navigation pipeline.
 */
export class PipelineProvider {
  public static get inject(): Function[] {
    return [Container];
  }

  public container: Container;
  public steps: (PipelineStep | PipelineSlot | Function)[];

  constructor(container: Container) {
    this.container = container;
    this.steps = [
      BuildNavigationPlanStep,
      CanDeactivatePreviousStep, //optional
      LoadRouteStep,
      this._createPipelineSlot("authorize"),
      CanActivateNextStep, //optional
      this._createPipelineSlot("preActivate", "modelbind"),
      //NOTE: app state changes start below - point of no return
      DeactivatePreviousStep, //optional
      ActivateNextStep, //optional
      this._createPipelineSlot("preRender", "precommit"),
      CommitChangesStep,
      this._createPipelineSlot("postRender", "postcomplete")
    ];
  }

  /**
   * Create the navigation pipeline.
   */
  public createPipeline(): Pipeline {
    const pipeline = new Pipeline();
    this.steps.forEach((step: PipelineStep) => pipeline.addStep(this.container.get(step)));

    return pipeline;
  }

  /**
   * Adds a step into the pipeline at a known slot location.
   */
  public addStep(name: string, step: PipelineStep): void {
    const found = this._findStep(name);
    if (found) {
      if (!found.steps.includes(step)) {
        // prevent duplicates
        found.steps.push(step);
      }
    } else {
      throw new Error(`Invalid pipeline slot name: ${name}.`);
    }
  }

  /**
   * Removes a step from a slot in the pipeline
   */
  public removeStep(name: string, step: PipelineStep): void {
    const slot = this._findStep(name);
    if (slot) {
      slot.steps.splice(slot.steps.indexOf(step), 1);
    }
  }

  /**
   * Clears all steps from a slot in the pipeline
   */
  // tslint:disable-next-line:function-name
  public _clearSteps(name: string = ""): void {
    const slot = this._findStep(name);
    if (slot) {
      slot.steps = [];
    }
  }

  /**
   * Resets all pipeline slots
   */
  // tslint:disable-next-line:typedef
  public reset() {
    this._clearSteps("authorize");
    this._clearSteps("preActivate");
    this._clearSteps("preRender");
    this._clearSteps("postRender");
  }

  // tslint:disable-next-line:function-name
  private _createPipelineSlot(name: string, alias?: string): PipelineSlot {
    return new PipelineSlot(this.container, name, alias);
  }

  // tslint:disable-next-line:function-name
  private _findStep(name: string): PipelineSlot {
    return (this.steps as any as PipelineSlot[]).find((x: PipelineSlot) => x.slotName === name || x.slotAlias === name) as PipelineSlot;
  }
}
