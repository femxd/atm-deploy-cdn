var path = require('path'),
    fs = require("fs"),
    Zip = require('node-zip'),
    request = require("request");

function zipFiles(modified) {
    var archive = new Zip();
    fis.log.info("zip files wait to upload to cdn...");
    modified.forEach(function(file) {
        if (file.isJsLike || file.isCssLike || file.isImage()) {
            var matched = fis.util.some(['/img', '/css', '/js'], function(item) {
                return ~file.subpath.indexOf(item);
            });
            if (matched) {
                archive.file(file.getHashRelease().substr(1), file.getContent());
            }
        }
    });
    var data = archive.generate({
        base64: false,
        compression: 'DEFLATE'
    });
    var zipPath = fis.project.getProjectPath() + "/" + Date.now() + '.zip';
    fs.writeFileSync(zipPath, data, 'binary');
    fis.log.info("success zip files: ", zipPath);

    return zipPath;
}

function uploadZipFile(zipPath, options, callback) {
    fis.log.info("prepare upload zip file: uploadUrl: ", options.uploadUrl, ", remoteDir: ", options.remoteDir);

    if (options.remoteDir.substr(-1) === '\/') {
        options.remoteDir = options.remoteDir;
    }

    request.post({
        url: options.uploadUrl,
        formData: {
            path: options.remoteDir,
            zip_file: fs.createReadStream(zipPath)
        }
    }, function(err, resp, body) {
        fis.util.del(zipPath);
        if (err) {
            fis.log.error("upload failed: ", err);
            return reject(err);
        } else {
            try {
                var json = JSON.parse(body);
                fis.log.info("upload to cdn success: \n ", Object.keys(json));
                callback(null, "OK");
            } catch (e) {
                fis.log.error("upload to cdn fail, resp body: " + body);
                callback(new Error("upload to cdn fail, resp body: " + body));
            }
        }
    });
}


module.exports = function(options, modified, total, next) {

    //fis.log.info("options: ", options);
    //fis.log.info("modified len: ", modified.length, ", total len: ", total.length);

    var zipPath = zipFiles(modified);
    uploadZipFile(zipPath, options, function(err, result) {
        next && next(err, result);
    });
};
