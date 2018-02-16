import { ActivationStrategy } from "./interfaces";
import { NavigationInstruction } from "./navigation-instruction";
import { Next } from "./pipeline";
/**
 * The strategy to use when activating modules during navigation.
 */
export declare const activationStrategy: ActivationStrategy;
export declare class BuildNavigationPlanStep {
    run(navigationInstruction: NavigationInstruction, next: Next): Promise<any>;
}
export declare function _buildNavigationPlan(instruction: NavigationInstruction, forceLifecycleMinimum?: boolean): Promise<Object>;
