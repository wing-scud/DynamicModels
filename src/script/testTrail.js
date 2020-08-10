var fs = require('fs')
const random = require('string-random');
var baseUrl = "static/data/test/h1/trail/"
var otherInfor = ["full_count", "version", "stats", "selected-aircraft", "selected"];
runSimple();

async function run() {
    var json = fs.readFileSync("static/data/test/h1/flight/flight0.json");
    json = JSON.parse(json);
    var arrays = []
    for (let key in json) {
        if (!otherInfor.includes(key)) {
            arrays.push(key);
        }
    }
    var start = 0;
    var end = 1000;
    var interval = setInterval(function() {
        if (end >= arrays.length) {
            clearInterval(interval)
        }
        for (let i = start; i < end; i++) {
            var key = arrays[i];
            writeFiles(key)
        }
        start = end;
        end = end + 1000;
    }, 2000)
}

async function runSimple() {
    var json = fs.readFileSync("static/data/test/h1/flight/flight0.json");
    json = JSON.parse(json);
    for (let key in json) {
        if (!otherInfor.includes(key)) {
            writeFiles(key)
        }

    }
}

function writeFiles(key) {
    fileName = "trail_" + key + ".json";
    fileName = baseUrl + fileName;
    if (!fs.existsSync(fileName)) {
        let aircraftId = key;
        var json = createTrail();
        fs.writeFile(fileName, JSON.stringify(json), (error) => {
            if (error) {
                console.log(error);
            }
            console.log(aircraftId + "  over");
        })
    } else {
        console.log("skip " + key)
    }
}

function createTrail() {
    var json = {};
    var trails = [];
    var first = {
        "lat": random(6, { letters: false }) / 10000,
        "lng": random(6, { letters: false }) / 10000,
        "alt": Number(random(4, { letters: false })),
        "spd": Number(random(3, { letters: false })),
        "ts": parseInt(Date.now() / 1000),
        "hd": Number(random(2, { letters: false })),
    }
    trails.push(first);
    for (let i = 1; i < 60; i++) {
        var font = trails[i - 1]
        trails.push({
            "lat": font.lat + 0.1,
            "lng": font.lng + 0.1,
            "alt": font.alt + 0.01,
            "spd": font.spd + 0.01,
            "ts": font.ts - 25,
            "hd": font.hd + 1,
        })
    }
    json.trail = trails;
    return json;
}