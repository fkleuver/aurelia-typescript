import { ActivationStrategy } from "./interfaces";
import { Redirect } from "./navigation-commands";
import { NavigationInstruction } from "./navigation-instruction";
import { Next } from "./pipeline";
import { _resolveUrl } from "./util";

/**
 * The strategy to use when activating modules during navigation.
 */
export const activationStrategy: ActivationStrategy = {
  noChange: "no-change",
  invokeLifecycle: "invoke-lifecycle",
  replace: "replace"
};

export class BuildNavigationPlanStep {
  public async run(navigationInstruction: NavigationInstruction, next: Next): Promise<any> {
    try {
      const plan = await _buildNavigationPlan(navigationInstruction);
      navigationInstruction.plan = plan;

      return next();
    } catch (error) {
      return next.cancel(error);
    }
  }
}

// tslint:disable-next-line:function-name
export async function _buildNavigationPlan(
  instruction: NavigationInstruction,
  forceLifecycleMinimum?: boolean
): Promise<Object> {
  const config = instruction.config;

  if ("redirect" in config) {
    let redirectLocation = _resolveUrl(config.redirect as string, getInstructionBaseUrl(instruction));
    if (instruction.queryString) {
      redirectLocation += `?${instruction.queryString}`;
    }

    throw new Redirect(redirectLocation);
  }

  const prev = instruction.previousInstruction;
  const plan = {} as any;
  const defaults = instruction.router.viewPortDefaults;

  if (prev) {
    const newParams = hasDifferentParameterValues(prev, instruction);
    const pending = [];

    for (const viewPortName of Object.keys(prev.viewPortInstructions)) {
      const prevViewPortInstruction = prev.viewPortInstructions[viewPortName];
      let nextViewPortConfig =
        viewPortName in config.viewPorts ? config.viewPorts[viewPortName] : prevViewPortInstruction;
      if (nextViewPortConfig.moduleId === null && viewPortName in instruction.router.viewPortDefaults) {
        nextViewPortConfig = defaults[viewPortName];
      }

      const viewPortPlan: any = (plan[viewPortName] = {
        name: viewPortName,
        config: nextViewPortConfig,
        prevComponent: prevViewPortInstruction.component,
        prevModuleId: prevViewPortInstruction.moduleId
      });

      if (prevViewPortInstruction.moduleId !== nextViewPortConfig.moduleId) {
        viewPortPlan.strategy = activationStrategy.replace;
      } else if ("determineActivationStrategy" in prevViewPortInstruction.component.viewModel) {
        viewPortPlan.strategy = prevViewPortInstruction.component.viewModel.determineActivationStrategy(
          ...(instruction as any).lifecycleArgs
        );
      } else if (config.activationStrategy) {
        viewPortPlan.strategy = config.activationStrategy;
      } else if (newParams || forceLifecycleMinimum) {
        viewPortPlan.strategy = activationStrategy.invokeLifecycle;
      } else {
        viewPortPlan.strategy = activationStrategy.noChange;
      }

      if (viewPortPlan.strategy !== activationStrategy.replace && prevViewPortInstruction.childRouter) {
        const path = instruction.getWildcardPath();
        const childInstruction = await prevViewPortInstruction.childRouter._createNavigationInstruction(
          path,
          instruction
        );
        viewPortPlan.childNavigationInstruction = childInstruction;
        const childPlan = await _buildNavigationPlan(
          childInstruction,
          viewPortPlan.strategy === activationStrategy.invokeLifecycle
        );
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
}

function hasDifferentParameterValues(prev: NavigationInstruction, next: NavigationInstruction): boolean {
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

  if (!(next.options as any).compareQueryParams) {
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
function getInstructionBaseUrl(instruction: NavigationInstruction): string {
  const instructionBaseUrlParts = [];
  instruction = instruction.parentInstruction;

  while (instruction) {
    instructionBaseUrlParts.unshift(instruction.getBaseUrl());
    instruction = instruction.parentInstruction;
  }

  instructionBaseUrlParts.unshift("/");

  return instructionBaseUrlParts.join("");
}
// tslint:enable:no-parameter-reassignment
