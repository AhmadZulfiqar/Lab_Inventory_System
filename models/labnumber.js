const mongoose = require('mongoose');
const labnumber = new mongoose.Schema({
    LabName:{
        type:String,
    }
});
const Labname = mongoose.model('Labname', labnumber);
module.exports = Labname;