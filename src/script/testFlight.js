var fs = require('fs')
const random = require('string-random');
var baseUrl = 'static/data/test/w2t5/flight/'
    // var json = createFirstFlight(25000);
    // fs.writeFile(baseUrl + 'flight' + 0 + '.json', JSON.stringify(json), (error) => {
    //     console.log("over")
    // })

// var start = new Date();
// start = parseInt(start.getTime() / 1000)
// var end = start + 60;
// var interval = setInterval(function() {
//     var curr = Date.now()
//     curr = parseInt(curr / 1000)
//     if (curr >= end) {
//         clearInterval(interval);
//     }
//     var files = fs.readdirSync(baseUrl);
//     var file = files[files.length - 1];
//     createNextFlight(file);
// }, 2000)

writeFileInfor()

function createFirstFlight(length) {
    var json = {
        "full_count": 7976,
        "version": 4,
        "stats": { "total": { "ads-b": 7064, "mlat": 112, "faa": 308, "flarm": 5, "estimated": 142, "satellite": 93 }, "visible": { "ads-b": 1, "mlat": 0, "faa": 0, "flarm": 0, "estimated": 0, "satellite": 0 } },
        "selected-aircraft": { "available-ems": { "AMCP": 1, "AFMS": 1, "OAT": 1, "IAS": 1, "TAS": 1, "MACH": 1, "AGPS": 1, "AGPSDIFF": 1 }, "ems": {} },
        "selected": { "24f53ed8": { "matched-filter": true } }
    }

    // "24f53ed8": ["78052F", 38.7296, 117.7043, 298, 8550, 278, "1253", "T-F6M", "B738", "B-5435", 1594951682, "DLC", "TSN", "MF8847", 0, -1024, "CXA8847", 0, "CXA"],
    var codes = creatCode(length);
    var positions = createPosition(length);
    var lats = positions.lats;
    var alts = positions.alts;
    var lngs = positions.lngs;
    var headings = positions.headings;
    for (let i = 0; i < length; i++) {
        json[codes[i]] = [codes[i], lats[i], lngs[i], headings[i], alts[i]]
    }
    return json;
}

function creatCode(length) {
    var codes = []
    while (codes.length < length) {
        codes.push(random(8, { letters: 'ABCDEF' }))
        codes = Array.from(new Set(codes));
    }
    return codes;
}

function createPosition(length) {
    var lats = []
    while (lats.length < length) {
        let number = random(6, { letters: false }) / 10000
        lats.push(number)
            // lats = Array.from(new Set(lats));
    }
    // lats.forEach(value => {
    //     lats.push(-value);
    // })
    var lngs = [];
    while (lngs.length < length) {
        let number = random(6, { letters: false }) / 10000
        lngs.push(number)
            //   lngs = Array.from(new Set(lngs));
    }
    // lngs.forEach(value => {
    //     lngs.push(-value);
    // })
    var alts = []
    while (alts.length < length) {
        let number = Number(Math.random() * 1000 + 1)
        alts.push(number)
            //   alts = Array.from(new Set(alts));
    }
    // alts.forEach(value => {
    //     alts.push(value);
    // })
    var headings = []
    while (headings.length < length) {
        let number = parseInt(Math.random() * 180 + 1)
        headings.push(number)
    }
    // headings.forEach(value => {
    //     headings.push(value);
    // })
    return { lats: lats, lngs: lngs, alts: alts, headings: headings };
}
var otherInfor = ["full_count", "version", "stats", "selected-aircraft", "selected"]

function createNextFlight(firstName) {
    fs.readFile(baseUrl + firstName, (error, json) => {
        json = JSON.parse(json);
        json = creatNextJson(json);
        var data = JSON.stringify(json)
        let fileName = baseUrl + 'flight' + directoryFils() + '.json'
        if (!fs.existsSync(fileName)) {
            fs.writeFile(fileName, data, (error) => {
                console.log(fileName + "  over")
            })
        } else {
            console.log(fileName + "  sky")
        }
    })
}

function creatNextJson(json) {
    for (let key in json) {
        if (!otherInfor.includes(key)) {
            let array = json[key];
            array[1] = array[1] + Math.random() * 10;
            array[2] = array[2] + Math.random() * 10;
            array[3] = array[3] + 0.01;
            array[4] = array[4] + 0.01;
            json[key] = array;
        }
    }
    return json;
}

function directoryFils() {
    var files = fs.readdirSync(baseUrl)
    return files.length;
}

function writeFileInfor() {
    var files = fs.readdirSync(baseUrl);
    fileName = 'static/data/test/w2t5/' + "flightInfor.json";
    var data = JSON.stringify({ "data": files })
    fs.writeFile(fileName, data, (err) => {
        if (err) throw err;
        console.log(fileName + '已被保存');
    });
}