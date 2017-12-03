import * as Botkit from 'BotKit';
import { Config } from './config';
import { Bot, BotkitBot, BotFrameworkFactory } from './botcore';
import { BotkitLuis, BotkitLuisConfiguration } from './middleware/botkit-luis';
import { Server } from './server';
import { Test } from './skills';

export default class Mavis {

    public _bots: Bot[] = [];
    private _startTime: Date;

    constructor() {}
    
    public init() {
        // this.initAlexaBot();
        this.initBotFrameworkBot();
    }
    
    public info() {
        return {
            uptime: Date.now() - this._startTime.getTime(),
            // TODO(bajtos) move this code to Application, the URL should
            // be accessible via this.get('http.url')
            url: Config.APP_ENDPOINT
        };
    }

    public async start() {
        let webserver = new Server();
        
        this._startTime = new Date();
        
        const _bots = this._bots;
        await webserver.start((webserver: Server) => {
            this._bots.forEach(bot => {
                bot.createWebhookEndpoints(webserver);
            });
            console.log('** MAVIS is online!');
        });
    }

    private initBotFrameworkBot() {
        const bfFactory = new BotFrameworkFactory({
            debug: Config.__DEVELOPMENT__,
            hostname: Config.APP_HOST
            // log, logger
        })

        // create the bot
        const bfBot = bfFactory.createBot(Config.BOT_FRAMEWORK_CONFIG);
        
       // bfBot.addReceiveMiddleware(); // Need to hook up User identification for security.

        // Hook up NLP and update message with top intent.
        if (!Config.__DEVELOPMENT__) { // Only hook up with LUIS APIs to save on API hits.
            bfBot.addReceiveMiddleware(BotkitLuis.receive(Config.LUIS_CONFIG)); 
        }

        // Process message and select skill for top intent.
        // bfBot.addHeardMiddleware(BotkitLuis.hear);


        // bfBot.addCaptureMiddleware();
        // bfBot.addSendMiddleware();

        // Add skills to the bot
        const bfBotController = bfBot.getController();
        new Test().hears(bfBotController);


        // add to the bot list
        this._bots.push(bfBot);
    }
}