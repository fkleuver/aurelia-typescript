import { RouteConfig } from "./interfaces";
import { Next, PipelineResult } from "./pipeline";
import { Router } from "./router";
export interface NavigationInstructionInit {
    fragment: string;
    queryString: string;
    params: Object;
    queryParams: Object;
    config: RouteConfig;
    parentInstruction: NavigationInstruction;
    previousInstruction: NavigationInstruction;
    router: Router;
    options: Object;
}
export declare class CommitChangesStep {
    run(navigationInstruction: NavigationInstruction, next: Next): Promise<any>;
}
/**
 * Class used to represent an instruction during a navigation.
 */
export declare class NavigationInstruction {
    /**
     * The URL fragment.
     */
    fragment: string;
    /**
     * The query string.
     */
    queryString: string;
    /**
     * Parameters extracted from the route pattern.
     */
    params: any;
    /**
     * Parameters extracted from the query string.
     */
    queryParams: any;
    /**
     * The route config for the route matching this instruction.
     */
    config: RouteConfig;
    /**
     * The parent instruction, if this instruction was created by a child router.
     */
    parentInstruction: NavigationInstruction;
    /**
     * The instruction being replaced by this instruction in the current router.
     */
    previousInstruction: NavigationInstruction;
    /**
     * viewPort instructions to used activation.
     */
    viewPortInstructions: any;
    /**
     * The router instance.
     */
    router: Router;
    plan: Object;
    options: Object;
    resolve: (value?: PipelineResult) => void;
    lifecycleArgs: any[];
    constructor(init: NavigationInstructionInit);
    /**
     * Gets an array containing this instruction and all child instructions for the current navigation.
     */
    getAllInstructions(): NavigationInstruction[];
    /**
     * Gets an array containing the instruction and all child instructions for the previous navigation.
     * Previous instructions are no longer available after navigation completes.
     */
    getAllPreviousInstructions(): NavigationInstruction[];
    /**
     * Adds a viewPort instruction.
     */
    addViewPortInstruction(viewPortName: string, strategy: string, moduleId: string, component: any): any;
    /**
     * Gets the name of the route pattern's wildcard parameter, if applicable.
     */
    getWildCardName(): string;
    /**
     * Gets the path and query string created by filling the route
     * pattern's wildcard parameter with the matching param.
     */
    getWildcardPath(): string;
    /**
     * Gets the instruction's base URL, accounting for wildcard route parameters.
     */
    getBaseUrl(): string;
    _commitChanges(waitToSwap: boolean): Promise<void>;
    _updateTitle(): void;
    _buildTitle(separator?: string): string;
}
