const bodyParser = require("body-parser");

module.exports = () => (req, res, next) => {
    bodyParser.json()(req, res, () => {
        bodyParser.urlencoded({ extended: true })(req, res, next);
    });
}