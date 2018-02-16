import { NavigationInstruction } from "./navigation-instruction";
import { Next } from "./pipeline";
export declare class CanDeactivatePreviousStep {
    run(navigationInstruction: NavigationInstruction, next: Next): Promise<any>;
}
export declare class CanActivateNextStep {
    run(navigationInstruction: NavigationInstruction, next: Next): Promise<any>;
}
export declare class DeactivatePreviousStep {
    run(navigationInstruction: NavigationInstruction, next: Next): Promise<any>;
}
export declare class ActivateNextStep {
    run(navigationInstruction: NavigationInstruction, next: Next): Promise<any>;
}
/**
 * A basic interface for an Observable type
 */
export interface IObservable {
    subscribe(next: {
        next(): void;
        error(error: any): void;
        complete(): void;
    }): ISubscription;
}
/**
 * A basic interface for a Subscription to an Observable
 */
export interface ISubscription {
    unsubscribe(): void;
}
