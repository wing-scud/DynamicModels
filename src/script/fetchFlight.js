const fetch = require('node-fetch');
const fs = require('fs');
//爬取所有飞机的当前位置
var fileName;
var baseUrl = "https://data-live.flightradar24.com/zones/fcgi/feed.js?bounds=33.78,30.59,-97.75,-89.20&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1&vehicles=1&estimated=1&maxage=14400&gliders=1&stats=1&enc=_OZxX879vvr8ZNhxu1fzMyylYFhfWpBEh4fAOeKdSI0";
var start = new Date();
start = parseInt(start.getTime() / 1000);
var end = start + 100;
var now;
var basePath = "static/data/test/";
var interval = setInterval(function() {
    now = new Date();
    now = parseInt(now.getTime() / 1000)
    fetch(baseUrl)
        .then(res => res.json())
        .then((data) => {
            if (end - now <= 0) {
                writeFileInfor()
                clearInterval(interval);
            }
            var content = JSON.stringify(data);
            fileName = "flight_" + now + ".json";
            fileName = basePath + 'flight/' + fileName;
            if (!fs.existsSync(fileName)) {
                fs.writeFile(fileName, content, (err) => {
                    if (err) throw err;
                    console.log(fileName + '已被保存');
                });
            } else {
                console.log("skip " + fileName)
            }
        }).catch(error => console.log(error));
}, 1000)

function writeFileInfor() {
    var files = fs.readdirSync(basePath + "flight/");
    fileName = basePath + "flightInfor.json";
    var data = JSON.stringify({ "data": files })
    fs.writeFile(fileName, data, (err) => {
        if (err) throw err;
        console.log(fileName + '已被保存');
    });
}