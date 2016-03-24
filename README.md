# twitter-bot


#### Languages | Technologies

<b>Node.js - PostgreSQL - Ajax - HTML5 - CSS3 </b>

<hr>

###### V 1.0

<p>
This app is powered by the <a href='https://github.com/ttezel/twit'>Twit</a> npm package. (Twitter's API package prebuilt for Node.js)
<br>
Twitter-Bot uses a simple algorithm to split all of the active accounts into groups.
</p>

### Group 1
<ul>
<li>Account 1</li>
<li>Account 3</li>
</ul>
### Group 2
<ul>
<li>Account 2</li>
<li>Account 4</li>
</ul>

<p>
In short, one account from each group will 'pair' with eachother and trade their 3 most recent favotires.

<b>This can be used as a marketplace for Retweet Trading.</b>
</p>

##### API Limits
<p>
Twitter doesn't play nice when you blast their API with a bunch of requests. To avoid this, each <a href='https://github.com/ttezel/twit'>Twit</a> object
<br> is held in a temporary variable only for the time needed to retweet while manipulating that specific account.
<br>
<br>
By doing this, the app is not using the same keys to make each request, this eliminates the API limiting issues presented by Twitter.
</p>
