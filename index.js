// https://discordapp.com/oauth2/authorize?&client_id=222461168319594498&scope=bot&permissions=0
var Discord = require('discord.io');
var polo = require("poloniex-unofficial");
var request = require('request');
var fs = require('fs');
var util = require('util');

var data = require("./config.json");

trollboxChannel = data.trollboxchannel;
botToken = data.botToken;
// Discord channel id for the trollbox channel probably shouldnt be hardcoded

var poloPublic = new polo.PublicWrapper();
var poloPush = new polo.PushWrapper();
var bot = new Discord.Client({
  token: botToken,
  autorun: true
});

bot.on('ready', function() {
  console.log(bot.username + " - (" + bot.id + ")");
});

bot.on('disconnect', function(errMsg, code){
  console.log('---Bot disconnected with code ',code,' for reason ', errMsg,'---');
  bot.connect();
});

bot.on('message', function(user, userID, channelID, message, event){
  command = message.toLowerCase().split(' ');
  // Just for debugging - prints peoples messages
  //if (user!='CryptoBot'){
  //  console.log(user + " : " + userID + " : " + channelID + " : " + message);
  //}
  if (command[0] == "help" && command.length == 1){
    bot.sendMessage({
      to: channelID,
      message: "These are the commands this bot supports:\nCommand\t\tDescription\nPing\t\tPong"
        +"\nCurrencies\t\tReturns list of currencies on Poloniex\nPrice\t\tGets the current price of the currencies provided"
        +"\nVolume\t\tGets the 24 hour volume of the currencies provided\nCap/Marketcap\t\tGets the current marketcap and rank of the cryptocurrency"
        +"\nConvert\t\tConverts the currency amount to dollars eg: convert 100 xmr / convert xmr 100"
        +"\nPepe\t\tOnly the rarest, images can be added with pepe add http://link.com/img.jpg"
    });
  }
  if (command[0] == "ping" && command.length == 1){
    bot.sendMessage({
      to: channelID,
      message: "pong"
    });
  }
  if(command[0]=="troll" && command[0]=="trollbox"){
    if(command[1]=="list"){
      var message = "Trolls: " + data.polotrolls.join(',') + "\n" + "Following: " + data.polofollow.join(',');
      bot.sendMessage({
        to: channelID,
        message: message
      });
    }
    if(command[1]=="follow"){
      if(command[2] != null){
        data.polofollow.push(command[2]);
      }
    }
    if(command[1]=="add"){
      if(command[2] != null){
        data.polotrolls.push(command[2]);
      }
    }
    if(command[1]=="remove" || command[1]=="delete"){
      if(command[2] != null){
        if(data.polotrolls.indexOf(command[2])>-1){
          data.polotrolls.splice(data.polotrolls.indexOf(command[2]),1);
        }
        if(data.polofollow.indexOf(command[2])>-1){
          data.polofollow.splice(data.polofollow.indexOf(command[2]),1);
        }
      }
    }
  }
  if (command[0] == "rip" && command[1] == "bot"){
    bot.sendMessage({
      to: channelID,
      message: "I'm right here?"
    });
  }
  if (command[0] == "pepe"){
    if (command[1] == "add"){
        if(command[2] != null){
          download(command[2],'pepes');
        }
    }
    else if(command[1] == "list"){
      var pepes = fs.readdirSync('pepes');
      bot.sendMessage({
        to: channelID,
        message: "Pepes: "+pepes.toString()
      });
    }
    else if (command[1] == "delete" || command[1] == "remove"){
      if (command[2] != null){
        path = 'pepes/' + command[2].replace(/\.\.\//g,'');
        if (fs.existsSync(path)){
          fs.unlinkSync(path);
          bot.sendMessage({
            to: channelID,
            message: "Bad meme "+ path + " successfully deleted"
          });
        } else {
          bot.sendMessage({
            to: channelID,
            message: "File " + path + " does not exist? Try 'pepe list' to find the filename"
          });
        }
      }
    }
    else{
      var pepes = fs.readdirSync('pepes');
      var pepefile = 'pepes/'+pepes[Math.floor(Math.random() * pepes.length)];
      bot.uploadFile({
        to: channelID,
        file: pepefile
      });
    }
  }
  if (command[0] == "currencies" && command.length == 1){
    poloCurrencies(channelID);
  }
  if (command[0] == "price"){
    tickers = command.slice(1,command.length);
    poloPrice(channelID,tickers);
  }
  if (command[0] == "volume"){
    tickers = command.slice(1,command.length);
    poloVolume(channelID,tickers);
  }
  if (command[0] == "cap" || command[0] == "marketcap" ){
    tickers = command.slice(1,command.length);
    marketCap(channelID,tickers);
  }
  if(command[0] == "convert" && command.length == 3){
    if(isNaN(command[1])){
      currency = command[1];
      amount = command[2];
    } else {
      currency = command[2];
      amount = command[1];
    }
    ticker = 'BTC_' + currency.toUpperCase();
    poloPublic.returnTicker((err, response) => {
      if (err) {
        console.log("An error occurred: " + err.msg);
      } else {
        btc_value = response['USDT_BTC'].last;
        if (currency == 'btc'){
          bot.sendMessage({
            to: channelID,
            message: amount + ' BTC is worth $' + amount*btc_value
          })
        }
        if(response[ticker]){
          bot.sendMessage({
            to: channelID,
            message: amount + ' ' + currency + ' is worth $' + amount*response[ticker].last*btc_value
          });
        }
      }
    });
  }
});

function updateJSON(dataobj){
  fs.writeFileSync('./config.json',util.inspect(dataobj), 'utf-8');
  data = require("./config.json");
}

function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

function download(uri,folder){
  filename = folder+'/'+uri.split(/[//]+/).pop();
  console.log(filename);
  try{
    var options = {
      uri:uri,
      headers:{
        'User-Agent':'Mozilla/5.0 (Linux; Android 4.1.2; GT-I9100 Build/JZO54K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.117 Mobile Safari/537.36'
      }
    };
    request.head(options, function(err, res, body){
      console.log('content-type:', res.headers['content-type']);
      console.log('content-length:', res.headers['content-length']);
      request(uri).pipe(fs.createWriteStream(filename));
    });
  } catch(exception){
    console.log(exception);
  }
}

function marketCap(channelID, tickers){
  var cmc_url = 'https://api.coinmarketcap.com/v1/ticker/';
  // https://api.coinmarketcap.com/v1/ticker/
  request({
    url: cmc_url,
    json: true
  }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        //var cmc_object = JSON.parse(body);
        var cmc_object = body;
        console.log(cmc_object[0]);
        message = '';
        for (var key in cmc_object){
          if(tickers.indexOf(cmc_object[key].symbol.toLowerCase())>-1){
            var cap = numberWithCommas(cmc_object[key].market_cap_usd);
            message+=cmc_object[key].symbol+'\t$'+cap+'\tRank: #'+cmc_object[key].rank+'\n';
          }
        }
        console.log('Message: ' + message);
        bot.sendMessage({
          to: channelID,
          message: message
        });
      }
    });
}

function poloVolume(channelID, tickers){
  var newtickers = [];
  for (var ticker in tickers){
    if(tickers[ticker]=='btc'){
      newtickers.push("USDT_BTC");
    }
    else{
      newtickers.push("BTC_" + tickers[ticker].toUpperCase());
    }
  }
  tickers = newtickers;
  poloPublic.returnTicker((err, response) => {
    if (err) {
        console.log("An error occurred: " + err.msg);
    } else {
        //return response;
        //console.log(response);
        message = '';
        for (var key in response){
          if(tickers.indexOf(key)>-1){
            console.log(key);
            message += key.replace(/^[A-Za-z]*_/,'') + '\t' + response[key].baseVolume + '\n';
          }
        }
        console.log(message);
        bot.sendMessage({
          to: channelID,
          message: message
        });
    }
  });
}

function poloPrice(channelID,tickers){
  var newtickers = [];
  for (var ticker in tickers){
    if(tickers[ticker]=='btc'){
      newtickers.push("USDT_BTC");
    }
    else{
      newtickers.push("BTC_" + tickers[ticker].toUpperCase());
    }
  }
  tickers = newtickers;
  poloPublic.returnTicker((err, response) => {
    if (err) {
        console.log("An error occurred: " + err.msg);
    } else {
        //return response;
        //console.log(response);
        console.log(tickers);
        message = '';
        btc_value = response['USDT_BTC'].last;
        for (var key in response){
          if(tickers.indexOf(key)>-1){
            ticker_btc_value = response[key].last;
            if(key=='USDT_BTC'){
              ticker_btc_value = 1;
            }
            message += key.replace(/^[A-Za-z]*_/,'') + '\t' + ticker_btc_value + ' (' + (response[key].percentChange*100).toFixed(2) + '%)\t$' + (ticker_btc_value*btc_value).toFixed(8) + '\n';
          }
        }
        console.log(message);
        bot.sendMessage({
          to: channelID,
          message: message
        });
    }
  });
}

function poloCurrencies(channelID){
  poloPublic.returnCurrencies((err, response) => {
    if (err) {
        console.log("An error occurred: " + err.msg);
    } else {
        //return response;
        //console.log(response);
        message = '';
        for (var key in response){
          if(message==''){
            message = "Poloniex's current currencies: "+key;
          }
          else{
            message += ', ' + key;
          }
        }
        console.log(message);
        bot.sendMessage({
          to: channelID,
          message: message
        });
    }
  });
}

poloPush.trollbox((err, response) => {
    if (err) {
        // Log error message
        console.log("An error occurred: " + err.msg);
        // Disconnect
        return true;
    }
    // Log chat message as "[rep] username: message"
    //console.log("    [" + response.reputation + "] " + response.username + ": " + response.message);
    if(trollboxFilter(response.message)){
      if(data.polotrolls.indexOf(response.username.toLowerCase())>-1) {
        message = "```css\n" + response.username + ": " + decodeHTML(response.message) + "\n```";
      } else if(data.polofollow.indexOf(response.username.toLowerCase())>-1) {
        message = "```xl\n" + response.username + ": " + decodeHTML(response.message) + "\n```";
      } else {
        message = "__**" + response.username + "**__: " + decodeHTML(response.message);
      }
      bot.sendMessage({
        to : trollboxChannel,
        message : message
      }, function(err,res){
        if(res){
          if(res.content!=null){
            if(res.content.indexOf("```xl")>-1){
              bot.pinMessage({
                channelID: res.channel_id,
                messageID: res.id
              });
            }
          }
        }
      });
    }
});

function trollboxFilter(message){
  //returns true if the message is signal, false if its noise
  if(message.substring(0,7)=='PRO TIP:' || message.substring(0,8)=='POLO TIP:'){
    //Poloniex's Tips
    return false;
  }
  if(message.indexOf("http") !== -1){
    //Links, we want those
    return true;
  }
  if(message.length<10){
    //Messages this short are likely to be noise
    return false;
  }
  return true;
}

function decodeHTML(message){
  return message
    .replace(/&amp;/,"&")
    .replace(/&lt;/,"<")
    .replace(/&gt;/,">")
    .replace(/&quot;/,"\"")
    .replace(/&#39;/,"'")
    .replace(/&#40;/,"(")
    .replace(/&#64;/,"@")
    .replace(/&#41;/,")");
}
