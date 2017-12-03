import { Controller } from 'BotKit';

export interface Skill {
    
    /**
     * Listens to the messages from a Bot Controller.
     */
    hears(controller: Controller<any, any, any>): void;
}