var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

var processes = {};
var parser = function (butler, song, done) {
    if (processes[song.url]) {
        butler.notify('message', {message: song.url + " found on grooveshark"});
        var stm = processes[song.url];
        stm.on('exit', function () {
            song.url = "./cache/" + song.url + ".mp3";
            done(song);
        });
    } else {
        if(fs.existsSync("./cache/" + song.url + ".mp3")) {
            song.url = "./cache/" + song.url + ".mp3";
            return done(song);
        } else {
            return done(false);
        }
    }
};

var test = function (butler, song, done) {
    butler.notify('message', {message: "Searching on grooveshark..."});
    var songFile = path.join(__dirname, "song.txt");
    fs.writeFile(songFile, song.url);
    var stm = spawn("spotify-to-mp3", [songFile], {cwd: "./cache"});
    stm.stdout.on("data", function (data) {
        var line = data.toString();
        if (line.indexOf("Downloading") !== -1) {
            var m = line.match(/Downloading "(.*)"\n/);
            song.url = m[1];
            processes[song.url] = stm;
            done(true);
        } else if (line.indexOf("Track not found") !== -1) {
            return done(false);
        } else if (line.indexOf("Skipping") !== -1) {
            var m = line.match(/Skipping "(.*)".*\n/);
            song.url = m[1];
            done(true);
        }
    });
    stm.on('exit', function () {
        delete processes[song.url];
    });
}

module.exports = function (butler, done) {
    var stm = spawn("spotify-to-mp3", ["--version"]);
    stm.on('error', function () {
        butler.error("spotify-to-mp3 is not installed");
        return done(null);
    });
    stm.on('exit', function () {
        butler.parsers.push({
            order: 90,
            check: test.bind(null, butler),
            func: parser.bind(null, butler),
            type: "Grooveshark"});

        done({name: "Grooveshark"});
    });
}
