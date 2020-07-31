const fetch = require('node-fetch');
const fs = require('fs');
var fileName;
//爬取各个Id飞机飞行轨迹。适用单个查看
var otherInfor = ["full_count", "version", "stats", "selected-aircraft", "selected"]
var MAX_THREAD = 15;

async function fetchUrl(url, fileName) {
    if (MAX_THREAD < 0) {
        // console.log(MAX_THREAD)
        await sleep(Math.random() * 10000)
        return fetchUrl(url, fileName)

    }

    MAX_THREAD -= 1
    return fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json', // 通过头指定，获取的数据类型是JSON
        }
    }).then(res => {
        if (res.status !== 200) {
            throw new Error('连接错误');
        }
        return res.json();
    }).then(json => {
        data = JSON.stringify(json);
        fs.writeFile(fileName, data, (err) => {
            MAX_THREAD++
            if (err) throw new Error('保存错误');;
            console.log(fileName + '已被保存');
        });
    }).catch(error => {
        console.log("失败", error);
    })
}

async function sleep(time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

async function run() {
    var json = fs.readFileSync("./static/data/flight/flight_1595422355.json");
    json = JSON.parse(json);
    for (let key in json) {
        if (!otherInfor.includes(key)) {
            fileName = "trail_" + key + ".json";
            fileName = "./static/data/trail/" + fileName;
            if (!fs.existsSync(fileName)) {
                let aircraftId = key;
                let trailUrl = "https://data-live.flightradar24.com/clickhandler/?version=1.5&flight=" + aircraftId;
                fetchUrl(trailUrl, fileName, aircraftId);
            } else {
                console.log("skip " + key)
            }
        }
    }
}
run()