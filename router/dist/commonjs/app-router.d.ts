import { Container } from "aurelia-dependency-injection";
import { EventAggregator } from "aurelia-event-aggregator";
import { History } from "aurelia-history";
import { ViewPort } from "./interfaces";
import { NavigationInstruction } from "./navigation-instruction";
import { PipelineResult } from "./pipeline";
import { PipelineProvider } from "./pipeline-provider";
import { Router } from "./router";
/**
 * The main application router.
 */
export declare class AppRouter extends Router {
    pipelineProvider: PipelineProvider;
    events: EventAggregator;
    maxInstructionCount: number;
    isActive: boolean;
    static readonly inject: Function[];
    private _queue;
    constructor(container: Container, history: History, pipelineProvider: PipelineProvider, events: EventAggregator);
    /**
     * Fully resets the router's internal state. Primarily used internally by the framework when multiple calls to setRoot are made.
     * Use with caution (actually, avoid using this). Do not use this to simply change your navigation model.
     */
    reset(): void;
    /**
     * Loads the specified URL.
     *
     * @param url The URL fragment to load.
     */
    loadUrl(url: string): Promise<PipelineResult | void>;
    /**
     * Registers a viewPort to be used as a rendering target for activated routes.
     *
     * @param viewPort The viewPort.
     * @param name The name of the viewPort. 'default' if unspecified.
     */
    registerViewPort(viewPort: ViewPort, name: string): Promise<void>;
    /**
     * Activates the router. This instructs the router to begin listening for history changes and processing instructions.
     *
     * @params options The set of options to activate the router with.
     */
    activate(options?: Object): void;
    /**
     * Deactivates the router.
     */
    deactivate(): void;
    _queueInstruction(instruction: NavigationInstruction): Promise<PipelineResult>;
    _dequeueInstruction(instructionCount?: number): Promise<any>;
    private _findViewModel(viewPort);
}
