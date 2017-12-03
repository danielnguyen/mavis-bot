import { Bot, Message } from 'BotKit';
import * as HTTP_STATUS from 'http-status-codes';
import { NLPMessage, Intent } from './index.d';
import { DialogFlow, DialogFlowResult } from './dialogflow-v1';
import { LUIS } from './luis';
import { Config } from '../../Config';
import * as request from 'request';
import { Promise } from 'bluebird';


export class BotkitNLP {

    constructor() {}

    /**
     * Preprocesses the message from Botkit and passes it to Luis for NLP.
     * 
     * @param bot The Botkit Bot.
     * @param message The received Botkit message.
     * @param next The next function which must be called to continue processing the middleware stack.
     */
    public async receive(bot: Bot<any, any>, message: NLPMessage, next: () => void) {
        if (message.text && !message.topIntent) {
            
            const luis = new LUIS(Config.LUIS_CONFIG);
            const dialogflow = new DialogFlow(Config.DIALOGFLOW_CONFIG);

            await Promise.all([luis.getTopIntent(message.text), dialogflow.getDialogFlowResult(message.text)]).then((data) => {
                
                const luisData = JSON.parse(data[0]);
                const dialogflowData = JSON.parse(data[1]);

                const luisTopIntent: Intent = luisData.topScoringIntent;
                const dialogflowResult: DialogFlowResult = dialogflowData.result;

                // Build Intents based on which has a higher confidence
                let intent: Intent = null
                if (luisTopIntent.score > dialogflowResult.score) {
                    intent = {
                        intent: luisTopIntent.intent,
                        score: luisTopIntent.score
                    };
                    message.topIntent = intent;
                    console.log('AUDIT: Using LUIS Intent:\n'+JSON.stringify(intent));
                } else if (luisTopIntent.score < dialogflowResult.score) {
                    intent = {
                        intent: dialogflowResult.action,
                        score: dialogflowResult.score
                    };
                    message.topIntent = intent;
                    // Add fulfillments as well:
                    message.fulfillment = dialogflowResult.fulfillment;
                    console.log('AUDIT: Using DialogFlow Intent:\n'+JSON.stringify(intent));
                }

                // Continue with next handler
                next();
            });
        }
        // Continue with next handler
        next();
    }

    /**
     * Listens to messages for supported NLP intents.
     * 
     * @param patterns A list of supported NLP intents.
     * @param message The message being heard.
     */
    public static hear(patterns: any, message: NLPMessage) {

        let input: string = "";

        // if intent doesn't exist, use message.text as input as it is
        // possible that LUIS NLP is disabled.
        if (message.topIntent && message.topIntent.intent) {
            input = message.topIntent.intent.trim()
            console.log('AUDIT: Intent present. Using intent ' + input + 'as input.');
        } else {
            input = message.text;
            console.log('AUDIT: Intent not present. Using message text ' + input + ' as input.');
        }

        let tests;
        if (Array.isArray(patterns)) {
            tests = patterns;
        } else {
            tests = [patterns];
        }
        for (let i = 0; i < tests.length; i++) {
            let test = null;
            try {
                test = new RegExp(tests[i], 'i');
            } catch (err) {
                console.error('Error in regular expression: ' + tests[i] + ': ' + err);
                return false;
            }
            if (!test) {
                return false;
            }

            console.log('AUDIT: Current test is ' + test);
            if (input !== "" && input.match(test)) {
                console.log('AUDIT: Match for input found: ' + test);
                return true;
            }
        }
        return false;
    }
}

export * from './index.d';