const fetch = require('node-fetch');
const fs = require('fs');

function testTrail() {
    var json = fs.readFileSync("static/data/trail/trail_24d8e074.json");
    json = JSON.parse(json);
    var trail = []
    for (i = 0; i < json.trail.length; i++) {
        let temp = json.trail[i]
        trail.push({ "lat": temp.lat, "lng": temp.lng, "alt": temp.alt, "ts": temp.ts })
    }

function statisticFile() {
    var path = "./static/data/trail/"
    return fs.readdirSync(path, function(err, files) {
        if (err) {
            return console.error(err);
        }
        //  console.log(files);
        return files;
    });
}
var x = statisticFile();
console.log(x);

function getAllAircraft() {
    var path = "Apps/Data/flight/";
    fs.readdirSync(path, function(error, files) {
        files.forEach(function(file) {
            console.log(file);
        });
    });
}