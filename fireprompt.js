const webhook = require("webhook-discord");
const Confirm = require('prompt-confirm');
const needle = require('needle');

const { twitter_token } = require('./resources/config.json');

const endpointUrl = "https://api.twitter.com/2/tweets/search/recent";

let selectedConfig;

function InterpretArguments() {

    if (process.argv.includes('test')) {

        console.log("Running the Test configuration.");
        selectedConfig = require('./resources/test_config.json');
        
    } else if (process.argv.includes('sfw')) {

        console.log("Running the SFW configuration.");
        selectedConfig = require('./resources/sfw_config.json');
        
    } else if (process.argv.includes('nsfw')) {

        console.log("Running the NSFW configuration.");
        selectedConfig = require('./resources/nsfw_config.json');
        
    } else {

        console.log("No configuration selected. Please include one of the following arguments when running the script: 'sfw', 'nsfw, 'test'.");
        process.exit(-1);

    }

}

// Post the webhook into the Discord channel. 
function Webhook(url, username, message) {

    const Hook = new webhook.Webhook(url);

    const msg = new webhook.MessageBuilder()
        .setName(username)
        .setText(message);

    Hook.send(msg);

}

// Find the required Tweet
async function GetTwitterRequest() {

    const params = {
        'query': selectedConfig.query
    }

    const res = await needle('get', endpointUrl, params, {
        headers: {
            "User-Agent": "v2RecentSearchJS",
            "authorization": `Bearer ${twitter_token}`
        }
    })

    if (res.body) {
        return res.body;
    } else {
        throw new Error('Unsuccessful request');
    }
}

async function PostPrompt() {

    try {

        // Are we running the SFW, NSFW, or Test configuration?
        InterpretArguments();

        const response = await GetTwitterRequest();

        let tweet_id = response.meta.newest_id;

        let loadedPrompt = response.data.find(element => element.id === tweet_id).text;

        // Remove the hashtags
        loadedPrompt = loadedPrompt.slice(0, loadedPrompt.indexOf('#') - 1);

        const correctPrompt = new Confirm('Is this prompt okay to post?\n' + loadedPrompt);

        correctPrompt.run().then(function (answer) {

            if (answer) {
          
                // Fill in the prompt and tweet ID in the Discord message
                let messageContent = selectedConfig.content.replace('\[prompt\]', loadedPrompt).replace('\[tweet_id\]', tweet_id);
                Webhook(selectedConfig.webhook_url, selectedConfig.username, messageContent);
          
            }
          
          });

    } catch (e) {
        console.log(e);
        process.exit(-1);
    }
    
}

PostPrompt();
