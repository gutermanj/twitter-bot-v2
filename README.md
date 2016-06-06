# TwitterBotV2

<h2>How to start</h2>

```
git clone https://github.com/gutermanj/twitter-bot-production

cd twitter-bot-production

npm install

npm start
```


#### Languages | Technologies

<b>Node.js - PostgreSQL - mongoDB - Ajax - HTML5 - CSS3 </b>

<hr>

###### V 2.0

<p>
This app is powered by the <a href='https://github.com/ttezel/twit'>Twit</a> npm package. (Twitter's API package prebuilt for Node.js)
<br><br>

<h2>Why The Twitter Bot Was Built</h2>

<p>Let's say we have 2 accounts: </p>
<b>Julian1402</b>
<p>Julian1402 has 346k followers on twitter, averaging about 250k impressions per tweet. He also sells really cool hats!</p>
<br>
<b>PotatoMaster</b>
<p>PotatoMaster has 140k followers on twitter, averaging about 75k impressions per tweet. PotatoMaster sells the best potatos on the market.</p>
<br>
<p>Julian1402 will message PotatoMaster on Twitter saying 'rts'. This means Julian1402 wants to retweet PotatoMaster's last 3 favorites on Twitter for 20 minutes, most likely his potato tweets.
<br><br>
If PotatoMaster wants to trade he will respond with 'D20' meaning in return he will retweet Julian1402's last 3 favorites for 20 minutes as well, most likely his awesome hats!
<br><br> Once PotatoMaster responds with 'D20' (Meaning he has retweeted Julian1402's products) Julian1402 will respond back with 'D20' when he retweets PotatoMaster's potatos.

<b>What's so hard about that and what can we use the twitter bot for?</b>
<br><br>
<b> The main problem is someone has to be active on these accounts watching for people sending 'rts', also someone has to manually retweet and unretweet the accounts products every 20 minutes. With large Twitter accounts, this can be an all day job and generally you have to hire someone to do this.</b>
<br><br>

<p>TwitterBovV2 automates this process. While an account is added to the bot, it will constantly pull new messages and filter them for these key words. i.e. 'rts', 'favs', 'D20', etc..

<br><br>

When there is a match in these words, the bot will figure out what to do with that account.
<h4>Example process: </h4>
<p> When We receive 'rts', the sender will be added to the main que of the receiving account. When they reach the top of the que, the bot will find the sender's last 3 favorites on Twitter and retweet them for 20 minutes. We will then message them with 'D20'. They are then added to the lmkwd (Let me know when done) list and will not be eligable to trade with again until they send 'D20' meaning they have completed the trade with us. </p>
</p>

<hr>


<b>When an account is added to the bot, it requires read and write access to Twitter through their API.</b>
<ul>
<li>CONSUMER KEY</li>
<li>CONSUMER SECRET</li>
<li>ACCESS TOKEN</li>
<li>ACCESS TOKEN SECRET</li>
</ul>
<small>*** Direct Messages Must Be Enabled ***</small>
<br>
<br>
Once the account is created, in mongoDB many 'lists' are created under ownership of that account:
<ul>
<li>Children -- <em>the main trading que</em></li>
<li>Lmkwd -- <em>Disables further trades from the sender unless we receive the message 'D20' from them</em></li>
<li>History <em> -- We've traded with this account in the past 24 hours and they have not expressed interest to trade again, we will message them at 5AM to trade again </em></li>
<li>Sent <em> -- We've sent them 'rts' at 5AM and are waiting to receive 'D20' back to add them to the main que</em></li>
<li>Outbound -- <em> We sent them rts and when we receive 'D20' they should not be added to the lmkwd list</em></li>
</ul>
<hr>
</p>

### Example

```json
{
	"_id" : "SkyVibeOverload",
	"children" : [
		"ExploringaWorld",
		"DiyNaiIs"
	],
	"history" : [
		"NetfIixIsBae",
		"ExploringaWorld",
		"MakeupTutoriaI",
		"DiyNaiIs"
	],
	"total_trades" : 23,
	"lmkwd" : [
		"PostLikeGirls",
		"CutestCIothes",
		"RelatabIeFemaIe"
	],
	"sent" : [ ],
	"outbound" : [ ]
}
```
<p>The '_id' is the account's username on Twitter, the following lists associated with the document are other accounts on twitter that 'SkyVibeOverload' has Interacted with</p>

##### API Limits
<p>
Twitter doesn't play nice when you blast their API with a bunch of requests. To avoid this, each <a href='https://github.com/ttezel/twit'>Twit</a> object
<br> is held in a temporary variable only for the time needed to retweet while manipulating that specific account.
<br>
<br>
By doing this, the app is not using the same keys to make each request, this eliminates the API limiting issues presented by Twitter.
</p>
