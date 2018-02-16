// tslint:disable:max-classes-per-file
import { isNavigationCommand, NavigationCommand } from "./navigation-commands";
import { NavigationInstruction } from "./navigation-instruction";
import { activationStrategy } from "./navigation-plan";
import { Next } from "./pipeline";
import { Router } from "./router";

export class CanDeactivatePreviousStep {
  public run(navigationInstruction: NavigationInstruction, next: Next): Promise<any> {
    return processDeactivatable(navigationInstruction, "canDeactivate", next);
  }
}

export class CanActivateNextStep {
  public run(navigationInstruction: NavigationInstruction, next: Next): Promise<any> {
    return processActivatable(navigationInstruction, "canActivate", next);
  }
}

export class DeactivatePreviousStep {
  public run(navigationInstruction: NavigationInstruction, next: Next): Promise<any> {
    return processDeactivatable(navigationInstruction, "deactivate", next, true);
  }
}

export class ActivateNextStep {
  public run(navigationInstruction: NavigationInstruction, next: Next): Promise<any> {
    return processActivatable(navigationInstruction, "activate", next, true);
  }
}

function processDeactivatable(
  navigationInstruction: NavigationInstruction,
  callbackName: string,
  next: Next,
  ignoreResult?: boolean
): Promise<any> {
  const plan = navigationInstruction.plan;
  const infos = findDeactivatable(plan, callbackName);
  let i = infos.length; //query from inside out

  function inspect(val: any): Promise<any> {
    if (ignoreResult || shouldContinue(val)) {
      return iterate();
    }

    return next.cancel(val);
  }

  function iterate(): Promise<any> {
    if (i--) {
      try {
        const viewModel = infos[i] as any;
        const result = viewModel[callbackName](navigationInstruction);

        return processPotential(result, inspect, next.cancel) as any;
      } catch (error) {
        return next.cancel(error);
      }
    }

    return next();
  }

  return iterate();
}

function findDeactivatable(plan: any, callbackName: string, list: Object[] = []): Object[] {
  for (const viewPortName of Object.keys(plan)) {
    const viewPortPlan = plan[viewPortName];
    const prevComponent = viewPortPlan.prevComponent;

    if (
      (viewPortPlan.strategy === activationStrategy.invokeLifecycle ||
        viewPortPlan.strategy === activationStrategy.replace) &&
      prevComponent
    ) {
      const viewModel = prevComponent.viewModel;

      if (callbackName in viewModel) {
        list.push(viewModel);
      }
    }

    if (viewPortPlan.strategy === activationStrategy.replace && prevComponent) {
      addPreviousDeactivatable(prevComponent, callbackName, list);
    } else if (viewPortPlan.childNavigationInstruction) {
      findDeactivatable(viewPortPlan.childNavigationInstruction.plan, callbackName, list);
    }
  }

  return list;
}

function addPreviousDeactivatable(component: any, callbackName: string, list: any[]): void {
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

function processActivatable(
  navigationInstruction: NavigationInstruction,
  callbackName: any,
  next: Next,
  ignoreResult?: boolean
): Promise<any> {
  const infos = findActivatable(navigationInstruction, callbackName);
  const length = infos.length;
  let i = -1; //query from top down

  function inspect(val: any, router: Router): Promise<any> {
    if (ignoreResult || shouldContinue(val, router)) {
      return iterate();
    }

    return next.cancel(val);
  }

  function iterate(): Promise<any> {
    i++;

    if (i < length) {
      try {
        const current = infos[i] as any;
        const result = current.viewModel[callbackName](...current.lifecycleArgs);

        return processPotential(result, (val: any) => inspect(val, current.router), next.cancel) as any;
      } catch (error) {
        return next.cancel(error);
      }
    }

    return next();
  }

  return iterate();
}

function findActivatable(
  navigationInstruction: NavigationInstruction,
  callbackName: string,
  list: Object[] = [],
  router?: Router
): Object[] {
  const plan = navigationInstruction.plan as any;

  Object.keys(plan).filter((viewPortName: string) => {
    const viewPortPlan = plan[viewPortName];
    const viewPortInstruction = navigationInstruction.viewPortInstructions[viewPortName];
    const viewModel = viewPortInstruction.component.viewModel;

    if (
      (viewPortPlan.strategy === activationStrategy.invokeLifecycle ||
        viewPortPlan.strategy === activationStrategy.replace) &&
      callbackName in viewModel
    ) {
      list.push({
        viewModel,
        lifecycleArgs: viewPortInstruction.lifecycleArgs,
        router
      });
    }

    if (viewPortPlan.childNavigationInstruction) {
      findActivatable(
        viewPortPlan.childNavigationInstruction,
        callbackName,
        list,
        viewPortInstruction.component.childRouter || router
      );
    }
  });

  return list;
}

function shouldContinue(output: Error | NavigationCommand, router?: Router): boolean {
  if (output instanceof Error) {
    return false;
  }

  if (isNavigationCommand(output)) {
    if (typeof (output as any).setRouter === "function") {
      (output as any).setRouter(router);
    }

    return !!(output as any).shouldContinueProcessing;
  }

  if (output === undefined) {
    return true;
  }

  return output as any;
}

/**
 * A basic interface for an Observable type
 */
export interface IObservable {
  subscribe(next: { next(): void; error(error: any): void; complete(): void }): ISubscription;
}

/**
 * A basic interface for a Subscription to an Observable
 */
export interface ISubscription {
  unsubscribe(): void;
}

type SafeSubscriptionFunc = (sub: SafeSubscription) => ISubscription;

/**
 * wraps a subscription, allowing unsubscribe calls even if
 * the first value comes synchronously
 */
class SafeSubscription {
  // tslint:disable:variable-name
  public _subscribed: boolean;
  public _subscription: ISubscription;
  // tslint:enable:variable-name

  constructor(subscriptionFunc: SafeSubscriptionFunc) {
    this._subscribed = true;
    this._subscription = subscriptionFunc(this);

    if (!this._subscribed) {
      this.unsubscribe();
    }
  }

  public get subscribed(): boolean {
    return this._subscribed;
  }

  public unsubscribe(): void {
    if (this._subscribed && this._subscription) {
      this._subscription.unsubscribe();
    }

    this._subscribed = false;
  }
}

function processPotential(
  obj: Promise<any> | IObservable,
  resolve: (value: any) => Promise<any>,
  reject: (reason: any) => Promise<any>
): Promise<any> | SafeSubscription {
  if (obj && typeof (obj as Promise<any>).then === "function") {
    return Promise.resolve(obj)
      .then(resolve)
      .catch(reject);
  }

  if (obj && typeof (obj as IObservable).subscribe === "function") {
    const obs = obj as IObservable;

    return new SafeSubscription((sub: SafeSubscription): ISubscription =>
      obs.subscribe({
        next(): void {
          if (sub.subscribed) {
            sub.unsubscribe();
            resolve(obj);
          }
        },
        error(error: any): void {
          if (sub.subscribed) {
            sub.unsubscribe();
            reject(error);
          }
        },
        complete(): void {
          if (sub.subscribed) {
            sub.unsubscribe();
            resolve(obj);
          }
        }
      })
    );
  }

  try {
    return resolve(obj);
  } catch (error) {
    return reject(error);
  }
}
